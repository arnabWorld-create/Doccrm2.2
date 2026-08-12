/**
 * Role-Based Access Control (RBAC) utilities
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from './api-auth';
import { ApiErrors } from './api-error';

export type UserRole = 'doctor' | 'admin' | 'staff';

export interface Permission {
  resource: string;
  action: string;
}

// Define role permissions
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  doctor: [
    { resource: 'patients', action: 'read' },
    { resource: 'patients', action: 'write' },
    { resource: 'patients', action: 'delete' },
    { resource: 'visits', action: 'read' },
    { resource: 'visits', action: 'write' },
    { resource: 'visits', action: 'delete' },
    { resource: 'appointments', action: 'read' },
    { resource: 'appointments', action: 'write' },
    { resource: 'appointments', action: 'delete' },
    { resource: 'reports', action: 'read' },
    { resource: 'reports', action: 'write' },
    { resource: 'analytics', action: 'read' },
    { resource: 'settings', action: 'read' },
    { resource: 'settings', action: 'write' },
    { resource: 'payments', action: 'read' },
    { resource: 'payments', action: 'write' },
    { resource: 'invoices', action: 'read' },
    { resource: 'invoices', action: 'write' },
    { resource: 'settings', action: 'read' },
  ],
  admin: [
    { resource: '*', action: '*' }, // Full access
  ],
  staff: [
    { resource: 'patients', action: 'read' },
    { resource: 'patients', action: 'write' },
    { resource: 'visits', action: 'read' },
    { resource: 'visits', action: 'write' },
    { resource: 'appointments', action: 'read' },
    { resource: 'appointments', action: 'write' },
    { resource: 'payments', action: 'read' },
    { resource: 'payments', action: 'write' },
    { resource: 'invoices', action: 'read' },
    { resource: 'invoices', action: 'write' },
  ],
};

/**
 * Check if a role has permission for a resource and action
 */
export function hasPermission(
  role: UserRole,
  resource: string,
  action: string
): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];

  // Admin has all permissions
  if (permissions.some(p => p.resource === '*' && p.action === '*')) {
    return true;
  }

  // Check for exact match
  if (permissions.some(p => p.resource === resource && p.action === action)) {
    return true;
  }

  // Check for wildcard resource
  if (permissions.some(p => p.resource === '*' && p.action === action)) {
    return true;
  }

  // Check for wildcard action
  if (permissions.some(p => p.resource === resource && p.action === '*')) {
    return true;
  }

  return false;
}

/**
 * Require authentication and specific role(s)
 * PERF FIX: reuses the user already fetched by requireAuth — no second DB query.
 */
export async function requireRole(
  request: NextRequest,
  allowedRoles: UserRole[]
): Promise<{ error: NextResponse | null; user: any }> {
  // requireAuth now returns the full user (id, email, name, role, isActive)
  const { error: authError, user: authUser } = await requireAuth(request);
  if (authError || !authUser) {
    return { error: authError, user: null };
  }

  // No second DB query needed — role is already on authUser
  const userRole = authUser.role as UserRole;
  if (!allowedRoles.includes(userRole)) {
    return {
      error: NextResponse.json(
        {
          error: 'Forbidden',
          message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`,
        },
        { status: 403 }
      ),
      user: null,
    };
  }

  return {
    error: null,
    user: {
      id: authUser.userId,
      email: authUser.email,
      name: authUser.name,
      role: authUser.role,
      isActive: authUser.isActive,
    },
  };
}

/**
 * Require specific permission
 * PERF FIX: reuses the user already fetched by requireAuth — no second DB query.
 */
export async function requirePermission(
  request: NextRequest,
  resource: string,
  action: string
): Promise<{ error: NextResponse | null; user: any }> {
  // requireAuth now returns the full user (id, email, name, role, isActive)
  const { error: authError, user: authUser } = await requireAuth(request);
  if (authError || !authUser) {
    return { error: authError, user: null };
  }

  // No second DB query needed — role is already on authUser
  const userRole = authUser.role as UserRole;
  if (!hasPermission(userRole, resource, action)) {
    return {
      error: NextResponse.json(
        {
          error: 'Forbidden',
          message: `You don't have permission to ${action} ${resource}`,
        },
        { status: 403 }
      ),
      user: null,
    };
  }

  return {
    error: null,
    user: {
      id: authUser.userId,
      email: authUser.email,
      name: authUser.name,
      role: authUser.role,
      isActive: authUser.isActive,
    },
  };
}

/**
 * Middleware helper for role-based route protection
 */
export function withRole(allowedRoles: UserRole[]) {
  return async (request: NextRequest) => {
    const { error, user } = await requireRole(request, allowedRoles);
    if (error) {
      throw ApiErrors.forbidden(error.status === 403 ? 'Insufficient permissions' : 'Unauthorized');
    }
    return user;
  };
}

/**
 * Middleware helper for permission-based route protection
 */
export function withPermission(resource: string, action: string) {
  return async (request: NextRequest) => {
    const { error, user } = await requirePermission(request, resource, action);
    if (error) {
      throw ApiErrors.forbidden(error.status === 403 ? 'Insufficient permissions' : 'Unauthorized');
    }
    return user;
  };
}




