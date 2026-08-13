import { NextRequest } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';
import { withMiddleware, successResponse } from '@/lib/middleware';
import { ApiErrors } from '@/lib/api-error';
import { logger } from '@/lib/logger';
import { RATE_LIMITS } from '@/lib/redis-rate-limiter';

export const dynamic = 'force-dynamic';

const createMedicineSchema = z.object({
  name: z.string().min(4, 'Medicine name must be at least 4 characters').max(200),
});

// GET - Fetch all custom medicines
export const GET = withMiddleware(
  async (request: NextRequest) => {
    const { error } = await requirePermission(request, 'settings', 'read');
    if (error) throw error;

    const customMedicines = await prisma.customMedicine.findMany({
      orderBy: [{ usageCount: 'desc' }, { name: 'asc' }],
    });

    return successResponse(customMedicines, 200, request);
  },
  { rateLimit: RATE_LIMITS.API }
);

// POST - Add or increment usage count of a custom medicine
export const POST = withMiddleware(
  async (request: NextRequest, data) => {
    const { error } = await requirePermission(request, 'settings', 'write');
    if (error) throw error;

    const trimmedName = data.name.trim();

    const existing = await prisma.customMedicine.findUnique({
      where: { name: trimmedName },
    });

    if (existing) {
      const updated = await prisma.customMedicine.update({
        where: { name: trimmedName },
        data: { usageCount: existing.usageCount + 1 },
      });
      logger.info('Medicine usage incremented', { name: trimmedName });
      return successResponse(updated, 200, request);
    }

    const newMedicine = await prisma.customMedicine.create({
      data: { name: trimmedName },
    });
    logger.info('Medicine created', { name: trimmedName });
    return successResponse(newMedicine, 201, request);
  },
  {
    rateLimit: RATE_LIMITS.API,
    validateSchema: createMedicineSchema,
    validateSource: 'body',
  }
);
