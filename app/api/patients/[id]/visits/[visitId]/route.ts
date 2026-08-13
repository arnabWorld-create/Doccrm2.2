import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET - Fetch a single visit
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; visitId: string } }
) {
  const { error } = await requirePermission(req, 'visits', 'read');
  if (error) return error;

  try {
    const visit = await prisma.visit.findUnique({
      where: {
        id: params.visitId,
        patientId: params.id,
      },
      include: {
        medications: true,
        fees: true,
      },
    });

    if (!visit) {
      return NextResponse.json(
        { message: 'Visit not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(visit);
  } catch (error) {
    logger.error('Failed to fetch visit', error);
    return NextResponse.json({ message: 'Failed to fetch visit' }, { status: 500 });
  }
}

// PUT - Update a visit
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; visitId: string } }
) {
  const { error } = await requirePermission(req, 'visits', 'write');
  if (error) return error;

  try {
    const body = await req.json();

    const visit = await prisma.$transaction(async (tx) => {
      // Parse blood pressure if provided as string
      let bpSystolic = body.bpSystolic;
      let bpDiastolic = body.bpDiastolic;
      
      if (body.bloodPressure && !bpSystolic && !bpDiastolic) {
        const bpParts = body.bloodPressure.split('/');
        if (bpParts.length === 2) {
          bpSystolic = bpParts[0].trim();
          bpDiastolic = bpParts[1].trim();
        }
      }

      const updateData: any = {
        visitDate: new Date(body.visitDate),
        visitType: body.visitType,
        chiefComplaint: body.chiefComplaint || null,
        signs: body.signs || null,
        investigations: body.investigations || null,
        diagnosis: body.diagnosis || null,
        treatment: body.treatment || null,
        medicines: body.medicines || null,
        // Strip any legacy __FEES_JSON__ markers from notes before saving
        notes: body.notes
          ? body.notes.replace(/__FEES_JSON__[\s\S]*?__FEES_JSON__/g, '').trim() || null
          : null,
        temp: body.temp ? parseFloat(body.temp) : null,
        spo2: body.spo2 ? parseInt(body.spo2) : null,
        pulse: body.pulse ? parseInt(body.pulse) : null,
        bloodPressure: body.bloodPressure || null,
        bpSystolic: bpSystolic ? parseInt(bpSystolic) : null,
        bpDiastolic: bpDiastolic ? parseInt(bpDiastolic) : null,
        rbs: body.rbs ? parseInt(body.rbs) : null,
        followUpDate: body.followUpDate ? new Date(body.followUpDate) : null,
        followUpNotes: body.followUpNotes || null,
        reports: body.reports ? JSON.stringify(body.reports) : null,
        paidBy: body.paidBy || null,
      };

      // Update the visit
      const updatedVisit = await tx.visit.update({
        where: {
          id: params.visitId,
          patientId: params.id,
        },
        data: updateData,
      });

      // Delete existing medications
      await tx.medication.deleteMany({
        where: { visitId: params.visitId },
      });

      // Create new medications if provided
      if (body.medications && Array.isArray(body.medications)) {
        const medicationsToCreate = body.medications
          .filter((med: any) => med.name && med.name.trim())
          .map((med: any) => ({
            visitId: params.visitId,
            medicine: med.name.trim(),
            dose: med.dose || null,
            frequency: med.frequency || null,
            timing: med.timing || null,
            duration: med.duration || null,
            startFrom: med.startFrom || null,
            instructions: med.instructions || null,
          }));

        if (medicationsToCreate.length > 0) {
          await tx.medication.createMany({
            data: medicationsToCreate,
          });
        }
      }

      // Update VisitFees only when the client explicitly sends a visitFees array.
      // If visitFees is undefined (old clients / requests that don't touch fees),
      // leave the existing fee rows untouched — prevents accidental data loss.
      if (body.visitFees !== undefined) {
        await tx.visitFee.deleteMany({ where: { visitId: params.visitId } });
        if (Array.isArray(body.visitFees) && body.visitFees.length > 0) {
          await tx.visitFee.createMany({
            data: body.visitFees.map((fee: any) => ({
              visitId: params.visitId,
              serviceName: fee.serviceName || 'Service',
              amount: parseFloat(fee.amount) || 0,
              quantity: parseInt(fee.quantity) || 1,
              discount: parseFloat(fee.discount) || 0,
              total: parseFloat(fee.total) || 0,
            })),
          });
        }
      }

      // Return visit with medications and fees
      return tx.visit.findUnique({
        where: { id: params.visitId },
        include: { medications: true, fees: true },
      });
    });

    return NextResponse.json(visit);
  } catch (error) {
    logger.error('Failed to update visit', error);
    return NextResponse.json({ message: 'Failed to update visit' }, { status: 500 });
  }
}

// DELETE - Delete a visit
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; visitId: string } }
) {
  const { error } = await requirePermission(req, 'visits', 'delete');
  if (error) return error;

  try {
    await prisma.visit.delete({
      where: {
        id: params.visitId,
        patientId: params.id,
      },
    });

    return NextResponse.json({ message: 'Visit deleted successfully' });
  } catch (error) {
    logger.error('Failed to delete visit', error);
    return NextResponse.json({ message: 'Failed to delete visit' }, { status: 500 });
  }
}
