import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET - Fetch appointments with filters and pagination
export async function GET(req: NextRequest) {
  const { error } = await requirePermission(req, 'appointments', 'read');
  if (error) return error;

  try {
    // Check if Appointment model exists
    if (!prisma.appointment) {
      return NextResponse.json({ data: [], pagination: { total: 0, page: 1, limit: 50, pages: 0 } }, { status: 200 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const status = searchParams.get('status');
    const patientId = searchParams.get('patientId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const where: any = {};

    // Filter by specific date
    if (date) {
      const targetDate = new Date(date);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      where.appointmentDate = {
        gte: targetDate,
        lt: nextDay,
      };
    }

    // Filter by date range
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      where.appointmentDate = { gte: start, lt: end };
    } else if (startDate) {
      where.appointmentDate = { gte: new Date(startDate) };
    } else if (endDate) {
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      where.appointmentDate = { lt: end };
    }

    // Filter by status
    if (status) {
      where.status = status;
    }

    // Filter by patient
    if (patientId) {
      where.patientId = patientId;
    }

    // Batch queries for better performance
    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        select: {
          id: true,
          patientId: true,
          appointmentDate: true,
          appointmentTime: true,
          duration: true,
          appointmentType: true,
          status: true,
          reason: true,
          notes: true,
          tempPatientName: true,
          tempPatientContact: true,
          patient: {
            select: {
              id: true,
              patientId: true,
              name: true,
              age: true,
              gender: true,
              contact: true,
            },
          },
        },
        orderBy: [
          { appointmentDate: 'asc' },
          { appointmentTime: 'asc' },
        ],
        skip,
        take: limit,
      }),
      prisma.appointment.count({ where }),
    ]);

    return NextResponse.json({
      data: appointments,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Failed to fetch appointments', error);
    return NextResponse.json(
      { message: 'Failed to fetch appointments' },
      { status: 500 }
    );
  }
}

// POST - Create new appointment
export async function POST(req: NextRequest) {
  const { error } = await requirePermission(req, 'appointments', 'write');
  if (error) return error;

  try {
    const body = await req.json();

    // Validate required fields
    if (!body.appointmentDate || !body.appointmentTime) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Must have either patientId OR tempPatientName
    if (!body.patientId && !body.tempPatientName) {
      return NextResponse.json(
        { message: 'Either patientId or tempPatientName is required' },
        { status: 400 }
      );
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId: body.patientId || null,
        appointmentDate: new Date(body.appointmentDate),
        appointmentTime: body.appointmentTime,
        duration: body.duration || 30,
        appointmentType: body.appointmentType || 'Consultation',
        status: body.status || 'Scheduled',
        reason: body.reason || null,
        notes: body.notes || null,
        tempPatientName: body.tempPatientName || null,
        tempPatientContact: body.tempPatientContact || null,
      },
      include: {
        patient: true,
      },
    });

    return NextResponse.json(appointment, { status: 201 });
  } catch (error: unknown) {
    logger.error('Failed to create appointment', error);
    const { sanitizeErrorForClient } = await import('@/lib/sanitize-error');
    return NextResponse.json(
      { message: sanitizeErrorForClient(error) },
      { status: 500 }
    );
  }
}
