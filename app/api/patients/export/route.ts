import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { requirePermission } from '@/lib/rbac';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { error } = await requirePermission(req, 'patients', 'read');
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const month = searchParams.get('month');

    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { contact: { contains: search } },
        { patientId: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    const visitFilter: any = {};
    if (month) {
      const [year, monthNum] = month.split('-').map(Number);
      const monthStart = new Date(year, monthNum - 1, 1);
      const monthEnd = new Date(year, monthNum, 1);
      visitFilter.visitDate = { gte: monthStart, lt: monthEnd };
    } else if (startDate || endDate) {
      visitFilter.visitDate = {};
      if (startDate) visitFilter.visitDate.gte = new Date(startDate);
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setDate(endDateTime.getDate() + 1);
        visitFilter.visitDate.lt = endDateTime;
      }
    }

    if (Object.keys(visitFilter).length > 0) {
      whereClause.visits = { some: visitFilter };
    }

    const patients = await prisma.patient.findMany({
      where: whereClause,
      include: {
        visits: {
          // Only include visits matching the filter, capped to avoid OOM
          where: Object.keys(visitFilter).length > 0 ? visitFilter : undefined,
          orderBy: { visitDate: 'desc' },
          take: 50, // max 50 visits per patient in export
          include: {
            medications: true, // structured Medication rows
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5000, // FIX: cap at 5,000 patients per export request
    });

    // Format structured medications into a readable string
    // e.g. "Paracetamol 500mg - 1-0-1 (After food) x 5 days [Start: 14/08]; Amoxicillin..."
    const formatMedications = (medications: any[]): string => {
      if (!medications || medications.length === 0) return 'N/A';
      return medications
        .map(med => {
          const parts = [med.medicine];
          if (med.dose) parts.push(med.dose);
          if (med.frequency) parts.push(`- ${med.frequency}`);
          if (med.timing) parts.push(`(${med.timing})`);
          if (med.duration) parts.push(`x ${med.duration}`);
          if (med.startFrom) parts.push(`Start: ${med.startFrom}`);
          if (med.instructions) parts.push(`[${med.instructions}]`);
          return parts.join(' ');
        })
        .join('; ');
    };

    // Flatten data for Excel (one row per visit)
    const excelData: any[] = [];
    patients.forEach(patient => {
      patient.visits.forEach(visit => {
        excelData.push({
          // ── Patient info ──
          'Patient ID':          patient.patientId,
          'Name':                patient.name,
          'Age':                 patient.age          || 'N/A',
          'Gender':              patient.gender        || 'N/A',
          'Contact':             patient.contact       || 'N/A',
          'Address':             patient.address       || 'N/A',
          'Blood Group':         patient.bloodGroup    || 'N/A',
          'Allergies':           patient.allergies     || 'N/A',
          'Chronic Conditions':  patient.chronicConditions || 'N/A',
          // ── Visit info ──
          'Visit Date':          visit.visitDate ? new Date(visit.visitDate).toLocaleDateString('en-IN') : 'N/A',
          'Visit Type':          visit.visitType       || 'N/A',
          'Chief Complaint':     visit.chiefComplaint  || 'N/A',
          'Signs & Symptoms':    visit.signs           || 'N/A',
          'Investigations':      visit.investigations  || 'N/A',
          'Diagnosis':           visit.diagnosis       || 'N/A',
          'Treatment':           visit.treatment       || 'N/A',
          'Medicines':           formatMedications(visit.medications),
          // ── Vitals ──
          'Temperature':         visit.temp            ?? 'N/A',
          'SpO2':                visit.spo2            ?? 'N/A',
          'Pulse':               visit.pulse           ?? 'N/A',
          'BP':                  visit.bloodPressure   || 'N/A',
          'BP Systolic':         visit.bpSystolic      ?? 'N/A',
          'BP Diastolic':        visit.bpDiastolic     ?? 'N/A',
          'Weight (kg)':         visit.weight          ?? 'N/A',
          'RBS':                 visit.rbs             ?? 'N/A',
          // ── Follow-up & misc ──
          'Follow-up Date':      visit.followUpDate ? new Date(visit.followUpDate).toLocaleDateString('en-IN') : 'N/A',
          'Follow-up Notes':     visit.followUpNotes   || 'N/A',
          'Notes':               visit.notes           || 'N/A',
          'Referred To':         visit.referredTo      || 'N/A',
          'Paid By':             visit.paidBy          || 'N/A',
        });
      });
    });

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Column widths — one entry per column in the order above
    worksheet['!cols'] = [
      { wch: 12 }, { wch: 22 }, { wch: 6 },  { wch: 10 }, { wch: 15 }, // Patient ID → Contact
      { wch: 25 }, { wch: 12 }, { wch: 25 }, { wch: 25 },               // Address → Chronic Conditions
      { wch: 14 }, { wch: 15 }, { wch: 30 }, { wch: 30 }, { wch: 30 }, // Visit Date → Investigations
      { wch: 25 }, { wch: 30 }, { wch: 40 },                            // Diagnosis → Medicines
      { wch: 12 }, { wch: 8 },  { wch: 8 },  { wch: 12 }, { wch: 12 }, // Temp → BP
      { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 8 },               // BP Sys → RBS
      { wch: 14 }, { wch: 30 }, { wch: 30 }, { wch: 20 }, { wch: 15 }, // Follow-up → Paid By
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Patient Visits');
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="patient-visits-${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    // FIX #3: Log full error server-side, send only a safe message to client
    logger.error('Patient export failed', error);
    return new NextResponse(
      JSON.stringify({ message: 'Export failed. Please try again.' }),
      { status: 500 }
    );
  }
}
