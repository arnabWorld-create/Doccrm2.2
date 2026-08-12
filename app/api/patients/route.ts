import { NextRequest } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { generatePatientId } from '@/lib/patientUtils';
import { requirePermission } from '@/lib/rbac';
import { withMiddleware, successResponse } from '@/lib/middleware';
import { ApiErrors } from '@/lib/api-error';
import { logger } from '@/lib/logger';
import { RATE_LIMITS } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

// Validation schema for creating patient
const createPatientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  age: z.union([z.number().int().min(0).max(150), z.string(), z.null()]).optional().nullable(),
  gender: z.union([z.enum(['Male', 'Female', 'Other']), z.string(), z.null()]).optional().nullable(),
  contact: z.union([z.string(), z.null()]).optional().nullable(),
  address: z.union([z.string(), z.null()]).optional().nullable(),
  bloodGroup: z.union([z.string(), z.null()]).optional().nullable(),
  allergies: z.union([z.string(), z.null()]).optional().nullable(),
  chronicConditions: z.union([z.string(), z.null()]).optional().nullable(),
  consultationDate: z.union([z.string(), z.null()]).optional(),
  followUpDate: z.union([z.string(), z.null()]).optional(),
  chiefComplaint: z.union([z.string(), z.null()]).optional(),
  signs: z.union([z.string(), z.null()]).optional(),
  investigations: z.union([z.string(), z.null()]).optional(),
  diagnosis: z.union([z.string(), z.null()]).optional(),
  treatment: z.union([z.string(), z.null()]).optional(),
  medicines: z.union([z.string(), z.null()]).optional(),
  history: z.union([z.string(), z.null()]).optional(),
  bloodPressure: z.union([z.string(), z.null()]).optional(),
  temp: z.union([z.string(), z.number(), z.null()]).optional(),
  spo2: z.union([z.string(), z.number(), z.null()]).optional(),
  pulse: z.union([z.string(), z.number(), z.null()]).optional(),
  weight: z.union([z.string(), z.number(), z.null()]).optional(),
  bpSystolic: z.union([z.string(), z.number(), z.null()]).optional(),
  bpDiastolic: z.union([z.string(), z.number(), z.null()]).optional(),
  rbs: z.union([z.string(), z.number(), z.null()]).optional(),
  reports: z.union([z.array(z.any()), z.null()]).optional(),
  referredTo: z.union([z.string(), z.null()]).optional(),
  followUpNotes: z.union([z.string(), z.null()]).optional(),
  medications: z.union([z.array(z.object({
    name: z.string(),
    dose: z.union([z.string(), z.null()]).optional(),
    frequency: z.union([z.string(), z.null()]).optional(),
    timing: z.union([z.string(), z.null()]).optional(),
    duration: z.union([z.string(), z.null()]).optional(),
    startFrom: z.union([z.string(), z.null()]).optional(),
    instructions: z.union([z.string(), z.null()]).optional(),
  })), z.null()]).optional(),
  visitFees: z.union([z.array(z.object({
    id: z.string(),
    serviceName: z.string(),
    amount: z.number(),
    quantity: z.number(),
    discount: z.number(),
    total: z.number(),
  })), z.null()]).optional(),
  totalFeeAmount: z.union([z.number(), z.null()]).optional(),
  paidBy: z.union([z.enum(['cash', 'upi', 'card']), z.null()]).optional(),
}).passthrough();

// GET all patients with pagination
export const GET = withMiddleware(
  async (request: NextRequest) => {
    const { error } = await requirePermission(request, 'patients', 'read');
    if (error) throw error;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { contact: { contains: search } },
        { patientId: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    // Batch queries for better performance
    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where: whereClause,
        select: {
          id: true,
          patientId: true,
          name: true,
          age: true,
          gender: true,
          contact: true,
          address: true,
          bloodGroup: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { visits: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.patient.count({ where: whereClause }),
    ]);

    logger.info('Fetched patients', {
      search,
      page,
      limit,
      total,
    });

    const response = successResponse(
      {
        data: patients,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
      200,
      request
    );
    // Cache patient list for 30s in the browser — stale-while-revalidate
    // means the browser shows cached data instantly and refreshes in background
    response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    return response;
  },
  {
    rateLimit: RATE_LIMITS.API,
  }
);

// POST - Create new patient with first visit
export const POST = withMiddleware(
  async (request: NextRequest, data) => {
    const { error } = await requirePermission(request, 'patients', 'write');
    if (error) throw error;

    // Separate patient info from visit info
    const { name, age, gender, contact, address, bloodGroup, allergies, chronicConditions, visitFees, totalFeeAmount, ...visitData } = data;

    // Prepare visit data
    const visitCreateData: any = {
      visitDate: visitData.consultationDate ? new Date(visitData.consultationDate) : new Date(),
      visitType: 'Consultation',
    };

    // Add optional fields
    if (visitData.chiefComplaint) visitCreateData.chiefComplaint = visitData.chiefComplaint;
    if (visitData.signs) visitCreateData.signs = visitData.signs;
    if (visitData.investigations) visitCreateData.investigations = visitData.investigations;
    if (visitData.diagnosis) visitCreateData.diagnosis = visitData.diagnosis;
    if (visitData.treatment) visitCreateData.treatment = visitData.treatment;
    if (visitData.medicines) visitCreateData.medicines = visitData.medicines;
    if (visitData.history) visitCreateData.notes = visitData.history;
    if (visitData.bloodPressure) visitCreateData.bloodPressure = visitData.bloodPressure;
    if (visitData.referredTo) visitCreateData.referredTo = visitData.referredTo;
    if (visitData.followUpNotes) visitCreateData.followUpNotes = visitData.followUpNotes;
    if (visitData.paidBy) visitCreateData.paidBy = visitData.paidBy;

    // Handle numeric fields
    if (visitData.temp && visitData.temp !== '') {
      const tempNum = parseFloat(visitData.temp);
      if (!isNaN(tempNum)) visitCreateData.temp = tempNum;
    }
    if (visitData.spo2 && visitData.spo2 !== '') {
      const spo2Num = parseInt(visitData.spo2);
      if (!isNaN(spo2Num)) visitCreateData.spo2 = spo2Num;
    }
    if (visitData.pulse && visitData.pulse !== '') {
      const pulseNum = parseInt(visitData.pulse);
      if (!isNaN(pulseNum)) visitCreateData.pulse = pulseNum;
    }
    if (visitData.weight && visitData.weight !== '') {
      const weightNum = parseFloat(visitData.weight);
      if (!isNaN(weightNum)) visitCreateData.weight = weightNum;
    }

    // Handle new vital fields
    if (visitData.bpSystolic && visitData.bpSystolic !== '') {
      const bpSystolicNum = parseInt(visitData.bpSystolic);
      if (!isNaN(bpSystolicNum)) visitCreateData.bpSystolic = bpSystolicNum;
    }
    if (visitData.bpDiastolic && visitData.bpDiastolic !== '') {
      const bpDiastolicNum = parseInt(visitData.bpDiastolic);
      if (!isNaN(bpDiastolicNum)) visitCreateData.bpDiastolic = bpDiastolicNum;
    }
    if (visitData.rbs && visitData.rbs !== '') {
      const rbsNum = parseInt(visitData.rbs);
      if (!isNaN(rbsNum)) visitCreateData.rbs = rbsNum;
    }

    // Handle reports - convert array to JSON string
    if (visitData.reports && Array.isArray(visitData.reports) && visitData.reports.length > 0) {
      visitCreateData.reports = JSON.stringify(visitData.reports);
    }

    // Handle follow-up date
    if (visitData.followUpDate && visitData.followUpDate !== '') {
      visitCreateData.followUpDate = new Date(visitData.followUpDate);
    }

    // Filter out empty medicines (only include if name is provided)
    const validMedications = visitData.medications && Array.isArray(visitData.medications)
      ? visitData.medications.filter((med: any) => med.name && med.name.trim())
      : [];

    // Prepare visit fees for creation
    const validVisitFees = visitFees && Array.isArray(visitFees) && visitFees.length > 0
      ? visitFees.map((fee: any) => ({
          serviceName: fee.serviceName || 'Service',
          amount: parseFloat(fee.amount) || 0,
          quantity: parseInt(fee.quantity) || 1,
          discount: parseFloat(fee.discount) || 0,
          total: parseFloat(fee.total) || 0,
        }))
      : [];

    // The database unique constraint protects against simultaneous requests
    // selecting the same next ID. Retry with a fresh ID in that rare case.
    let patient: any;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const patientId = await generatePatientId();

      try {
        patient = await prisma.patient.create({
          data: {
            patientId,
            name,
            age: age ? parseInt(age) : null,
            gender,
            contact,
            address,
            bloodGroup,
            allergies,
            chronicConditions,
            visits: {
              create: {
                ...visitCreateData,
                fees: validVisitFees.length > 0
                  ? {
                      create: validVisitFees,
                    }
                  : undefined,
                medications: validMedications.length > 0
                  ? {
                      create: validMedications.map((med: any) => ({
                        medicine: med.name.trim(),
                        dose: med.dose || null,
                        frequency: med.frequency || null,
                        timing: med.timing || null,
                        duration: med.duration || null,
                        startFrom: med.startFrom || null,
                        instructions: med.instructions || null,
                      })),
                    }
                  : undefined,
              },
            },
          },
          include: {
            visits: {
              include: {
                fees: true,
                medications: true,
              }
            },
          },
        });
        break;
      } catch (error: any) {
        const duplicatePatientId =
          error?.code === 'P2002' &&
          (!error?.meta?.target || error.meta.target.includes('patientId'));

        if (!duplicatePatientId || attempt === 4) {
          throw error;
        }
      }
    }

    // Create invoice if fees are provided
    // TODO: Uncomment after Prisma schema migration
    // if (visitFees && Array.isArray(visitFees) && visitFees.length > 0) {
    //   const invoiceAmount = totalFeeAmount || visitFees.reduce((sum, fee) => sum + fee.total, 0);
    //   
    //   // Create invoice items from visit fees
    //   const invoiceItems = visitFees.map(fee => ({
    //     description: fee.serviceName,
    //     quantity: fee.quantity,
    //     unitPrice: fee.amount,
    //     discount: fee.discount,
    //     total: fee.total,
    //   }));
    //
    //   try {
    //     await prisma.invoice.create({
    //       data: {
    //         invoiceNumber: `INV-${Date.now()}`,
    //         patientId: patient.id,
    //         visitId: patient.visits[0]?.id,
    //         amount: invoiceAmount,
    //         status: 'pending',
    //         items: {
    //           create: invoiceItems,
    //         },
    //         dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    //       },
    //     });
    //   } catch (invoiceError) {
    //     logger.error('Failed to create invoice', { error: invoiceError });
    //     // Don't fail the patient creation if invoice creation fails
    //   }
    // }

    logger.info('Patient created successfully', {
      patientId: patient.patientId,
      patientName: patient.name,
      hasFees: visitFees && visitFees.length > 0,
    });

    return successResponse(patient, 201, request);
  },
  {
    rateLimit: RATE_LIMITS.API,
    validateSchema: createPatientSchema,
    validateSource: 'body',
  }
);
