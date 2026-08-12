import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { verifyPassword, generateToken } from '@/lib/auth';
import { withMiddleware, successResponse } from '@/lib/middleware';
import { ApiErrors } from '@/lib/api-error';
import { logger } from '@/lib/logger';
import { RATE_LIMITS } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

// Validation schema
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const POST = withMiddleware(
  async (request: NextRequest, data) => {
    const { email, password } = data;

    try {
      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        logger.warn('Login attempt with non-existent email', { email });
        throw ApiErrors.unauthorized('Invalid email or password');
      }

      if (!user.isActive) {
        logger.warn('Login attempt with inactive account', { email });
        throw ApiErrors.forbidden('Account is inactive');
      }

      // Verify password
      const isPasswordValid = await verifyPassword(password, user.password);

      if (!isPasswordValid) {
        logger.warn('Login attempt with invalid password', { email });
        throw ApiErrors.unauthorized('Invalid email or password');
      }

      // Generate token — include name + role so /api/auth/me needs no DB call
      const token = generateToken(user.id, user.email, user.name, user.role);

      // Update last login in background (don't await)
      prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      }).catch(err => logger.error('Failed to update lastLogin', err));

      // Create response
      const response = successResponse(
        {
          message: 'Login successful',
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            isActive: user.isActive,
          },
          token,
        },
        200,
        request
      );

      // Set cookie on response
      response.cookies.set({
        name: 'auth-token',
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/',
      });

      logger.info('User logged in successfully', { userId: user.id, email });

      return response;
    } catch (error) {
      logger.error('Login error', error, { email });
      throw error;
    }
  },
  {
    rateLimit: RATE_LIMITS.AUTH,
    validateSchema: loginSchema,
    validateSource: 'body',
  }
);
