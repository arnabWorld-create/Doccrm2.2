import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { error } = await requirePermission(req, 'appointments', 'read');
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get('startDate');
  const endDate   = searchParams.get('endDate');

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'startDate and endDate required' }, { status: 400 });
  }

  const firstDay = new Date(startDate);
  const lastDay  = new Date(endDate);

  const [visits, followUpVisits] = await Promise.all([
    prisma.visit.findMany({
      where: { visitDate: { gte: firstDay, lte: lastDay } },
      select: {
        visitDate: true,
        patient: {
          select: { id: true, patientId: true, name: true, age: true, gender: true, contact: true },
        },
      },
      orderBy: { visitDate: 'asc' },
    }),
    prisma.visit.findMany({
      where: { followUpDate: { gte: firstDay, lte: lastDay } },
      select: {
        followUpDate: true,
        patient: {
          select: { id: true, patientId: true, name: true, age: true, gender: true, contact: true },
        },
      },
      orderBy: { followUpDate: 'asc' },
    }),
  ]);

  return NextResponse.json(
    {
      consultations: visits.map(v => ({
        id: v.patient.id, name: v.patient.name, age: v.patient.age,
        gender: v.patient.gender, contact: v.patient.contact,
        consultationDate: v.visitDate,
      })),
      followUps: followUpVisits.map(v => ({
        id: v.patient.id, name: v.patient.name, age: v.patient.age,
        gender: v.patient.gender, contact: v.patient.contact,
        followUpDate: v.followUpDate,
      })),
    },
    {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' },
    }
  );
}
