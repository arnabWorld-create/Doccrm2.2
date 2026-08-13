import { NextRequest, NextResponse } from 'next/server';
import { withMiddleware, successResponse } from '@/lib/middleware';
import { RATE_LIMITS } from '@/lib/redis-rate-limiter';

export const dynamic = 'force-dynamic';

export const POST = withMiddleware(
  async (request: NextRequest) => {
    const response = successResponse({ message: 'Logout successful' }, 200, request);
    response.cookies.set({
      name: 'auth-token',
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
    return response;
  },
  { rateLimit: RATE_LIMITS.AUTH }
);
