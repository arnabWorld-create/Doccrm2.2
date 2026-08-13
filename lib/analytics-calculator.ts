import prisma from './prisma';
import { logger } from './logger';

// ---------------------------------------------------------------------------
// ARCHITECTURE: Per-patient cache rows
//
// OLD approach: collect ALL patients into one JS array → stringify → write
//   one giant JSON blob (~20–50 MB at 2,000 patients) into analytics_cache.
//   Problem: OOM on large imports, Vercel timeout on cron, 50 MB parse on
//   every analytics page load.
//
// NEW approach: upsert one row per patient into patient_analytics_cache.
//   The cron processes patients in batches of BATCH_SIZE and writes each
//   batch immediately — memory stays flat at O(batch) not O(total).
//   The API reads paginated rows directly from the table with a simple
//   ORDER BY + LIMIT — no in-memory sort of all patients.
// ---------------------------------------------------------------------------

const BATCH_SIZE = 50;

// Shape of one computed patient row (matches PatientAnalyticsCache columns)
interface PatientCacheRow {
  patientId: string;           // Patient.id (PK in patients table)
  patientDisplayId: string;    // e.g. "FC-001"
  name: string;
  contact: string | null;
  totalVisits: number;
  totalFeesGenerated: number;
  averageFeePerVisit: number;
  firstVisitDate: Date | null;
  lastVisitDate: Date | null;
  visitFrequency: 'High' | 'Medium' | 'Low';
  paymentMethods: string;   // JSON
  monthlyVisits: string;    // JSON
  recentVisits: string;     // JSON
}

// ---------------------------------------------------------------------------
// Fetch one batch of patients with their visits and invoices
// ---------------------------------------------------------------------------
async function fetchBatch(cursor?: string) {
  return prisma.patient.findMany({
    take: BATCH_SIZE,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { id: 'asc' },
    select: {
      id: true,
      patientId: true,
      name: true,
      contact: true,
      visits: {
        orderBy: { visitDate: 'desc' },
        select: {
          id: true,
          visitDate: true,
          visitType: true,
          paidBy: true,
          fees: { select: { total: true } },
        },
      },
      invoices: {
        select: { amount: true, status: true },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Compute analytics for a single patient — pure CPU, no DB calls
// ---------------------------------------------------------------------------
function computePatientRow(
  patient: Awaited<ReturnType<typeof fetchBatch>>[number]
): PatientCacheRow | null {
  const { visits, invoices } = patient;

  // Skip patients with no visits — they have no meaningful analytics
  if (visits.length === 0) return null;

  // --- Fees ----------------------------------------------------------------
  let totalFeesFromVisits = 0;
  const paymentMethodCounts: Record<string, number> = {};

  visits.forEach((visit) => {
    totalFeesFromVisits += visit.fees.reduce((sum, fee) => sum + fee.total, 0);
    if (visit.paidBy) {
      paymentMethodCounts[visit.paidBy] = (paymentMethodCounts[visit.paidBy] || 0) + 1;
    }
  });

  const totalFeesFromInvoices = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.amount, 0);

  const totalFeesGenerated = Math.max(totalFeesFromVisits, totalFeesFromInvoices);

  // --- Visit frequency -----------------------------------------------------
  const visitTimes = visits.map((v) => new Date(v.visitDate).getTime());
  const firstVisit = new Date(Math.min(...visitTimes));
  const lastVisit  = new Date(Math.max(...visitTimes));
  const monthsDiff = Math.max(
    1,
    (lastVisit.getTime() - firstVisit.getTime()) / (30 * 24 * 60 * 60 * 1000)
  );
  const visitsPerMonth = visits.length / monthsDiff;

  let visitFrequency: 'High' | 'Medium' | 'Low';
  if (visitsPerMonth >= 2) visitFrequency = 'High';
  else if (visitsPerMonth >= 0.5) visitFrequency = 'Medium';
  else visitFrequency = 'Low';

  // --- Monthly breakdown (last 12 months) ----------------------------------
  const monthlyMap = new Map<string, { visits: number; fees: number }>();
  visits.forEach((visit) => {
    const d = new Date(visit.visitDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const visitFees = visit.fees.reduce((sum, fee) => sum + fee.total, 0);
    const existing = monthlyMap.get(key) || { visits: 0, fees: 0 };
    monthlyMap.set(key, { visits: existing.visits + 1, fees: existing.fees + visitFees });
  });

  const monthlyVisits = Array.from(monthlyMap.entries())
    .sort()
    .slice(-12)
    .map(([month, data]) => ({ month, visits: data.visits, fees: data.fees }));

  // --- Recent visits (last 5) ----------------------------------------------
  const recentVisits = visits.slice(0, 5).map((visit) => ({
    id: visit.id,
    visitDate: visit.visitDate.toISOString(),
    visitType: visit.visitType,
    fees: visit.fees.reduce((sum, fee) => sum + fee.total, 0),
    paidBy: visit.paidBy || undefined,
  }));

  return {
    patientId: patient.id,
    patientDisplayId: patient.patientId,
    name: patient.name,
    contact: patient.contact ?? null,
    totalVisits: visits.length,
    totalFeesGenerated,
    averageFeePerVisit: visits.length > 0 ? totalFeesGenerated / visits.length : 0,
    firstVisitDate: firstVisit,
    lastVisitDate: lastVisit,
    visitFrequency,
    paymentMethods: JSON.stringify(paymentMethodCounts),
    monthlyVisits: JSON.stringify(monthlyVisits),
    recentVisits: JSON.stringify(recentVisits),
  };
}

// ---------------------------------------------------------------------------
// Write a batch of computed rows to patient_analytics_cache
// Uses upsert so re-runs are idempotent
// ---------------------------------------------------------------------------
async function writeBatch(rows: PatientCacheRow[]): Promise<void> {
  const now = new Date();
  // Prisma doesn't support bulk upsert natively — use a transaction of
  // individual upserts. At batch_size=50 this is 50 statements per transaction,
  // well within PostgreSQL limits.
  await prisma.$transaction(
    rows.map((row) =>
      prisma.patientAnalyticsCache.upsert({
        where: { patientId: row.patientId },
        create: { ...row, calculatedAt: now },
        update: { ...row, calculatedAt: now },
      })
    )
  );
}

// ---------------------------------------------------------------------------
// Delete stale cache rows for patients that were removed since last run
// ---------------------------------------------------------------------------
async function purgeDeletedPatients(): Promise<number> {
  const result = await prisma.$executeRaw`
    DELETE FROM patient_analytics_cache
    WHERE "patientId" NOT IN (SELECT id FROM patients)
  `;
  return result;
}

// ---------------------------------------------------------------------------
// Main entry point — called by cron and by import trigger
// ---------------------------------------------------------------------------
export async function calculatePatientAnalytics(): Promise<{
  success: boolean;
  calculationTime: number;
  totalPatients: number;
}> {
  const startTime = Date.now();
  logger.info('Analytics calculation started');

  let cursor: string | undefined;
  let batchCount = 0;
  let totalProcessed = 0;

  // Summary accumulators — only scalar values, not full patient objects
  let summaryTotalVisits = 0;
  let summaryTotalRevenue = 0;
  let summaryHigh = 0;
  let summaryMedium = 0;
  let summaryLow = 0;

  try {
    while (true) {
      const batch = await fetchBatch(cursor);
      if (batch.length === 0) break;

      // Compute analytics for each patient in this batch
      const rows: PatientCacheRow[] = [];
      for (const patient of batch) {
        const row = computePatientRow(patient);
        if (row) {
          rows.push(row);
          // Accumulate summary — scalars only, no objects held
          summaryTotalVisits  += row.totalVisits;
          summaryTotalRevenue += row.totalFeesGenerated;
          if (row.visitFrequency === 'High')   summaryHigh++;
          else if (row.visitFrequency === 'Medium') summaryMedium++;
          else summaryLow++;
        }
      }

      // Write this batch immediately — don't hold in memory
      if (rows.length > 0) {
        await writeBatch(rows);
      }

      totalProcessed += rows.length;
      batchCount++;

      logger.info(`Analytics batch ${batchCount} complete`, {
        batchSize: batch.length,
        rowsWritten: rows.length,
        totalProcessed,
      });

      if (batch.length < BATCH_SIZE) break;
      cursor = batch[batch.length - 1].id;
    }

    // Write summary cache — one lightweight row
    const expiresAt = new Date(Date.now() + 25 * 60 * 60 * 1000); // 25h > daily cron cadence
    await prisma.analyticsSummaryCache.upsert({
      where: { cacheKey: 'summary' },
      create: {
        cacheKey: 'summary',
        totalPatients: totalProcessed,
        totalVisitsAll: summaryTotalVisits,
        totalRevenueAll: summaryTotalRevenue,
        averageVisitsPerPatient: totalProcessed > 0 ? summaryTotalVisits / totalProcessed : 0,
        averageRevenuePerPatient: totalProcessed > 0 ? summaryTotalRevenue / totalProcessed : 0,
        frequencyHigh: summaryHigh,
        frequencyMedium: summaryMedium,
        frequencyLow: summaryLow,
        calculatedAt: new Date(),
        expiresAt,
      },
      update: {
        totalPatients: totalProcessed,
        totalVisitsAll: summaryTotalVisits,
        totalRevenueAll: summaryTotalRevenue,
        averageVisitsPerPatient: totalProcessed > 0 ? summaryTotalVisits / totalProcessed : 0,
        averageRevenuePerPatient: totalProcessed > 0 ? summaryTotalRevenue / totalProcessed : 0,
        frequencyHigh: summaryHigh,
        frequencyMedium: summaryMedium,
        frequencyLow: summaryLow,
        calculatedAt: new Date(),
        expiresAt,
      },
    });

    // Remove rows for patients that no longer exist
    const purged = await purgeDeletedPatients();
    if (purged > 0) {
      logger.info(`Purged ${purged} stale patient cache rows`);
    }

    const calculationTime = Date.now() - startTime;
    logger.info('Analytics calculation completed', {
      totalPatients: totalProcessed,
      batches: batchCount,
      calculationTime: `${calculationTime}ms`,
    });

    return { success: true, calculationTime, totalPatients: totalProcessed };
  } catch (error) {
    logger.error('Analytics calculation failed', error);
    throw error;
  }
}
