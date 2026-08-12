import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './auth';
import prisma from './prisma';

/**
 * Middleware to protect API routes.
 * Verifies JWT token from cookies AND checks that the user is still active
 * in the database.
 *
 * FIX #2: The previous version only verified the JWT signature. A deactivated
 * user's token remained valid for up to 7 days after being disabled.
 * Now we always check isActive against the database so disabling a user
 * takes effect immediately on the next request.
 */
export async function requireAuth(request: NextRequest) {
  // Get token from cookies
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      ),
      user: null,
    };
  }

  // Verify JWT signature
  const decoded = verifyToken(token);

  if (!decoded) {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      ),
      user: null,
    };
  }

  // Check user still exists and is active in the database.
  // This ensures a disabled account is blocked immediately — not after
  // the token expires in 7 days.
  // PERF FIX: fetch name + role here too so requireRole/requirePermission
  // can reuse this object without a second DB round-trip.
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });

  if (!user) {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      ),
      user: null,
    };
  }

  if (!user.isActive) {
    return {
      error: NextResponse.json(
        { error: 'Account is inactive' },
        { status: 403 }
      ),
      user: null,
    };
  }

  return {
    error: null,
    // Return full user so callers don't need a second DB query
    user: { userId: user.id, email: user.email, name: user.name, role: user.role, isActive: user.isActive },
  };
}
