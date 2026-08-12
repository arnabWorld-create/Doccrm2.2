import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getAuthCookie } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { withMiddleware, successResponse } from '@/lib/middleware';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

async function handler(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Fast path: if JWT has name+role (tokens issued after this deploy),
    // return immediately — zero DB query, zero cold-start latency.
    if (decoded.name && decoded.role) {
      const res = successResponse(
        {
          id: decoded.userId,
          email: decoded.email,
          name: decoded.name,
          role: decoded.role,
          isActive: true,
        },
        200,
        request
      );
      res.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300');
      return res;
    }

    // Slow path: old token without name/role — fall back to DB once.
    // After the user logs in again they get a new token and hit the fast path.
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, role: true, isActive: true, lastLogin: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const res = successResponse(user, 200, request);
    res.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300');
    return res;
  } catch (error: unknown) {
    logger.error('Error in /api/auth/me', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withMiddleware(handler);
