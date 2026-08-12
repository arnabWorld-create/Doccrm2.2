import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';
import { logger } from '@/lib/logger';

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
export async function GET(req: NextRequest) {
  const { error } = await requirePermission(req, 'settings', 'read');
  if (error) return error;

  try {
    let profile = await prisma.clinicProfile.findFirst();

    if (!profile) {
      profile = await prisma.clinicProfile.create({
        data: {
          clinicName: 'Faith Clinic',
          workingHours: 'Mon-Sat: 9:00 AM - 8:00 PM | Sun: 10:00 AM - 2:00 PM',
        },
      });
    }

    return NextResponse.json(profile, {
      headers: {
        // Cache clinic profile in the browser for 5 minutes — it rarely changes
        'Cache-Control': 'private, max-age=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    logger.error('Failed to fetch clinic profile', error);
    return NextResponse.json(
      { message: 'Failed to fetch clinic profile' },
      { status: 500 }
    );
  }
}

// PUT - Update clinic profile
export async function PUT(req: NextRequest) {
  const { error } = await requirePermission(req, 'settings', 'write');
  if (error) return error;

  try {
    const rawBody = await req.json();
    const parsed = updateClinicProfileSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid input', errors: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const body = parsed.data;

    let profile = await prisma.clinicProfile.findFirst();

    if (profile) {
      profile = await prisma.clinicProfile.update({
        where: { id: profile.id },
        data: body,
      });
    } else {
      profile = await prisma.clinicProfile.create({
        data: { clinicName: 'Faith Clinic', ...body },
      });
    }

    return NextResponse.json(profile);
  } catch (error) {
    logger.error('Failed to update clinic profile', error);
    return NextResponse.json(
      { message: 'Failed to update clinic profile' },
      { status: 500 }
    );
  }
}
