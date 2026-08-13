import { NextRequest } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';
import { withMiddleware, successResponse } from '@/lib/middleware';
import { ApiErrors } from '@/lib/api-error';
import { logger } from '@/lib/logger';
import { RATE_LIMITS } from '@/lib/redis-rate-limiter';

export const dynamic = 'force-dynamic';

const updateAppointmentSchema = z.object({
  appointmentDate: z.string().datetime().optional(),
  appointmentTime: z.string().max(20).optional(),
  duration:        z.number().int().min(5).max(480).optional(),
  appointmentType: z.string().max(100).optional(),
  status:          z.enum(['Scheduled', 'Confirmed', 'Completed', 'Cancelled', 'No-Show']).optional(),
  reason:          z.string().max(1000).optional().nullable(),
  notes:           z.string().max(2000).optional().nullable(),
  reminderSent:    z.boolean().optional(),
});

// GET - Fetch single appointment
export const GET = withMiddleware(
  async (request: NextRequest) => {
    const { error } = await requirePermission(request, 'appointments', 'read');
    if (error) throw error;

    const id = request.nextUrl.pathname.split('/').pop()!;
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { patient: true },
    });

    if (!appointment) throw ApiErrors.notFound('Appointment not found');

    return successResponse(appointment, 200, request);
  },
  { rateLimit: RATE_LIMITS.API }
);

// PUT - Update appointment
export const PUT = withMiddleware(
  async (request: NextRequest, data) => {
    const { error } = await requirePermission(request, 'appointments', 'write');
    if (error) throw error;

    const id = request.nextUrl.pathname.split('/').pop()!;

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        appointmentDate: data.appointmentDate ? new Date(data.appointmentDate) : undefined,
        appointmentTime: data.appointmentTime,
        duration:        data.duration,
        appointmentType: data.appointmentType,
        status:          data.status,
        reason:          data.reason,
        notes:           data.notes,
        reminderSent:    data.reminderSent,
      },
      include: { patient: true },
    });

    logger.info('Appointment updated', { appointmentId: id });
    return successResponse(appointment, 200, request);
  },
  {
    rateLimit: RATE_LIMITS.API,
    validateSchema: updateAppointmentSchema,
    validateSource: 'body',
  }
);

// DELETE - Delete appointment
export const DELETE = withMiddleware(
  async (request: NextRequest) => {
    const { error } = await requirePermission(request, 'appointments', 'delete');
    if (error) throw error;

    const id = request.nextUrl.pathname.split('/').pop()!;
    await prisma.appointment.delete({ where: { id } });

    logger.info('Appointment deleted', { appointmentId: id });
    return successResponse({ deleted: true }, 200, request);
  },
  { rateLimit: RATE_LIMITS.STRICT }
);
