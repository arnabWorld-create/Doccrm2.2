import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { withMiddleware, successResponse, errorResponse } from '@/lib/middleware';
import { ApiErrors } from '@/lib/api-error';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

async function handler(request: NextRequest) {
  try {
    // Get user from token
    const authUser = await getAuthUser();

    if (!authUser) {
      // Return 401 without throwing - this is expected when not logged in
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Fetch full user details
    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLogin: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const res = successResponse(user, 200, request);
    // Allow the browser to cache this for 60 s, revalidate in background.
    // The middleware already validates the JWT on every page load so stale
    // user data for 60 s is acceptable and saves a DB round-trip per navigation.
    res.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300');
    return res;
  } catch (error: unknown) {
    logger.error('Error in /api/auth/me', error);
    const { sanitizeErrorForClient } = await import('@/lib/sanitize-error');
    return NextResponse.json(
      { error: 'Internal server error', message: sanitizeErrorForClient(error) },
      { status: 500 }
    );
  }
}

export const GET = withMiddleware(handler);
