# Data Backup & Restore System Specification
## Faith Clinic - Enterprise-Grade Disaster Recovery

**Version:** 1.0  
**Status:** 🔴 DESIGN PHASE - NOT IMPLEMENTED  
**Priority:** CRITICAL  
**Estimated Effort:** 3-4 weeks (proper implementation)

---

## 🎯 Business Requirements

### Problem Statement
Currently, Faith Clinic has:
- ❌ No automated backups
- ❌ No disaster recovery plan
- ❌ No point-in-time restore
- ❌ No data export for compliance
- ❌ Risk of complete data loss

### Solution Goals
1. **Automated Backups**: Daily full backups + hourly incremental
2. **Point-in-Time Restore**: Restore to any point in last 30 days
3. **Disaster Recovery**: <15 minute RTO (Recovery Time Objective)
4. **Data Export**: HIPAA-compliant data exports
5. **Audit Trail**: Complete backup/restore history

---

## 🏗️ Architecture Design

### Three-Tier Backup Strategy

```
┌─────────────────────────────────────────────────────────┐
│                    BACKUP TIERS                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Tier 1: Real-Time Replication (PostgreSQL WAL)        │
│  ├─ Continuous replication to standby                  │
│  ├─ <1 minute data loss (RPO)                          │
│  └─ Automatic failover                                 │
│                                                         │
│  Tier 2: Automated Snapshots (Daily + Hourly)          │
│  ├─ Full backup: Daily at 2 AM                         │
│  ├─ Incremental: Every hour                            │
│  ├─ Retention: 30 days                                 │
│  └─ Stored in S3/Supabase Storage                      │
│                                                         │
│  Tier 3: Manual Exports (On-Demand)                    │
│  ├─ Clinic-specific exports                            │
│  ├─ Encrypted JSON/SQL format                          │
│  ├─ Compliance-ready (HIPAA, GDPR)                     │
│  └─ User-initiated downloads                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Database Schema

### Backup Metadata Tracking

```prisma
model Backup {
  id              String   @id @default(cuid())
  
  // Backup details
  type            String   // "full", "incremental", "manual"
  status          String   // "pending", "in_progress", "completed", "failed"
  
  // Scope
  clinicId        String?  // null = full database, else specific clinic
  clinic          Clinic?  @relation(fields: [clinicId], references: [id])
  
  // Storage
  storageProvider String   // "s3", "supabase", "local"
  storagePath     String   // S3 key or file path
  fileSize        BigInt   // bytes
  
  // Metadata
  recordCounts    Json     // { patients: 100, visits: 500, ... }
  checksum        String   // SHA-256 hash for integrity
  encrypted       Boolean  @default(true)
  
  // Timing
  startedAt       DateTime
  completedAt     DateTime?
  duration        Int?     // seconds
  
  // Initiated by
  userId          String?
  user            User?    @relation(fields: [userId], references: [id])
  
  // Restore info
  restoredAt      DateTime?
  restoredBy      String?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([clinicId])
  @@index([type, status])
  @@index([createdAt])
  @@map("backups")
}

model BackupSchedule {
  id              String   @id @default(cuid())
  
  // Schedule
  name            String
  type            String   // "full", "incremental"
  frequency       String   // "hourly", "daily", "weekly"
  time            String?  // "02:00" for daily
  
  // Scope
  clinicId        String?  // null = all clinics
  clinic          Clinic?  @relation(fields: [clinicId], references: [id])
  
  // Retention
  retentionDays   Int      @default(30)
  
  // Status
  enabled         Boolean  @default(true)
  lastRunAt       DateTime?
  nextRunAt       DateTime?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([enabled, nextRunAt])
  @@map("backup_schedules")
}

model RestoreLog {
  id              String   @id @default(cuid())
  
  // Restore details
  backupId        String
  backup          Backup   @relation(fields: [backupId], references: [id])
  
  status          String   // "pending", "in_progress", "completed", "failed"
  
  // Target
  targetClinicId  String?  // Where to restore
  
  // Options
  options         Json     // { overwrite: true, tables: [...] }
  
  // Results
  recordsRestored Json?    // { patients: 100, visits: 500, ... }
  errors          Json?    // Any errors encountered
  
  // Timing
  startedAt       DateTime
  completedAt     DateTime?
  duration        Int?     // seconds
  
  // Initiated by
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  
  createdAt       DateTime @default(now())
  
  @@index([backupId])
  @@index([status])
  @@map("restore_logs")
}
```

---

## 🔧 Implementation

### 1. Backup Service

```typescript
// lib/backup-service.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createGzip } from 'zlib';
import { createCipheriv, randomBytes } from 'crypto';
import prisma from './prisma';

export class BackupService {
  private s3Client: S3Client;
  private encryptionKey: Buffer;
  
  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
    
    // Encryption key from environment (32 bytes for AES-256)
    this.encryptionKey = Buffer.from(process.env.BACKUP_ENCRYPTION_KEY!, 'hex');
  }
  
  /**
   * Create a full backup of entire database or specific clinic
   */
  async createFullBackup(clinicId?: string): Promise<string> {
    const backupId = `backup-${Date.now()}`;
    
    // Create backup record
    const backup = await prisma.backup.create({
      data: {
        type: 'full',
        status: 'in_progress',
        clinicId,
        storageProvider: 's3',
        storagePath: `backups/${backupId}.json.gz.enc`,
        startedAt: new Date(),
        encrypted: true,
      },
    });
    
    try {
      // 1. Export data
      const data = await this.exportData(clinicId);
      
      // 2. Compress
      const compressed = await this.compress(JSON.stringify(data));
      
      // 3. Encrypt
      const encrypted = await this.encrypt(compressed);
      
      // 4. Upload to S3
      await this.uploadToS3(backup.storagePath, encrypted);
      
      // 5. Calculate checksum
      const checksum = this.calculateChecksum(encrypted);
      
      // 6. Update backup record
      await prisma.backup.update({
        where: { id: backup.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          fileSize: BigInt(encrypted.length),
          checksum,
          recordCounts: this.countRecords(data),
          duration: Math.floor((Date.now() - backup.startedAt.getTime()) / 1000),
        },
      });
      
      return backup.id;
    } catch (error) {
      // Mark as failed
      await prisma.backup.update({
        where: { id: backup.id },
        data: {
          status: 'failed',
          completedAt: new Date(),
        },
      });
      
      throw error;
    }
  }
  
  /**
   * Export all data for a clinic (or entire database)
   */
  private async exportData(clinicId?: string) {
    const where = clinicId ? { clinicId } : {};
    
    // Export all tables
    const [
      clinic,
      patients,
      visits,
      medications,
      appointments,
      invoices,
      payments,
      customMedicines,
    ] = await Promise.all([
      clinicId ? prisma.clinic.findUnique({ where: { id: clinicId } }) : null,
      prisma.patient.findMany({ where, include: { visits: true } }),
      prisma.visit.findMany({ where, include: { medications: true } }),
      prisma.medication.findMany({ where }),
      prisma.appointment.findMany({ where, include: { patient: true } }),
      (prisma as any).invoice?.findMany({ where, include: { items: true, payments: true } }) || [],
      (prisma as any).payment?.findMany({ where }) || [],
      prisma.customMedicine.findMany(),
    ]);
    
    return {
      version: '1.0',
      timestamp: new Date().toISOString(),
      clinicId,
      data: {
        clinic,
        patients,
        visits,
        medications,
        appointments,
        invoices,
        payments,
        customMedicines,
      },
    };
  }
  
  /**
   * Compress data using gzip
   */
  private async compress(data: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const gzip = createGzip();
      const chunks: Buffer[] = [];
      
      gzip.on('data', (chunk) => chunks.push(chunk));
      gzip.on('end', () => resolve(Buffer.concat(chunks)));
      gzip.on('error', reject);
      
      gzip.write(data);
      gzip.end();
    });
  }
  
  /**
   * Encrypt data using AES-256-GCM
   */
  private async encrypt(data: Buffer): Promise<Buffer> {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(data),
      cipher.final(),
    ]);
    
    const authTag = cipher.getAuthTag();
    
    // Return: IV (16 bytes) + Auth Tag (16 bytes) + Encrypted Data
    return Buffer.concat([iv, authTag, encrypted]);
  }
  
  /**
   * Upload to S3
   */
  private async uploadToS3(key: string, data: Buffer): Promise<void> {
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: key,
        Body: data,
        ServerSideEncryption: 'AES256',
      })
    );
  }
  
  /**
   * Calculate SHA-256 checksum
   */
  private calculateChecksum(data: Buffer): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(data).digest('hex');
  }
  
  /**
   * Count records in backup
   */
  private countRecords(data: any): any {
    return {
      patients: data.data.patients?.length || 0,
      visits: data.data.visits?.length || 0,
      medications: data.data.medications?.length || 0,
      appointments: data.data.appointments?.length || 0,
      invoices: data.data.invoices?.length || 0,
      payments: data.data.payments?.length || 0,
    };
  }
}
```

### 2. Restore Service

```typescript
// lib/restore-service.ts
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { createGunzip } from 'zlib';
import { createDecipheriv } from 'crypto';
import prisma from './prisma';

export class RestoreService {
  private s3Client: S3Client;
  private encryptionKey: Buffer;
  
  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
    
    this.encryptionKey = Buffer.from(process.env.BACKUP_ENCRYPTION_KEY!, 'hex');
  }
  
  /**
   * Restore from backup
   */
  async restore(backupId: string, options: RestoreOptions): Promise<void> {
    // Create restore log
    const restoreLog = await prisma.restoreLog.create({
      data: {
        backupId,
        status: 'in_progress',
        targetClinicId: options.targetClinicId,
        options: options as any,
        startedAt: new Date(),
        userId: options.userId,
      },
    });
    
    try {
      // 1. Get backup metadata
      const backup = await prisma.backup.findUnique({
        where: { id: backupId },
      });
      
      if (!backup) {
        throw new Error('Backup not found');
      }
      
      // 2. Download from S3
      const encrypted = await this.downloadFromS3(backup.storagePath);
      
      // 3. Verify checksum
      if (!this.verifyChecksum(encrypted, backup.checksum)) {
        throw new Error('Backup integrity check failed');
      }
      
      // 4. Decrypt
      const compressed = await this.decrypt(encrypted);
      
      // 5. Decompress
      const json = await this.decompress(compressed);
      
      // 6. Parse data
      const data = JSON.parse(json);
      
      // 7. Restore data
      const recordsRestored = await this.restoreData(data, options);
      
      // 8. Update restore log
      await prisma.restoreLog.update({
        where: { id: restoreLog.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          recordsRestored: recordsRestored as any,
          duration: Math.floor((Date.now() - restoreLog.startedAt.getTime()) / 1000),
        },
      });
      
      // 9. Update backup record
      await prisma.backup.update({
        where: { id: backupId },
        data: {
          restoredAt: new Date(),
          restoredBy: options.userId,
        },
      });
    } catch (error) {
      // Mark as failed
      await prisma.restoreLog.update({
        where: { id: restoreLog.id },
        data: {
          status: 'failed',
          completedAt: new Date(),
          errors: { message: (error as Error).message } as any,
        },
      });
      
      throw error;
    }
  }
  
  /**
   * Restore data to database
   */
  private async restoreData(data: any, options: RestoreOptions): Promise<any> {
    const counts = {
      patients: 0,
      visits: 0,
      medications: 0,
      appointments: 0,
      invoices: 0,
      payments: 0,
    };
    
    // Use transaction for atomicity
    await prisma.$transaction(async (tx) => {
      // If overwrite, delete existing data
      if (options.overwrite && options.targetClinicId) {
        await tx.patient.deleteMany({
          where: { clinicId: options.targetClinicId },
        });
        // Cascading deletes will handle visits, medications, etc.
      }
      
      // Restore patients
      for (const patient of data.data.patients || []) {
        const { id, visits, ...patientData } = patient;
        
        await tx.patient.create({
          data: {
            ...patientData,
            clinicId: options.targetClinicId || patientData.clinicId,
          },
        });
        
        counts.patients++;
      }
      
      // Restore visits
      for (const visit of data.data.visits || []) {
        const { id, medications, ...visitData } = visit;
        
        await tx.visit.create({
          data: {
            ...visitData,
            clinicId: options.targetClinicId || visitData.clinicId,
          },
        });
        
        counts.visits++;
      }
      
      // Restore medications
      for (const medication of data.data.medications || []) {
        const { id, ...medicationData } = medication;
        
        await tx.medication.create({
          data: medicationData,
        });
        
        counts.medications++;
      }
      
      // Restore appointments, invoices, payments...
      // Similar pattern
    });
    
    return counts;
  }
  
  // Download, decrypt, decompress methods similar to BackupService
}

interface RestoreOptions {
  targetClinicId?: string;
  overwrite: boolean;
  tables?: string[];
  userId: string;
}
```

### 3. Scheduled Backup Cron Job

```typescript
// app/api/cron/backup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { BackupService } from '@/lib/backup-service';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const backupService = new BackupService();
    
    // Get all active backup schedules
    const schedules = await prisma.backupSchedule.findMany({
      where: {
        enabled: true,
        nextRunAt: {
          lte: new Date(),
        },
      },
    });
    
    const results = [];
    
    for (const schedule of schedules) {
      try {
        // Create backup
        const backupId = await backupService.createFullBackup(schedule.clinicId || undefined);
        
        // Update schedule
        const nextRun = calculateNextRun(schedule.frequency, schedule.time);
        await prisma.backupSchedule.update({
          where: { id: schedule.id },
          data: {
            lastRunAt: new Date(),
            nextRunAt: nextRun,
          },
        });
        
        results.push({
          scheduleId: schedule.id,
          backupId,
          status: 'success',
        });
      } catch (error) {
        results.push({
          scheduleId: schedule.id,
          status: 'failed',
          error: (error as Error).message,
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

function calculateNextRun(frequency: string, time?: string): Date {
  const now = new Date();
  
  switch (frequency) {
    case 'hourly':
      return new Date(now.getTime() + 60 * 60 * 1000);
    
    case 'daily':
      const [hours, minutes] = (time || '02:00').split(':').map(Number);
      const next = new Date(now);
      next.setHours(hours, minutes, 0, 0);
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      return next;
    
    case 'weekly':
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      return nextWeek;
    
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }
}
```

### 4. Backup Management UI

```typescript
// app/settings/backups/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Download, Upload, Clock, Database } from 'lucide-react';

export default function BackupsPage() {
  const [backups, setBackups] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  
  const createBackup = async () => {
    setIsCreating(true);
    try {
      const response = await fetch('/api/backups', {
        method: 'POST',
      });
      const data = await response.json();
      // Refresh list
      fetchBackups();
    } catch (error) {
      console.error('Failed to create backup:', error);
    } finally {
      setIsCreating(false);
    }
  };
  
  const downloadBackup = async (backupId: string) => {
    const response = await fetch(`/api/backups/${backupId}/download`);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-${backupId}.json.gz.enc`;
    a.click();
  };
  
  const restoreBackup = async (backupId: string) => {
    if (!confirm('Are you sure? This will overwrite current data.')) {
      return;
    }
    
    try {
      await fetch(`/api/backups/${backupId}/restore`, {
        method: 'POST',
      });
      alert('Restore completed successfully');
    } catch (error) {
      alert('Restore failed: ' + (error as Error).message);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Backups & Restore</h1>
        <button
          onClick={createBackup}
          disabled={isCreating}
          className="px-4 py-2 bg-brand-teal text-white rounded-lg"
        >
          {isCreating ? 'Creating...' : 'Create Backup'}
        </button>
      </div>
      
      {/* Backup list */}
      <div className="space-y-4">
        {backups.map((backup: any) => (
          <div key={backup.id} className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{backup.type} Backup</h3>
                <p className="text-sm text-gray-600">
                  {new Date(backup.createdAt).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">
                  Size: {(Number(backup.fileSize) / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => downloadBackup(backup.id)}
                  className="px-3 py-2 bg-blue-600 text-white rounded"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => restoreBackup(backup.id)}
                  className="px-3 py-2 bg-green-600 text-white rounded"
                >
                  <Upload className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 🔐 Security & Compliance

### 1. Encryption
- ✅ AES-256-GCM encryption
- ✅ Unique IV per backup
- ✅ Encrypted at rest (S3 SSE)
- ✅ Encrypted in transit (HTTPS)

### 2. Access Control
- ✅ Only admins can create/restore backups
- ✅ Audit trail for all operations
- ✅ Signed URLs for downloads (expire in 1 hour)

### 3. HIPAA Compliance
- ✅ Encrypted backups
- ✅ Access logs
- ✅ Retention policies
- ✅ Secure deletion

---

## 📋 Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] Design database schema
- [ ] Set up S3 bucket
- [ ] Implement encryption/decryption
- [ ] Write backup service

### Phase 2: Automation (Week 2)
- [ ] Create cron job
- [ ] Implement scheduling
- [ ] Set up monitoring
- [ ] Test automated backups

### Phase 3: Restore (Week 2-3)
- [ ] Implement restore service
- [ ] Add restore UI
- [ ] Test restore process
- [ ] Create rollback procedures

### Phase 4: UI & Testing (Week 3-4)
- [ ] Build backup management UI
- [ ] Add download functionality
- [ ] Integration tests
- [ ] Load tests

---

## 💰 Cost Estimate

### Storage (S3)
- 100 clinics × 500MB/clinic = 50GB
- S3 Standard: $0.023/GB/month = $1.15/month
- With 30-day retention: ~$35/month

### Bandwidth
- Daily backups: 50GB/day
- S3 PUT: $0.005/1000 requests = negligible
- Downloads: Rare, ~$0.09/GB

### Total: ~$40-50/month for 100 clinics

---

## 🎯 Success Criteria

1. ✅ Automated daily backups
2. ✅ <15 minute restore time
3. ✅ Zero data loss in restore
4. ✅ Encrypted backups
5. ✅ Easy-to-use UI

---

**Ready to implement?** Let's discuss and refine!
