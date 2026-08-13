import { NextRequest } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';
import { withMiddleware, successResponse } from '@/lib/middleware';
import { ApiErrors } from '@/lib/api-error';
import { logger } from '@/lib/logger';
import { RATE_LIMITS } from '@/lib/redis-rate-limiter';

export const dynamic = 'force-dynamic';

const createAppointmentSchema = z.object({
  patientId:          z.string().optional().nullable(),
  tempPatientName:    z.string().max(200).optional().nullable(),
  tempPatientContact: z.string().max(20).optional().nullable(),
  appointmentDate:    z.string(),
  appointmentTime:    z.string().max(20),
  duration:           z.number().int().min(5).max(480).optional(),
  appointmentType:    z.enum(['Consultation', 'Follow-up', 'Check-up', 'Emergency']).optional(),
  status:             z.enum(['Scheduled', 'Confirmed', 'Completed', 'Cancelled', 'No-Show']).optional(),
  reason:             z.string().max(1000).optional().nullable(),
  notes:              z.string().max(2000).optional().nullable(),
}).refine(
  (d) => d.patientId || d.tempPatientName,
  { message: 'Either patientId or tempPatientName is required' }
);

// GET - Fetch appointments with filters and pagination
export const GET = withMiddleware(
  async (request: NextRequest) => {
    const { error } = await requirePermission(request, 'appointments', 'read');
    if (error) throw error;

    if (!prisma.appointment) {
      return successResponse(
        { data: [], pagination: { total: 0, page: 1, limit: 50, pages: 0 } },
        200,
        request
      );
    }

    const { searchParams } = new URL(request.url);
    const date       = searchParams.get('date');
    const status     = searchParams.get('status');
    const patientId  = searchParams.get('patientId');
    const startDate  = searchParams.get('startDate');
    const endDate    = searchParams.get('endDate');
    const page       = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit      = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const skip       = (page - 1) * limit;

    const where: any = {};

    if (date) {
      const targetDate = new Date(date);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      where.appointmentDate = { gte: targetDate, lt: nextDay };
    } else if (startDate || endDate) {
      where.appointmentDate = {};
      if (startDate) where.appointmentDate.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        where.appointmentDate.lt = end;
      }
    }

    if (status)    where.status    = status;
    if (patientId) where.patientId = patientId;

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
              id: true, patientId: true, name: true,
              age: true, gender: true, contact: true,
            },
          },
        },
        orderBy: [{ appointmentDate: 'asc' }, { appointmentTime: 'asc' }],
        skip,
        take: limit,
      }),
      prisma.appointment.count({ where }),
    ]);

    const response = successResponse(
      { data: appointments, pagination: { total, page, limit, pages: Math.ceil(total / limit) } },
      200,
      request
    );
    response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    return response;
  },
  { rateLimit: RATE_LIMITS.API }
);

// POST - Create new appointment
export const POST = withMiddleware(
  async (request: NextRequest, data) => {
    const { error } = await requirePermission(request, 'appointments', 'write');
    if (error) throw error;

    const appointment = await prisma.appointment.create({
      data: {
        patientId:          data.patientId || null,
        appointmentDate:    new Date(data.appointmentDate),
        appointmentTime:    data.appointmentTime,
        duration:           data.duration ?? 30,
        appointmentType:    data.appointmentType ?? 'Consultation',
        status:             data.status ?? 'Scheduled',
        reason:             data.reason || null,
        notes:              data.notes || null,
        tempPatientName:    data.tempPatientName || null,
        tempPatientContact: data.tempPatientContact || null,
      },
      include: { patient: true },
    });

    logger.info('Appointment created', { appointmentId: appointment.id });
    return successResponse(appointment, 201, request);
  },
  {
    rateLimit: RATE_LIMITS.API,
    validateSchema: createAppointmentSchema,
    validateSource: 'body',
  }
);
