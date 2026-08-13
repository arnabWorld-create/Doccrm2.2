-- CreateTable
CREATE TABLE "patient_analytics_cache" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "patientDisplayId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "totalVisits" INTEGER NOT NULL DEFAULT 0,
    "totalFeesGenerated" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageFeePerVisit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "firstVisitDate" TIMESTAMP(3),
    "lastVisitDate" TIMESTAMP(3),
    "visitFrequency" TEXT NOT NULL DEFAULT 'Low',
    "paymentMethods" TEXT NOT NULL DEFAULT '{}',
    "monthlyVisits" TEXT NOT NULL DEFAULT '[]',
    "recentVisits" TEXT NOT NULL DEFAULT '[]',
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_analytics_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_summary_cache" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL DEFAULT 'summary',
    "totalPatients" INTEGER NOT NULL DEFAULT 0,
    "totalVisitsAll" INTEGER NOT NULL DEFAULT 0,
    "totalRevenueAll" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageVisitsPerPatient" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageRevenuePerPatient" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "frequencyHigh" INTEGER NOT NULL DEFAULT 0,
    "frequencyMedium" INTEGER NOT NULL DEFAULT 0,
    "frequencyLow" INTEGER NOT NULL DEFAULT 0,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytics_summary_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "patient_analytics_cache_patientId_key" ON "patient_analytics_cache"("patientId");

-- CreateIndex
CREATE INDEX "patient_analytics_cache_totalFeesGenerated_idx" ON "patient_analytics_cache"("totalFeesGenerated");

-- CreateIndex
CREATE INDEX "patient_analytics_cache_totalVisits_idx" ON "patient_analytics_cache"("totalVisits");

-- CreateIndex
CREATE INDEX "patient_analytics_cache_lastVisitDate_idx" ON "patient_analytics_cache"("lastVisitDate");

-- CreateIndex
CREATE INDEX "patient_analytics_cache_name_idx" ON "patient_analytics_cache"("name");

-- CreateIndex
CREATE INDEX "patient_analytics_cache_calculatedAt_idx" ON "patient_analytics_cache"("calculatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_summary_cache_cacheKey_key" ON "analytics_summary_cache"("cacheKey");
