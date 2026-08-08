# Multi-Tenant Architecture Specification
## Faith Clinic - Clinic & Doctor Migration System

**Version:** 1.0  
**Status:** 🔴 DESIGN PHASE - NOT IMPLEMENTED  
**Priority:** HIGH  
**Estimated Effort:** 4-6 weeks (proper implementation)

---

## 🎯 Business Requirements

### Problem Statement
Currently, Faith Clinic is a **single-tenant system** where:
- One database = One clinic
- No way to switch between clinics
- No data isolation between doctors
- Cannot migrate data between instances
- Scaling requires separate deployments

### Solution Goals
1. **Multi-Clinic Support**: Multiple clinics in one database with complete data isolation
2. **Multi-Doctor Support**: Multiple doctors per clinic with role-based access
3. **Easy Switching**: Seamless clinic/doctor context switching in UI
4. **Data Migration**: Export/import clinic data between instances
5. **Zero Downtime**: Migrate existing single-tenant data without service interruption

---

## 🏗️ Architecture Design

### Option 1: Row-Level Tenant Isolation (RECOMMENDED)
**Approach:** Add `clinicId` to all tables, use Prisma middleware for automatic filtering

**Pros:**
- ✅ Single database, easier to manage
- ✅ Cost-effective (shared resources)
- ✅ Easier backups (one database)
- ✅ Cross-clinic analytics possible
- ✅ Simpler deployment

**Cons:**
- ⚠️ Risk of data leakage if middleware fails
- ⚠️ Complex queries with multiple joins
- ⚠️ Performance degrades with many tenants

**Best For:** 10-500 clinics

### Option 2: Schema-Per-Tenant
**Approach:** Each clinic gets its own PostgreSQL schema

**Pros:**
- ✅ Better data isolation
- ✅ Easier to backup individual clinics
- ✅ Better performance per clinic

**Cons:**
- ❌ Complex migrations (run on all schemas)
- ❌ Harder to manage at scale
- ❌ Cross-clinic queries difficult

**Best For:** 50-1000 clinics

### Option 3: Database-Per-Tenant
**Approach:** Each clinic gets its own database

**Pros:**
- ✅ Complete isolation
- ✅ Easy to scale horizontally
- ✅ Independent backups

**Cons:**
- ❌ Very expensive
- ❌ Complex connection pooling
- ❌ Difficult to manage
- ❌ No cross-clinic analytics

**Best For:** Enterprise (1000+ clinics)

---

## 📊 Recommended Architecture: Row-Level Isolation

### Database Schema Changes

```prisma
// New models
model Clinic {
  id              String   @id @default(cuid())
  name            String
  subdomain       String   @unique  // e.g., "apollo-clinic"
  domain          String?  @unique  // e.g., "apollo.faithclinic.com"
  
  // Clinic details
  address         String?
  city            String?
  state           String?
  phone           String?
  email           String?
  logo            String?
  
  // Subscription & billing
  subscriptionPlan String  @default("free")
  subscriptionStatus String @default("active")
  trialEndsAt     DateTime?
  
  // Settings
  settings        Json?    // Clinic-specific settings
  features        Json?    // Enabled features
  
  // Timestamps
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  // Relations
  users           User[]
  patients        Patient[]
  appointments    Appointment[]
  invoices        Invoice[]
  payments        Payment[]
  
  @@index([subdomain])
  @@index([subscriptionStatus])
  @@map("clinics")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String
  
  // Multi-clinic support
  clinicId  String
  clinic    Clinic   @relation(fields: [clinicId], references: [id], onDelete: Cascade)
  
  // Role within clinic
  role      String   @default("doctor")  // doctor, admin, staff, receptionist
  
  // Permissions
  permissions Json?  // Granular permissions
  
  // Status
  isActive  Boolean  @default(true)
  lastLogin DateTime?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([clinicId])
  @@index([email, clinicId])
  @@map("users")
}

// Update existing models - ADD clinicId to ALL
model Patient {
  id                String   @id @default(cuid())
  clinicId          String   // NEW
  clinic            Clinic   @relation(fields: [clinicId], references: [id], onDelete: Cascade)
  
  patientId         String
  name              String
  // ... rest of fields
  
  @@unique([clinicId, patientId])  // Unique within clinic
  @@index([clinicId])
  @@map("patients")
}

model Visit {
  id             String   @id @default(cuid())
  clinicId       String   // NEW - for direct queries
  patientId      String
  // ... rest of fields
  
  @@index([clinicId])
  @@index([clinicId, patientId])
  @@map("visits")
}

// Repeat for: Appointment, Invoice, Payment, etc.
```

### Prisma Middleware for Automatic Filtering

```typescript
// lib/prisma-tenant.ts
import { PrismaClient } from '@prisma/client';

export function createTenantPrisma(clinicId: string) {
  const prisma = new PrismaClient();
  
  // Automatically add clinicId to all queries
  prisma.$use(async (params, next) => {
    // Models that need tenant filtering
    const tenantModels = [
      'patient', 'visit', 'appointment', 'invoice', 
      'payment', 'medication', 'customMedicine'
    ];
    
    if (tenantModels.includes(params.model?.toLowerCase() || '')) {
      // Add clinicId to WHERE clause
      if (params.action === 'findMany' || params.action === 'findFirst') {
        params.args.where = {
          ...params.args.where,
          clinicId,
        };
      }
      
      // Add clinicId to CREATE
      if (params.action === 'create') {
        params.args.data = {
          ...params.args.data,
          clinicId,
        };
      }
      
      // Add clinicId to UPDATE/DELETE WHERE
      if (params.action === 'update' || params.action === 'delete') {
        params.args.where = {
          ...params.args.where,
          clinicId,
        };
      }
    }
    
    return next(params);
  });
  
  return prisma;
}
```

### Context Management

```typescript
// lib/clinic-context.ts
import { cookies } from 'next/headers';
import { verifyToken } from './auth';
import prisma from './prisma';

export async function getClinicContext() {
  const token = (await cookies()).get('auth-token')?.value;
  if (!token) return null;
  
  const decoded = verifyToken(token);
  if (!decoded) return null;
  
  // Get user with clinic
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    include: { clinic: true },
  });
  
  if (!user || !user.clinic) return null;
  
  return {
    userId: user.id,
    clinicId: user.clinicId,
    clinic: user.clinic,
    role: user.role,
    permissions: user.permissions,
  };
}

// Middleware for API routes
export async function requireClinicContext(request: NextRequest) {
  const context = await getClinicContext();
  
  if (!context) {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized - No clinic context' },
        { status: 401 }
      ),
      context: null,
    };
  }
  
  return { error: null, context };
}
```

---

## 🔄 Migration Strategy

### Phase 1: Schema Migration (Zero Downtime)

```sql
-- Step 1: Add Clinic table
CREATE TABLE clinics (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE NOT NULL,
  -- ... other fields
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Step 2: Create default clinic for existing data
INSERT INTO clinics (id, name, subdomain, subscription_status)
VALUES ('default-clinic-id', 'Default Clinic', 'default', 'active');

-- Step 3: Add clinicId to users (nullable first)
ALTER TABLE users ADD COLUMN clinic_id TEXT;
ALTER TABLE users ADD CONSTRAINT fk_users_clinic 
  FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

-- Step 4: Migrate existing users to default clinic
UPDATE users SET clinic_id = 'default-clinic-id' WHERE clinic_id IS NULL;

-- Step 5: Make clinicId NOT NULL
ALTER TABLE users ALTER COLUMN clinic_id SET NOT NULL;

-- Step 6: Repeat for all tables (patients, visits, appointments, etc.)
-- Add column -> Migrate data -> Make NOT NULL -> Add indexes
```

### Phase 2: Data Migration Script

```typescript
// scripts/migrate-to-multi-tenant.ts
import prisma from '../lib/prisma';

async function migrateToMultiTenant() {
  console.log('🚀 Starting multi-tenant migration...');
  
  // 1. Create default clinic
  const defaultClinic = await prisma.clinic.upsert({
    where: { subdomain: 'default' },
    update: {},
    create: {
      id: 'default-clinic-id',
      name: 'Default Clinic',
      subdomain: 'default',
      subscriptionStatus: 'active',
    },
  });
  
  console.log('✅ Default clinic created');
  
  // 2. Migrate users
  const usersUpdated = await prisma.user.updateMany({
    where: { clinicId: null },
    data: { clinicId: defaultClinic.id },
  });
  
  console.log(`✅ Migrated ${usersUpdated.count} users`);
  
  // 3. Migrate patients
  const patientsUpdated = await prisma.patient.updateMany({
    where: { clinicId: null },
    data: { clinicId: defaultClinic.id },
  });
  
  console.log(`✅ Migrated ${patientsUpdated.count} patients`);
  
  // 4. Migrate visits, appointments, etc.
  // ... repeat for all tables
  
  console.log('🎉 Migration complete!');
}

migrateToMultiTenant()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

---

## 🎨 UI/UX Changes

### 1. Clinic Switcher Component

```typescript
// components/ClinicSwitcher.tsx
'use client';

import { useState, useEffect } from 'react';
import { Building2, Check } from 'lucide-react';

export function ClinicSwitcher() {
  const [clinics, setClinics] = useState([]);
  const [currentClinic, setCurrentClinic] = useState(null);
  
  const switchClinic = async (clinicId: string) => {
    await fetch('/api/auth/switch-clinic', {
      method: 'POST',
      body: JSON.stringify({ clinicId }),
    });
    window.location.reload();
  };
  
  return (
    <div className="relative">
      <button className="flex items-center gap-2 px-4 py-2 rounded-lg border">
        <Building2 className="w-4 h-4" />
        <span>{currentClinic?.name}</span>
      </button>
      
      {/* Dropdown with clinic list */}
    </div>
  );
}
```

### 2. Updated Navbar

```typescript
// Add to Navbar.tsx
<ClinicSwitcher />
```

### 3. Onboarding Flow

```
1. User signs up
2. Create clinic (name, subdomain, details)
3. Set up clinic profile
4. Invite team members
5. Start using system
```

---

## 🔐 Security Considerations

### 1. Row-Level Security (RLS)
- ✅ Prisma middleware enforces clinicId
- ✅ All queries automatically filtered
- ✅ Cannot access other clinic's data

### 2. API Route Protection
```typescript
// Every API route must:
const { error, context } = await requireClinicContext(request);
if (error) return error;

// Use context.clinicId for all queries
```

### 3. Subdomain Isolation (Optional)
```
apollo-clinic.Faith Clinic.com -> Clinic ID: apollo-clinic
fortis-clinic.faithclinic.com -> Clinic ID: fortis-clinic
```

---

## 📦 Migration Features

### Export Clinic Data
```typescript
// app/api/clinic/export/route.ts
export async function GET(request: NextRequest) {
  const { context } = await requireClinicContext(request);
  
  // Export all clinic data as JSON
  const data = {
    clinic: await prisma.clinic.findUnique({ where: { id: context.clinicId } }),
    patients: await prisma.patient.findMany({ where: { clinicId: context.clinicId } }),
    visits: await prisma.visit.findMany({ where: { clinicId: context.clinicId } }),
    // ... all related data
  };
  
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="clinic-${context.clinicId}-${Date.now()}.json"`,
    },
  });
}
```

### Import Clinic Data
```typescript
// app/api/clinic/import/route.ts
export async function POST(request: NextRequest) {
  const { context } = await requireClinicContext(request);
  const data = await request.json();
  
  // Validate and import data
  // ... transaction-based import
}
```

---

## 📈 Performance Optimization

### 1. Indexes
```sql
CREATE INDEX idx_patients_clinic_id ON patients(clinic_id);
CREATE INDEX idx_visits_clinic_id ON visits(clinic_id);
CREATE INDEX idx_appointments_clinic_id ON appointments(clinic_id);
-- ... for all tables
```

### 2. Connection Pooling
```typescript
// Separate connection pool per clinic (for large clinics)
const clinicPools = new Map<string, PrismaClient>();

export function getClinicPrisma(clinicId: string) {
  if (!clinicPools.has(clinicId)) {
    clinicPools.set(clinicId, createTenantPrisma(clinicId));
  }
  return clinicPools.get(clinicId)!;
}
```

---

## 🧪 Testing Strategy

### 1. Unit Tests
- Test Prisma middleware
- Test context management
- Test data isolation

### 2. Integration Tests
- Create 2 clinics
- Verify data isolation
- Test switching
- Test migration

### 3. Load Tests
- 100 clinics
- 1000 patients per clinic
- Concurrent requests

---

## 📋 Implementation Checklist

### Phase 1: Foundation (Week 1-2)
- [ ] Design database schema
- [ ] Create Prisma models
- [ ] Write migration scripts
- [ ] Test on staging database

### Phase 2: Core Features (Week 2-3)
- [ ] Implement Prisma middleware
- [ ] Create context management
- [ ] Update all API routes
- [ ] Add clinic switcher UI

### Phase 3: Migration (Week 3-4)
- [ ] Write data migration script
- [ ] Test migration on copy of production
- [ ] Create rollback plan
- [ ] Execute migration

### Phase 4: Testing (Week 4-5)
- [ ] Unit tests
- [ ] Integration tests
- [ ] Load tests
- [ ] Security audit

### Phase 5: Deployment (Week 5-6)
- [ ] Deploy to staging
- [ ] User acceptance testing
- [ ] Deploy to production
- [ ] Monitor for issues

---

## 💰 Cost Implications

### Database Size
- Current: ~500MB per clinic
- With 100 clinics: ~50GB
- Supabase Pro: $25/month (8GB included, $0.125/GB after)
- Estimated: $30-50/month for 100 clinics

### Performance
- Need better connection pooling
- Consider read replicas for analytics
- Estimated: +$50/month for optimization

---

## 🚨 Risks & Mitigation

### Risk 1: Data Leakage
**Mitigation:** 
- Comprehensive testing
- Security audit
- Automated tests for every API route

### Risk 2: Performance Degradation
**Mitigation:**
- Proper indexing
- Connection pooling
- Caching layer

### Risk 3: Migration Failure
**Mitigation:**
- Test on staging first
- Have rollback plan
- Backup before migration

---

## 🎯 Success Criteria

1. ✅ Zero data loss during migration
2. ✅ Complete data isolation between clinics
3. ✅ <100ms overhead for tenant filtering
4. ✅ Easy clinic switching in UI
5. ✅ Export/import works flawlessly

---

## 📚 Next Steps

1. **Review this spec** - Discuss and refine
2. **Approve architecture** - Choose row-level vs schema-level
3. **Create detailed tasks** - Break down into tickets
4. **Start implementation** - Begin with Phase 1

---

**Questions to Discuss:**
1. Do you want subdomain-based isolation (apollo.faithclinic.com)?
2. Should doctors be able to work across multiple clinics?
3. What's the expected number of clinics in 1 year?
4. Do you need cross-clinic analytics?
5. Should we support clinic-to-clinic patient transfers?
