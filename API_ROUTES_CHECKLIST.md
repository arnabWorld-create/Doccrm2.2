# API Routes Migration Checklist

Use this checklist to migrate all API routes to use the new security middleware.

## Routes to Migrate

### Authentication Routes
- [ ] `app/api/auth/login/route.ts` ✅ DONE
- [ ] `app/api/auth/register/route.ts` ✅ DONE
- [ ] `app/api/auth/logout/route.ts` ✅ DONE
- [ ] `app/api/auth/me/route.ts` ✅ DONE

### Patient Routes
- [ ] `app/api/patients/route.ts` ✅ DONE
- [ ] `app/api/patients/[id]/route.ts` (uses requirePermission + raw handlers — medium priority)

### Appointment Routes
- [ ] `app/api/appointments/route.ts` ✅ DONE
- [ ] `app/api/appointments/[id]/route.ts` ✅ DONE

### Medicine Routes
- [ ] `app/api/medicines/route.ts` ✅ DONE

### Clinic Profile Routes
- [ ] `app/api/clinic-profile/route.ts`

### Upload Routes
- [ ] `app/api/upload-logo/route.ts`

### Health Routes
- [ ] `app/api/health/route.ts` ✅ DONE (no auth needed — intentionally public)

### Debug Routes
- [ ] `app/api/debug-user/route.ts` ⚠️ REMOVE IN PRODUCTION

---

## Migration Steps for Each Route

### Step 1: Add Imports
```typescript
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withMiddleware, successResponse } from '@/lib/middleware';
import { ApiErrors } from '@/lib/api-error';
import { logger } from '@/lib/logger';
import { RATE_LIMITS } from '@/lib/rate-limiter';
```

### Step 2: Define Validation Schema
```typescript
const schema = z.object({
  // Define your fields
});
```

### Step 3: Replace Handler
```typescript
// Before:
export async function POST(request: NextRequest) {
  try {
    // ...
  } catch (error) {
    // ...
  }
}

// After:
export const POST = withMiddleware(
  async (request: NextRequest, data) => {
    // ...
    return successResponse(result, 201, request);
  },
  {
    rateLimit: RATE_LIMITS.API,
    validateSchema: schema,
  }
);
```

### Step 4: Update Error Handling
```typescript
// Before:
return NextResponse.json({ error: '...' }, { status: 400 });

// After:
throw ApiErrors.badRequest('...');
```

### Step 5: Add Logging
```typescript
logger.info('Action completed', { context });
```

### Step 6: Test
```bash
npm run dev
# Test the endpoint with curl or Postman
```

---

## Route-by-Route Migration

### `app/api/auth/logout/route.ts`

**Current Status:** ⏳ TODO

**Validation Schema:**
```typescript
// No validation needed - POST with no body
```

**Rate Limit:** `RATE_LIMITS.AUTH`

**Example:**
```typescript
export const POST = withMiddleware(
  async (request: NextRequest) => {
    const response = successResponse({ message: 'Logged out' }, 200, request);
    response.cookies.delete('auth-token');
    return response;
  },
  {
    rateLimit: RATE_LIMITS.AUTH,
  }
);
```

---

### `app/api/auth/me/route.ts`

**Current Status:** ⏳ TODO

**Validation Schema:**
```typescript
// No validation needed - GET request
```

**Rate Limit:** `RATE_LIMITS.API`

**Example:**
```typescript
export const GET = withMiddleware(
  async (request: NextRequest) => {
    const { error, user } = await requireAuth(request);
    if (error) throw error;
    
    return successResponse({ user }, 200, request);
  },
  {
    rateLimit: RATE_LIMITS.API,
  }
);
```

---

### `app/api/patients/[id]/route.ts`

**Current Status:** ⏳ TODO

**Validation Schema:**
```typescript
const updateSchema = z.object({
  name: z.string().min(1).optional(),
  age: z.number().int().min(0).max(150).optional(),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  contact: z.string().optional(),
  address: z.string().optional(),
  bloodGroup: z.string().optional(),
  allergies: z.string().optional(),
  chronicConditions: z.string().optional(),
});

const deleteSchema = z.object({
  id: z.string(),
});
```

**Rate Limit:** `RATE_LIMITS.API` for GET/PUT, `RATE_LIMITS.STRICT` for DELETE

**Example:**
```typescript
// GET
export const GET = withMiddleware(
  async (request: NextRequest) => {
    const { error, user } = await requireAuth(request);
    if (error) throw error;
    
    const id = request.nextUrl.pathname.split('/').pop();
    const patient = await prisma.patient.findUnique({ where: { id } });
    
    if (!patient) {
      throw ApiErrors.notFound('Patient not found');
    }
    
    return successResponse(patient, 200, request);
  },
  { rateLimit: RATE_LIMITS.API }
);

// PUT
export const PUT = withMiddleware(
  async (request: NextRequest, data) => {
    const { error, user } = await requireAuth(request);
    if (error) throw error;
    
    const id = request.nextUrl.pathname.split('/').pop();
    const patient = await prisma.patient.update({
      where: { id },
      data,
    });
    
    logger.info('Patient updated', { patientId: id });
    return successResponse(patient, 200, request);
  },
  {
    rateLimit: RATE_LIMITS.API,
    validateSchema: updateSchema,
  }
);

// DELETE
export const DELETE = withMiddleware(
  async (request: NextRequest) => {
    const { error, user } = await requireAuth(request);
    if (error) throw error;
    
    const id = request.nextUrl.pathname.split('/').pop();
    await prisma.patient.delete({ where: { id } });
    
    logger.info('Patient deleted', { patientId: id });
    return successResponse({ deleted: true }, 200, request);
  },
  { rateLimit: RATE_LIMITS.STRICT }
);
```

---

### `app/api/appointments/route.ts`

**Current Status:** ⏳ TODO

**Validation Schema:**
```typescript
const createSchema = z.object({
  patientId: z.string().optional(),
  tempPatientName: z.string().optional(),
  tempPatientContact: z.string().optional(),
  appointmentDate: z.string().datetime(),
  appointmentTime: z.string(),
  appointmentType: z.enum(['Consultation', 'Follow-up', 'Check-up', 'Emergency']),
  reason: z.string().optional(),
  notes: z.string().optional(),
});
```

**Rate Limit:** `RATE_LIMITS.API`

---

### `app/api/appointments/[id]/route.ts`

**Current Status:** ⏳ TODO

**Validation Schema:**
```typescript
const updateSchema = z.object({
  status: z.enum(['Scheduled', 'Confirmed', 'Completed', 'Cancelled', 'No-Show']).optional(),
  appointmentDate: z.string().datetime().optional(),
  appointmentTime: z.string().optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
});
```

**Rate Limit:** `RATE_LIMITS.API` for GET/PUT, `RATE_LIMITS.STRICT` for DELETE

---

### `app/api/medicines/route.ts`

**Current Status:** ⏳ TODO

**Validation Schema:**
```typescript
const schema = z.object({
  name: z.string().min(1, 'Medicine name is required'),
});
```

**Rate Limit:** `RATE_LIMITS.API`

---

### `app/api/clinic-profile/route.ts`

**Current Status:** ⏳ TODO

**Validation Schema:**
```typescript
const schema = z.object({
  clinicName: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  doctorName: z.string().optional(),
  doctorQualification: z.string().optional(),
  registrationNumber: z.string().optional(),
  specialization: z.string().optional(),
  tagline: z.string().optional(),
});
```

**Rate Limit:** `RATE_LIMITS.STRICT` (sensitive data)

---

### `app/api/upload-logo/route.ts`

**Current Status:** ⏳ TODO

**Validation:** File upload

**Rate Limit:** `RATE_LIMITS.UPLOAD`

**Example:**
```typescript
export const POST = withMiddleware(
  async (request: NextRequest) => {
    const { error, user } = await requireAuth(request);
    if (error) throw error;
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      throw ApiErrors.badRequest('File is required');
    }
    
    if (file.size > 5 * 1024 * 1024) {
      throw ApiErrors.badRequest('File size exceeds 5MB');
    }
    
    const url = await uploadFile(file);
    logger.info('Logo uploaded', { url });
    
    return successResponse({ url }, 201, request);
  },
  { rateLimit: RATE_LIMITS.UPLOAD }
);
```

---

### `app/api/health/route.ts`

**Current Status:** ⏳ TODO

**Validation:** None

**Rate Limit:** `RATE_LIMITS.API`

**Example:**
```typescript
export const GET = withMiddleware(
  async (request: NextRequest) => {
    return successResponse(
      { status: 'ok', timestamp: new Date().toISOString() },
      200,
      request
    );
  },
  { rateLimit: RATE_LIMITS.API }
);
```

---

### `app/api/debug-user/route.ts`

**Current Status:** ⏳ TODO

**Note:** This is a debug route - consider removing in production

**Rate Limit:** `RATE_LIMITS.STRICT`

---

## Testing Checklist

For each migrated route, test:

- [ ] Valid request succeeds
- [ ] Invalid request returns 422 with validation errors
- [ ] Rate limit is enforced (returns 429)
- [ ] Unauthorized request returns 401
- [ ] Forbidden request returns 403
- [ ] Not found returns 404
- [ ] Server error returns 500
- [ ] CORS headers are present
- [ ] Security headers are present
- [ ] Logging works correctly

### Test Commands

```bash
# Test valid request
curl -X POST http://localhost:3000/api/patients \
  -H "Content-Type: application/json" \
  -d '{"name":"John","age":30}'

# Test invalid request
curl -X POST http://localhost:3000/api/patients \
  -H "Content-Type: application/json" \
  -d '{"name":""}'

# Test rate limiting
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test"}'
done

# Test CORS
curl -X OPTIONS http://localhost:3000/api/patients \
  -H "Origin: http://localhost:3001" \
  -v
```

---

## Progress Tracking

### Completed ✅
- [x] `app/api/auth/login/route.ts`
- [x] `app/api/auth/register/route.ts`
- [x] `app/api/patients/route.ts`

### In Progress 🔄
- [ ] (None currently)

### Not Started ⏳
- [ ] `app/api/auth/logout/route.ts`
- [ ] `app/api/auth/me/route.ts`
- [ ] `app/api/patients/[id]/route.ts`
- [ ] `app/api/appointments/route.ts`
- [ ] `app/api/appointments/[id]/route.ts`
- [ ] `app/api/medicines/route.ts`
- [ ] `app/api/clinic-profile/route.ts`
- [ ] `app/api/upload-logo/route.ts`
- [ ] `app/api/health/route.ts`
- [ ] `app/api/debug-user/route.ts`

---

## Notes

- Start with high-traffic routes first
- Test thoroughly after each migration
- Keep old code as reference until migration is complete
- Update tests for each route
- Document any custom validation logic

---

## Support

For help with migration:
1. Check `MIGRATION_GUIDE.md` for detailed examples
2. Review already-migrated routes for patterns
3. Check `SECURITY_AND_RELIABILITY.md` for API reference
4. Review error logs for issues
