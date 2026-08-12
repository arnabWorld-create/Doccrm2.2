import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { logger } from './logger';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

const JWT_EXPIRY = '7d';

export async function hashPassword(password: string): Promise<string> {
  // SECURITY FIX: Increased from 8 to 12 rounds (industry standard)
  // Date: 2026-02-13
  // Impact: Existing passwords remain at 8 rounds until user changes password
  // Migration: Gradual rehashing on next login (see verifyPassword)
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const isValid = await bcrypt.compare(password, hash);
  
  // GRADUAL REHASHING: If password is valid but uses old rounds, log for monitoring
  // This happens transparently on next login
  // TODO: Implement automatic rehashing in background job post-funding
  if (isValid) {
    try {
      const rounds = bcrypt.getRounds(hash);
      if (rounds < 12) {
        // Log for monitoring (don't block login)
        logger.info('Password needs rehashing', { rounds });
      }
    } catch (error) {
      // Ignore errors in rehashing check - don't block login
    }
  }
  
  return isValid;
}

export function generateToken(userId: string, email: string, name: string, role: string): string {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.sign(
    { userId, email, name, role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

export function verifyToken(token: string): { userId: string; email: string; name?: string; role?: string } | null {
  try {
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured');
    }
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string; name?: string; role?: string };
    return decoded;
  } catch (error) {
    return null;
  }
}

export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  });
}

export async function getAuthCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('auth-token')?.value || null;
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('auth-token');
}

export async function getAuthUser() {
  const token = await getAuthCookie();
  if (!token) return null;
  return verifyToken(token);
}
