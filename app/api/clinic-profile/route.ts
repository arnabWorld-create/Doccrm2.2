import { NextRequest } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';
import { withMiddleware, successResponse } from '@/lib/middleware';
import { logger } from '@/lib/logger';
import { RATE_LIMITS } from '@/lib/redis-rate-limiter';

export const dynamic = 'force-dynamic';

const updateClinicProfileSchema = z.object({
  clinicName:          z.string().max(200).optional(),
  address:             z.string().max(500).optional().nullable(),
  city:                z.string().max(100).optional().nullable(),
  state:               z.string().max(100).optional().nullable(),
  pincode:             z.string().max(20).optional().nullable(),
  phone:               z.string().max(20).optional().nullable(),
  email:               z.union([z.string().email().max(200), z.literal('')]).optional().nullable(),
  website:             z.string().max(300).optional().nullable(),
  workingHours:        z.string().max(300).optional().nullable(),
  doctorName:          z.string().max(200).optional().nullable(),
  doctorQualification: z.string().max(300).optional().nullable(),
  registrationNumber:  z.string().max(100).optional().nullable(),
  specialization:      z.string().max(200).optional().nullable(),
  tagline:             z.string().max(300).optional().nullable(),
  invoiceHeader:       z.string().max(1000).optional().nullable(),
  invoiceFooter:       z.string().max(1000).optional().nullable(),
  receiptHeader:       z.string().max(1000).optional().nullable(),
  receiptFooter:       z.string().max(1000).optional().nullable(),
});

// GET - Fetch clinic profile
export const GET = withMiddleware(
  async (request: NextRequest) => {
    const { error } = await requirePermission(request, 'settings', 'read');
    if (error) throw error;

    let profile = await prisma.clinicProfile.findFirst();

    if (!profile) {
      profile = await prisma.clinicProfile.create({
        data: {
          clinicName: 'Faith Clinic',
          workingHours: 'Mon-Sat: 9:00 AM - 8:00 PM | Sun: 10:00 AM - 2:00 PM',
        },
      });
    }

    const response = successResponse(profile, 200, request);
    // Clinic profile rarely changes — cache for 5 minutes
    response.headers.set('Cache-Control', 'private, max-age=300, stale-while-revalidate=600');
    return response;
  },
  { rateLimit: RATE_LIMITS.API }
);

// PUT - Update clinic profile
export const PUT = withMiddleware(
  async (request: NextRequest, data) => {
    const { error } = await requirePermission(request, 'settings', 'write');
    if (error) throw error;

    let profile = await prisma.clinicProfile.findFirst();

    if (profile) {
      profile = await prisma.clinicProfile.update({
        where: { id: profile.id },
        data,
      });
    } else {
      profile = await prisma.clinicProfile.create({
        data: { clinicName: 'Faith Clinic', ...data },
      });
    }

    logger.info('Clinic profile updated');
    return successResponse(profile, 200, request);
  },
  {
    rateLimit: RATE_LIMITS.STRICT,
    validateSchema: updateClinicProfileSchema,
    validateSource: 'body',
  }
);
