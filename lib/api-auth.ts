import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './auth';
import prisma from './prisma';

/**
 * Middleware to protect API routes.
 * 
 * FAST PATH: If the JWT contains name+role (new tokens), skip the DB query
 * entirely. The JWT is cryptographically signed — if it's valid, the user
 * was active at login time. This eliminates the DB round-trip on EVERY
 * API call (was: 300-500ms to Supabase India per request).
 *
 * SLOW PATH: Old tokens without name/role fall back to a DB check once,
 * then the user gets a new token on next login.
 *
 * SECURITY NOTE: Disabling a user takes effect within 7 days (token expiry)
 * instead of immediately. For a clinic CRM this is acceptable. If immediate
 * revocation is needed, add a token blacklist or reduce JWT_EXPIRY to 1h.
 */
export async function requireAuth(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), user: null };
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), user: null };
  }

  // Fast path — token has everything we need, no DB call
  if (decoded.name && decoded.role) {
    return {
      error: null,
      user: {
        userId: decoded.userId,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role,
        isActive: true,
      },
    };
  }

  // Slow path — old token, hit DB once to get role
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), user: null };
  }

  if (!user.isActive) {
    return { error: NextResponse.json({ error: 'Account is inactive' }, { status: 403 }), user: null };
  }

  return {
    error: null,
    user: { userId: user.id, email: user.email, name: user.name, role: user.role, isActive: user.isActive },
  };
}
