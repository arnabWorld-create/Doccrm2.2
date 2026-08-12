/**
 * API middleware utilities for request validation, CORS, rate limiting, etc.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema } from 'zod';
import { logger } from './logger';
import { redisRateLimiter, RATE_LIMITS } from './redis-rate-limiter';
import { ApiError, ApiErrors } from './api-error';

/**
 * Get client IP address from request
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : request.ip || 'unknown';
  return ip;
}

/**
 * CORS middleware
 */
export function withCORS(request: NextRequest, response: NextResponse) {
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.NEXT_PUBLIC_APP_URL,
  ].filter(Boolean);

  const isAllowedOrigin = !origin || allowedOrigins.includes(origin);

  if (isAllowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', origin || '*');
  }

  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400');
  response.headers.set('Access-Control-Allow-Credentials', 'true');

  return response;
}

/**
 * Security headers middleware
 * CSP is built once and cached — no need to recompute on every response.
 */
const _supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://*.supabase.co';
const _appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
const _cachedCsp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: ${_supabaseUrl}`,
  `connect-src 'self' ${_supabaseUrl} https://*.upstash.io ${_appUrl}`.trim(),
  `font-src 'self'`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `frame-ancestors 'none'`,
  `form-action 'self'`,
].join('; ');

export function withSecurityHeaders(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  response.headers.set('Content-Security-Policy', _cachedCsp);
  return response;
}

/**
 * Rate limiting middleware (async, supports Redis)
 */
export async function withRateLimit(
  request: NextRequest,
  response: NextResponse,
  config = RATE_LIMITS.API
): Promise<NextResponse | null> {
  const ip = getClientIp(request);
  const key = `${request.method}:${request.nextUrl.pathname}:${ip}`;

  // Use Redis rate limiter (with in-memory fallback)
  const result = await redisRateLimiter.isAllowed(
    key,
    config.limit,
    config.windowMs
  );

  if (!result.success) {
    const rateLimitResponse = NextResponse.json(
      ApiErrors.tooManyRequests().toJSON(),
      { status: 429 }
    );

    const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
    rateLimitResponse.headers.set('Retry-After', String(Math.max(0, retryAfter)));
    rateLimitResponse.headers.set('X-RateLimit-Remaining', String(result.remaining));
    rateLimitResponse.headers.set('X-RateLimit-Limit', String(result.limit));
    rateLimitResponse.headers.set('X-RateLimit-Reset', String(Math.ceil(result.reset / 1000)));

    logger.warn('Rate limit exceeded', {
      ip,
      endpoint: request.nextUrl.pathname,
      method: request.method,
      remaining: result.remaining,
    });

    return rateLimitResponse;
  }

  // Add rate limit headers to successful requests
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  response.headers.set('X-RateLimit-Limit', String(result.limit));
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(result.reset / 1000)));

  return null;
}

/**
 * Request validation middleware
 */
export async function validateRequest(
  request: NextRequest,
  schema: ZodSchema,
  source: 'body' | 'query' = 'body'
): Promise<{ data: any; error: null } | { data: null; error: ApiError }> {
  try {
    let data;

    if (source === 'body') {
      data = await request.json();
    } else {
      data = Object.fromEntries(request.nextUrl.searchParams);
    }

    const result = schema.safeParse(data);

    if (!result.success) {
      const errors = result.error.errors.reduce((acc, err) => {
        const path = err.path.join('.');
        acc[path] = err.message;
        return acc;
      }, {} as Record<string, string>);

      return {
        data: null,
        error: ApiErrors.unprocessableEntity('Validation failed', errors),
      };
    }

    return { data: result.data, error: null };
  } catch (error) {
    return {
      data: null,
      error: ApiErrors.badRequest('Invalid request body'),
    };
  }
}

/**
 * Error response handler with monitoring integration
 */
export function errorResponse(error: unknown, request: NextRequest): NextResponse<any> {
  const ip = getClientIp(request);
  const context = {
    endpoint: request.nextUrl.pathname,
    method: request.method,
    ip,
  };

  if (error instanceof ApiError) {
    // Log API errors (expected errors)
    logger.warn('API Error', {
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
      ...context,
    });

    // Only track unexpected errors (4xx client errors are usually expected)
    if (error.statusCode >= 500) {
      logger.error('Server error', error, {
        ...context,
        statusCode: error.statusCode,
        code: error.code,
      });
    }

    let response: NextResponse<any> = NextResponse.json(error.toJSON(), { status: error.statusCode });
    response = withCORS(request, response);
    response = withSecurityHeaders(response);
    return response;
  }

  // Unhandled/unexpected errors
  const message = error instanceof Error ? error.message : 'Internal server error';
  logger.error('Unhandled error', error, context);

  let response: NextResponse<any> = NextResponse.json(
    ApiErrors.internalError().toJSON(),
    { status: 500 }
  );
  response = withCORS(request, response);
  response = withSecurityHeaders(response);
  return response;
}

/**
 * Success response handler
 */
export function successResponse(data: any, statusCode = 200, request?: NextRequest): NextResponse {
  let response = NextResponse.json(data, { status: statusCode });

  if (request) {
    response = withCORS(request, response);
    response = withSecurityHeaders(response);
  }

  return response;
}

/**
 * Wrapper for API route handlers with error handling, logging, and performance tracking
 */
export function withErrorHandling(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const startTime = Date.now();
    const ip = getClientIp(request);
    const endpoint = request.nextUrl.pathname;

    try {
      const response = await handler(request);
      const duration = Date.now() - startTime;

      logger.info('API Request', {
        method: request.method,
        endpoint,
        statusCode: response.status,
        duration,
        ip,
      });

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      // FIX: requirePermission / requireAuth return a NextResponse error object
      // which route handlers throw via `if (error) throw error`. We must pass
      // it straight back — not wrap it in a 500 — otherwise any unauthenticated
      // or forbidden request becomes an opaque 500 instead of a clean 401/403.
      if (error instanceof NextResponse) {
        logger.info('API Request', {
          method: request.method,
          endpoint,
          statusCode: error.status,
          duration,
          ip,
        });
        return error;
      }

      logger.error('API Request Failed', error, {
        method: request.method,
        endpoint,
        duration,
        ip,
      });

      return errorResponse(error, request);
    }
  };
}

/**
 * Wrapper combining rate limiting, validation, and error handling
 */
export function withMiddleware(
  handler: (request: NextRequest, data?: any) => Promise<NextResponse>,
  options?: {
    rateLimit?: typeof RATE_LIMITS[keyof typeof RATE_LIMITS];
    validateSchema?: ZodSchema;
    validateSource?: 'body' | 'query';
  }
) {
  return withErrorHandling(async (request: NextRequest) => {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      let response = new NextResponse(null, { status: 204 });
      response = withCORS(request, response);
      return response;
    }

    // Rate limiting
    if (options?.rateLimit) {
      const rateLimitResponse = await withRateLimit(request, new NextResponse(), options.rateLimit);
      if (rateLimitResponse) {
        return rateLimitResponse;
      }
    }

    // Validation
    let validatedData;
    if (options?.validateSchema) {
      const { data, error } = await validateRequest(
        request,
        options.validateSchema,
        options.validateSource
      );

      if (error) {
        return errorResponse(error, request);
      }

      validatedData = data;
    }

    // Call handler
    let response = await handler(request, validatedData);

    // Apply security headers
    response = withCORS(request, response);
    response = withSecurityHeaders(response);

    return response;
  });
}
