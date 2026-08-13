import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withMiddleware, successResponse } from '@/lib/middleware';
import { requirePermission } from '@/lib/rbac';
import { logger } from '@/lib/logger';
import { RATE_LIMITS } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// ARCHITECTURE: Per-patient cache table (patient_analytics_cache)
//
// The cron pre-computes one row per patient and writes it to
// patient_analytics_cache.  This route reads paginated rows directly
// from that table — ORDER BY and LIMIT happen in PostgreSQL, never in JS.
//
// Memory cost per request: O(page_size) = 50 rows max, regardless of whether
// you have 100 or 10,000 patients.
//
// Fallback: if the cache is cold (first run, or time-filtered request),
// the raw aggregation SQL runs but with DB-level pagination so we still
// never pull all patients into Node.js memory.
// ---------------------------------------------------------------------------

// Shared shape returned to the frontend — unchanged from before so the UI
// doesn't need any changes.
interface PatientAnalytics {
  id: string;
  patientId: string;
  name: string;
  contact?: string | null;
  totalVisits: number;
  totalFeesGenerated: number;
  averageFeePerVisit: number;
  firstVisitDate: string;
  lastVisitDate: string;
  visitFrequency: 'High' | 'Medium' | 'Low';
  paymentMethods: Record<string, number>;
  monthlyVisits: { month: string; visits: number; fees: number }[];
  recentVisits: {
    id: string;
    visitDate: string;
    visitType: string;
    fees: number;
    paidBy?: string;
  }[];
}

// Map a sortBy param to the correct column in patient_analytics_cache
const SORT_COLUMN_MAP: Record<string, string> = {
  totalFeesGenerated: 'totalFeesGenerated',
  totalVisits: 'totalVisits',
  averageFeePerVisit: 'averageFeePerVisit',
  name: 'name',
  lastVisitDate: 'lastVisitDate',
};

export const GET = withMiddleware(
  async (request: NextRequest) => {
    try {
      const { error } = await requirePermission(request, 'analytics', 'read');
      if (error) throw error;

      const { searchParams } = new URL(request.url);
      const page      = Math.max(1, parseInt(searchParams.get('page')      || '1'));
      const limit     = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50')));
      const sortBy    = searchParams.get('sortBy')    || 'totalFeesGenerated';
      const sortOrder = searchParams.get('sortOrder') || 'desc';
      const minVisits = Math.max(1, parseInt(searchParams.get('minVisits') || '1'));
      const timeRange = searchParams.get('timeRange') || 'all';
      const skip      = (page - 1) * limit;

      // ── Path A: cache is valid + no time filter ──────────────────────────
      // Read directly from patient_analytics_cache with DB-level sort + page.
      // Memory: O(limit) regardless of patient count.
      const useCache = timeRange === 'all';

      if (useCache) {
        // Check summary cache is fresh
        const summary = await prisma.analyticsSummaryCache.findUnique({
          where: { cacheKey: 'summary' },
        });

        const cacheIsWarm = summary && new Date(summary.expiresAt) > new Date();

        if (cacheIsWarm) {
          const orderColumn = SORT_COLUMN_MAP[sortBy] ?? 'totalFeesGenerated';
          const orderDir    = sortOrder === 'asc' ? 'asc' : 'desc';

          // Count matching rows
          const total = await prisma.patientAnalyticsCache.count({
            where: { totalVisits: { gte: minVisits } },
          });

          // Fetch only the page we need
          const rows = await prisma.patientAnalyticsCache.findMany({
            where: { totalVisits: { gte: minVisits } },
            orderBy: { [orderColumn]: orderDir },
            skip,
            take: limit,
          });

          const data: PatientAnalytics[] = rows.map(rowToAnalytics);

          logger.info('Analytics served from cache table', {
            calculatedAt: summary.calculatedAt,
            ageSeconds: Math.round(
              (Date.now() - new Date(summary.calculatedAt).getTime()) / 1000
            ),
            page,
            limit,
            total,
          });

          return successResponse(
            {
              data,
              summary: buildSummaryShape(summary),
              pagination: { total, page, limit, pages: Math.ceil(total / limit) },
              filters: { timeRange, sortBy, sortOrder, minVisits },
              cached: true,
              calculatedAt: summary.calculatedAt,
            },
            200,
            request
          );
        }
      }

      // ── Path B: cache cold or time-filtered request ──────────────────────
      // Run aggregation SQL in PostgreSQL.
      // Crucially: ORDER BY, LIMIT, OFFSET are all inside the SQL — only the
      // requested page comes back to Node.js, not all patients.
      logger.info('Analytics cache cold or time-filtered — running aggregation SQL', {
        timeRange,
        minVisits,
        page,
        limit,
      });

      const dateFilter = resolveDateFilter(timeRange);

      const { data, total } = await runAggregationQuery({
        dateFilter,
        minVisits,
        sortBy,
        sortOrder,
        skip,
        limit,
      });

      // Build summary from DB for this filtered view
      const summaryRow = await buildLiveSummary(dateFilter, minVisits);

      logger.info('Analytics served from aggregation query', {
        timeRange,
        total,
        page,
        limit,
        cached: false,
      });

      return successResponse(
        {
          data,
          summary: summaryRow,
          pagination: { total, page, limit, pages: Math.ceil(total / limit) },
          filters: { timeRange, sortBy, sortOrder, minVisits },
          cached: false,
        },
        200,
        request
      );
    } catch (err) {
      logger.error('Patient analytics error', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      throw err;
    }
  },
  { rateLimit: RATE_LIMITS.API }
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a patient_analytics_cache DB row to the API response shape */
function rowToAnalytics(row: {
  patientId: string;
  patientDisplayId: string;
  name: string;
  contact: string | null;
  totalVisits: number;
  totalFeesGenerated: number;
  averageFeePerVisit: number;
  firstVisitDate: Date | null;
  lastVisitDate: Date | null;
  visitFrequency: string;
  paymentMethods: string;
  monthlyVisits: string;
  recentVisits: string;
}): PatientAnalytics {
  const parseJson = <T>(val: string, fallback: T): T => {
    try { return JSON.parse(val) as T; } catch { return fallback; }
  };

  return {
    id: row.patientId,
    patientId: row.patientDisplayId,
    name: row.name,
    contact: row.contact,
    totalVisits: row.totalVisits,
    totalFeesGenerated: row.totalFeesGenerated,
    averageFeePerVisit: row.averageFeePerVisit,
    firstVisitDate: row.firstVisitDate?.toISOString() ?? new Date().toISOString(),
    lastVisitDate: row.lastVisitDate?.toISOString()  ?? new Date().toISOString(),
    visitFrequency: (row.visitFrequency as 'High' | 'Medium' | 'Low') ?? 'Low',
    paymentMethods: parseJson<Record<string, number>>(row.paymentMethods, {}),
    monthlyVisits: parseJson<{ month: string; visits: number; fees: number }[]>(row.monthlyVisits, []),
    recentVisits: parseJson<PatientAnalytics['recentVisits']>(row.recentVisits, []),
  };
}

/** Shape the summary cache row into the API summary object */
function buildSummaryShape(summary: {
  totalPatients: number;
  totalVisitsAll: number;
  totalRevenueAll: number;
  averageVisitsPerPatient: number;
  averageRevenuePerPatient: number;
  frequencyHigh: number;
  frequencyMedium: number;
  frequencyLow: number;
}) {
  return {
    totalPatients: summary.totalPatients,
    totalVisitsAll: summary.totalVisitsAll,
    totalRevenueAll: summary.totalRevenueAll,
    averageVisitsPerPatient: summary.averageVisitsPerPatient,
    averageRevenuePerPatient: summary.averageRevenuePerPatient,
    topRevenuePatient: null, // not available from summary row — frontend handles gracefully
    frequencyDistribution: {
      high:   summary.frequencyHigh,
      medium: summary.frequencyMedium,
      low:    summary.frequencyLow,
    },
  };
}

function resolveDateFilter(timeRange: string): Date | undefined {
  const now = new Date();
  switch (timeRange) {
    case '30d': return new Date(now.getTime() - 30  * 24 * 60 * 60 * 1000);
    case '90d': return new Date(now.getTime() - 90  * 24 * 60 * 60 * 1000);
    case '6m':  return new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    case '1y':  return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    default:    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Aggregation SQL — with DB-level ORDER BY + LIMIT/OFFSET
// Only the requested page rows come back to Node.js, not all patients.
// ---------------------------------------------------------------------------
type AggRow = {
  id: string;
  patientId: string;
  name: string;
  contact: string | null;
  total_visits: bigint;
  total_fees: number;
  first_visit: Date | null;
  last_visit: Date | null;
  paid_by_counts: unknown;
  monthly_data: unknown;
  recent_visits: unknown;
  invoice_total: number;
  total_count: bigint; // window count for pagination
};

async function runAggregationQuery({
  dateFilter,
  minVisits,
  sortBy,
  sortOrder,
  skip,
  limit,
}: {
  dateFilter: Date | undefined;
  minVisits: number;
  sortBy: string;
  sortOrder: string;
  skip: number;
  limit: number;
}): Promise<{ data: PatientAnalytics[]; total: number }> {
  const dateTs  = dateFilter ?? new Date(0);
  const useDate = dateFilter !== undefined;

  // Map sortBy to SQL column name — whitelist to prevent injection
  const sqlSortCol: Record<string, string> = {
    totalFeesGenerated: 'total_fees',
    totalVisits:        'total_visits',
    averageFeePerVisit: 'CASE WHEN total_visits > 0 THEN total_fees / total_visits ELSE 0 END',
    name:               'p.name',
    lastVisitDate:      'last_visit',
  };
  const orderCol = sqlSortCol[sortBy] ?? 'total_fees';
  const orderDir = sortOrder === 'asc' ? 'ASC' : 'DESC';

  // The query is parameterized via tagged template — no string interpolation
  // of user values. Only orderCol/orderDir are inlined and they come from a
  // whitelist above, not from user input directly.
  //
  // COUNT(*) OVER () gives us total matching rows without a second query.
  const rows = useDate
    ? await prisma.$queryRaw<AggRow[]>`
        SELECT
          p.id,
          p."patientId",
          p.name,
          p.contact,
          COUNT(DISTINCT v.id)::bigint          AS total_visits,
          MIN(v."visitDate")                    AS first_visit,
          MAX(v."visitDate")                    AS last_visit,
          COALESCE(SUM(vf.total), 0)            AS total_fees,
          (SELECT json_object_agg(paid_by, cnt)
           FROM (SELECT v2."paidBy" AS paid_by, COUNT(*) AS cnt
                 FROM visits v2
                 WHERE v2."patientId" = p.id AND v2."paidBy" IS NOT NULL
                   AND v2."visitDate" >= ${dateTs}
                 GROUP BY v2."paidBy") pm)      AS paid_by_counts,
          (SELECT json_agg(m ORDER BY m.month)
           FROM (SELECT to_char(v3."visitDate",'YYYY-MM') AS month,
                        COUNT(*) AS visits,
                        COALESCE(SUM(vf3.total),0) AS fees
                 FROM visits v3
                 LEFT JOIN visit_fees vf3 ON vf3."visitId" = v3.id
                 WHERE v3."patientId" = p.id AND v3."visitDate" >= ${dateTs}
                 GROUP BY to_char(v3."visitDate",'YYYY-MM')
                 ORDER BY month DESC LIMIT 12) m) AS monthly_data,
          (SELECT json_agg(rv ORDER BY rv."visitDate" DESC)
           FROM (SELECT v4.id, v4."visitDate", v4."visitType", v4."paidBy",
                        COALESCE(SUM(vf4.total),0) AS fees
                 FROM visits v4
                 LEFT JOIN visit_fees vf4 ON vf4."visitId" = v4.id
                 WHERE v4."patientId" = p.id AND v4."visitDate" >= ${dateTs}
                 GROUP BY v4.id, v4."visitDate", v4."visitType", v4."paidBy"
                 ORDER BY v4."visitDate" DESC LIMIT 5) rv) AS recent_visits,
          COALESCE((SELECT SUM(i.amount) FROM invoices i
                    WHERE i."patientId" = p.id AND i.status = 'paid'
                      AND i."createdAt" >= ${dateTs}), 0) AS invoice_total,
          COUNT(*) OVER ()::bigint              AS total_count
        FROM patients p
        LEFT JOIN visits v    ON v."patientId" = p.id AND v."visitDate" >= ${dateTs}
        LEFT JOIN visit_fees vf ON vf."visitId" = v.id
        GROUP BY p.id
        HAVING COUNT(DISTINCT v.id) >= ${minVisits}
        ORDER BY ${orderCol} ${orderDir}
        LIMIT ${limit} OFFSET ${skip}
      `
    : await prisma.$queryRaw<AggRow[]>`
        SELECT
          p.id,
          p."patientId",
          p.name,
          p.contact,
          COUNT(DISTINCT v.id)::bigint          AS total_visits,
          MIN(v."visitDate")                    AS first_visit,
          MAX(v."visitDate")                    AS last_visit,
          COALESCE(SUM(vf.total), 0)            AS total_fees,
          (SELECT json_object_agg(paid_by, cnt)
           FROM (SELECT v2."paidBy" AS paid_by, COUNT(*) AS cnt
                 FROM visits v2
                 WHERE v2."patientId" = p.id AND v2."paidBy" IS NOT NULL
                 GROUP BY v2."paidBy") pm)      AS paid_by_counts,
          (SELECT json_agg(m ORDER BY m.month)
           FROM (SELECT to_char(v3."visitDate",'YYYY-MM') AS month,
                        COUNT(*) AS visits,
                        COALESCE(SUM(vf3.total),0) AS fees
                 FROM visits v3
                 LEFT JOIN visit_fees vf3 ON vf3."visitId" = v3.id
                 WHERE v3."patientId" = p.id
                 GROUP BY to_char(v3."visitDate",'YYYY-MM')
                 ORDER BY month DESC LIMIT 12) m) AS monthly_data,
          (SELECT json_agg(rv ORDER BY rv."visitDate" DESC)
           FROM (SELECT v4.id, v4."visitDate", v4."visitType", v4."paidBy",
                        COALESCE(SUM(vf4.total),0) AS fees
                 FROM visits v4
                 LEFT JOIN visit_fees vf4 ON vf4."visitId" = v4.id
                 WHERE v4."patientId" = p.id
                 GROUP BY v4.id, v4."visitDate", v4."visitType", v4."paidBy"
                 ORDER BY v4."visitDate" DESC LIMIT 5) rv) AS recent_visits,
          COALESCE((SELECT SUM(i.amount) FROM invoices i
                    WHERE i."patientId" = p.id AND i.status = 'paid'), 0) AS invoice_total,
          COUNT(*) OVER ()::bigint              AS total_count
        FROM patients p
        LEFT JOIN visits v    ON v."patientId" = p.id
        LEFT JOIN visit_fees vf ON vf."visitId" = v.id
        GROUP BY p.id
        HAVING COUNT(DISTINCT v.id) >= ${minVisits}
        ORDER BY ${orderCol} ${orderDir}
        LIMIT ${limit} OFFSET ${skip}
      `;

  const total = rows.length > 0 ? Number(rows[0].total_count) : 0;

  const parseJsonField = <T>(field: unknown, fallback: T): T => {
    if (field === null || field === undefined) return fallback;
    if (typeof field === 'string') {
      try { return JSON.parse(field) as T; } catch { return fallback; }
    }
    return field as unknown as T;
  };

  const data: PatientAnalytics[] = rows.map((row) => {
    const totalVisits           = Number(row.total_visits);
    const totalFeesFromVisits   = Number(row.total_fees);
    const totalFeesFromInvoices = Number(row.invoice_total);
    const totalFeesGenerated    = Math.max(totalFeesFromVisits, totalFeesFromInvoices);

    const firstVisit = row.first_visit ? new Date(row.first_visit) : new Date();
    const lastVisit  = row.last_visit  ? new Date(row.last_visit)  : new Date();
    const monthsDiff = Math.max(
      1,
      (lastVisit.getTime() - firstVisit.getTime()) / (30 * 24 * 60 * 60 * 1000)
    );
    const visitsPerMonth = totalVisits / monthsDiff;

    let visitFrequency: 'High' | 'Medium' | 'Low';
    if (visitsPerMonth >= 2)        visitFrequency = 'High';
    else if (visitsPerMonth >= 0.5) visitFrequency = 'Medium';
    else                            visitFrequency = 'Low';

    const rawRecentVisits = parseJsonField<any[]>(row.recent_visits, []);

    return {
      id:                   row.id,
      patientId:            row.patientId,
      name:                 row.name,
      contact:              row.contact,
      totalVisits,
      totalFeesGenerated,
      averageFeePerVisit:   totalVisits > 0 ? totalFeesGenerated / totalVisits : 0,
      firstVisitDate:       firstVisit.toISOString(),
      lastVisitDate:        lastVisit.toISOString(),
      visitFrequency,
      paymentMethods:       parseJsonField<Record<string, number>>(row.paid_by_counts, {}),
      monthlyVisits:        parseJsonField<{ month: string; visits: number; fees: number }[]>(row.monthly_data, []),
      recentVisits:         rawRecentVisits.map((v) => ({
        id:        v.id,
        visitDate: new Date(v.visitDate).toISOString(),
        visitType: v.visitType,
        fees:      Number(v.fees),
        paidBy:    v.paidBy ?? undefined,
      })),
    };
  });

  return { data, total };
}

/** Quick summary via SQL aggregation — used when cache is cold */
async function buildLiveSummary(dateFilter: Date | undefined, minVisits: number) {
  const dateTs  = dateFilter ?? new Date(0);
  const useDate = dateFilter !== undefined;

  type SummaryRow = {
    total_patients: bigint;
    total_visits: bigint;
    total_revenue: number;
  };

  const rows = useDate
    ? await prisma.$queryRaw<SummaryRow[]>`
        SELECT
          COUNT(DISTINCT p.id)::bigint   AS total_patients,
          COUNT(DISTINCT v.id)::bigint   AS total_visits,
          COALESCE(SUM(vf.total), 0)     AS total_revenue
        FROM patients p
        LEFT JOIN visits v    ON v."patientId" = p.id AND v."visitDate" >= ${dateTs}
        LEFT JOIN visit_fees vf ON vf."visitId" = v.id
        GROUP BY ()
        HAVING COUNT(DISTINCT v.id) >= ${minVisits}
      `
    : await prisma.$queryRaw<SummaryRow[]>`
        SELECT
          COUNT(DISTINCT p.id)::bigint   AS total_patients,
          COUNT(DISTINCT v.id)::bigint   AS total_visits,
          COALESCE(SUM(vf.total), 0)     AS total_revenue
        FROM patients p
        LEFT JOIN visits v    ON v."patientId" = p.id
        LEFT JOIN visit_fees vf ON vf."visitId" = v.id
      `;

  const s = rows[0];
  const totalPatients = s ? Number(s.total_patients) : 0;
  const totalVisits   = s ? Number(s.total_visits)   : 0;
  const totalRevenue  = s ? Number(s.total_revenue)  : 0;

  return {
    totalPatients,
    totalVisitsAll:           totalVisits,
    totalRevenueAll:          totalRevenue,
    averageVisitsPerPatient:  totalPatients > 0 ? totalVisits  / totalPatients : 0,
    averageRevenuePerPatient: totalPatients > 0 ? totalRevenue / totalPatients : 0,
    topRevenuePatient:        null,
    frequencyDistribution:    { high: 0, medium: 0, low: 0 }, // not computed in live path
  };
}
