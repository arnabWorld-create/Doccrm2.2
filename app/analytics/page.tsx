import prisma from '@/lib/prisma';
import {
  Users, Calendar, TrendingUp, Activity,
  UserCheck, Clock, AlertCircle, CheckCircle,
  Stethoscope, ArrowUpRight, ArrowDownRight,
  BarChart2, Heart, Zap,
} from 'lucide-react';
import { unstable_cache } from 'next/cache';
import nextDynamic from 'next/dynamic';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

// Lazy-load chart components (client-only)
const WeeklyRegistrationsChart = nextDynamic(
  () => import('@/components/AnalyticsCharts').then((m) => ({ default: m.WeeklyRegistrationsChart })),
  { ssr: false }
);
const GenderPieChart = nextDynamic(
  () => import('@/components/AnalyticsCharts').then((m) => ({ default: m.GenderPieChart })),
  { ssr: false }
);
const AgeDistributionChart = nextDynamic(
  () => import('@/components/AnalyticsCharts').then((m) => ({ default: m.AgeDistributionChart })),
  { ssr: false }
);
const AppointmentTypesChart = nextDynamic(
  () => import('@/components/AnalyticsCharts').then((m) => ({ default: m.AppointmentTypesChart })),
  { ssr: false }
);
const TopConditionsChart = nextDynamic(
  () => import('@/components/AnalyticsCharts').then((m) => ({ default: m.TopConditionsChart })),
  { ssr: false }
);
const TopMedicinesChart = nextDynamic(
  () => import('@/components/AnalyticsCharts').then((m) => ({ default: m.TopMedicinesChart })),
  { ssr: false }
);

// ─── Cached medical analysis ─────────────────────────────────────────────────
const getCachedMedicalAnalysis = unstable_cache(
  async () => {
    const visitsWithData = await prisma.visit.findMany({
      select: { signs: true, medicines: true },
      where: { OR: [{ signs: { not: null } }, { medicines: { not: null } }] },
      orderBy: { visitDate: 'desc' },
      take: 500,
    });

    const { detectConditions, extractMedicines, groupMedicines } = await import('@/lib/medicalData');

    const conditionCount: Record<string, number> = {};
    visitsWithData.forEach((visit) => {
      if (visit.signs) {
        detectConditions(visit.signs).forEach((c) => {
          conditionCount[c] = (conditionCount[c] || 0) + 1;
        });
      }
    });

    const allMedicines: string[] = [];
    visitsWithData.forEach((visit) => {
      if (visit.medicines) allMedicines.push(...extractMedicines(visit.medicines));
    });

    const medicineCount = groupMedicines(allMedicines);

    const topConditions = Object.entries(conditionCount)
      .sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([name, count]) => ({ name, count }));
    const topMedicines = Object.entries(medicineCount)
      .sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    return { topConditions, topMedicines };
  },
  ['medical-analysis'],
  { revalidate: 300, tags: ['medical-analysis'] }
);

// ─── Page ────────────────────────────────────────────────────────────────────
const AnalyticsPage = async () => {
  const today = new Date();
  const startOfMonth     = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const endOfLastMonth   = new Date(today.getFullYear(), today.getMonth(), 0);
  const startOfWeek      = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const todayStart = new Date(today); todayStart.setHours(0, 0, 0, 0);
  const todayEnd   = new Date(today); todayEnd.setHours(23, 59, 59, 999);
  const eightWeeksAgo = new Date(today);
  eightWeeksAgo.setDate(today.getDate() - 7 * 7);
  eightWeeksAgo.setHours(0, 0, 0, 0);

  // ── DB queries — all run in parallel ──────────────────────────────────────
  const followUpWeekEnd = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [patientStatsRaw, recentPatients, visitStatsRaw, appointmentStatsRaw, medicalAnalysis] =
    await Promise.all([
      prisma.$queryRaw<Array<{
        total: bigint; this_month: bigint; last_month: bigint; this_week: bigint;
        with_records: bigint; male: bigint; female: bigint; other: bigint;
        age_0_18: bigint; age_19_35: bigint; age_36_50: bigint;
        age_51_65: bigint; age_65_plus: bigint;
      }>>`
        SELECT
          COUNT(*)::bigint as total,
          COUNT(*) FILTER (WHERE "createdAt" >= ${startOfMonth})::bigint as this_month,
          COUNT(*) FILTER (WHERE "createdAt" >= ${startOfLastMonth} AND "createdAt" <= ${endOfLastMonth})::bigint as last_month,
          COUNT(*) FILTER (WHERE "createdAt" >= ${startOfWeek})::bigint as this_week,
          COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM visits WHERE visits."patientId" = patients.id AND signs IS NOT NULL))::bigint as with_records,
          COUNT(*) FILTER (WHERE gender = 'Male')::bigint as male,
          COUNT(*) FILTER (WHERE gender = 'Female')::bigint as female,
          COUNT(*) FILTER (WHERE gender = 'Other')::bigint as other,
          COUNT(*) FILTER (WHERE age IS NOT NULL AND age <= 18)::bigint as age_0_18,
          COUNT(*) FILTER (WHERE age IS NOT NULL AND age > 18 AND age <= 35)::bigint as age_19_35,
          COUNT(*) FILTER (WHERE age IS NOT NULL AND age > 35 AND age <= 50)::bigint as age_36_50,
          COUNT(*) FILTER (WHERE age IS NOT NULL AND age > 50 AND age <= 65)::bigint as age_51_65,
          COUNT(*) FILTER (WHERE age IS NOT NULL AND age > 65)::bigint as age_65_plus
        FROM patients
      `,

      prisma.patient.findMany({
        select: { createdAt: true },
        where: { createdAt: { gte: eightWeeksAgo } },
        orderBy: { createdAt: 'asc' },
      }),

      prisma.$queryRaw<Array<{
        today: bigint; upcoming: bigint; this_week: bigint; overdue: bigint;
      }>>`
        SELECT
          COUNT(*) FILTER (WHERE "visitDate" >= ${todayStart} AND "visitDate" < ${todayEnd})::bigint as today,
          COUNT(*) FILTER (WHERE "followUpDate" >= ${today})::bigint as upcoming,
          COUNT(*) FILTER (WHERE "followUpDate" >= ${startOfWeek} AND "followUpDate" < ${followUpWeekEnd})::bigint as this_week,
          COUNT(*) FILTER (WHERE "followUpDate" < ${today})::bigint as overdue
        FROM visits
      `,

      prisma.$queryRaw<Array<{
        total: bigint; with_patient: bigint; without_patient: bigint;
      }>>`
        SELECT
          COUNT(*)::bigint as total,
          COUNT(*) FILTER (WHERE "patientId" IS NOT NULL)::bigint as with_patient,
          COUNT(*) FILTER (WHERE "patientId" IS NULL)::bigint as without_patient
        FROM appointments
      `,

      getCachedMedicalAnalysis(),
    ]);

  const s = patientStatsRaw[0];
  const totalPatients               = Number(s.total);
  const patientsThisMonth           = Number(s.this_month);
  const patientsLastMonth           = Number(s.last_month);
  const patientsThisWeek            = Number(s.this_week);
  const patientsWithCompleteRecords = Number(s.with_records);
  const maleCount                   = Number(s.male);
  const femaleCount                 = Number(s.female);
  const otherCount                  = Number(s.other);
  const ageGroups = {
    '0-18':  Number(s.age_0_18),
    '19-35': Number(s.age_19_35),
    '36-50': Number(s.age_36_50),
    '51-65': Number(s.age_51_65),
    '65+':   Number(s.age_65_plus),
  };

  const v = visitStatsRaw[0];
  const consultationsToday = Number(v.today);
  const upcomingFollowUps  = Number(v.upcoming);
  const followUpsThisWeek  = Number(v.this_week);
  const overdueFollowUps   = Number(v.overdue);

  const a = appointmentStatsRaw[0];
  const totalAppointments      = Number(a.total);
  const oldPatientAppointments = Number(a.with_patient);
  const newPatientAppointments = Number(a.without_patient);

  const { topConditions, topMedicines } = medicalAnalysis;

  // ── Derived values ─────────────────────────────────────────────────────────
  const avgPatientsPerDay = (patientsThisMonth / Math.max(1, today.getDate())).toFixed(1);
  const growthRate = patientsLastMonth > 0
    ? ((patientsThisMonth - patientsLastMonth) / patientsLastMonth * 100).toFixed(1)
    : '0';
  const growthPositive = Number(growthRate) >= 0;
  const completionRate = totalPatients > 0
    ? ((patientsWithCompleteRecords / totalPatients) * 100).toFixed(1)
    : '0';

  // ── Weekly chart data ──────────────────────────────────────────────────────
  const weeksData: Array<{ label: string; count: number }> = [];
  for (let i = 7; i >= 0; i--) {
    const wStart = new Date(today);
    wStart.setDate(today.getDate() - i * 7 - today.getDay());
    wStart.setHours(0, 0, 0, 0);
    const wEnd = new Date(wStart);
    wEnd.setDate(wStart.getDate() + 7);
    const count = recentPatients.filter((p) => {
      const d = new Date(p.createdAt);
      return d >= wStart && d < wEnd;
    }).length;
    weeksData.push({ label: `W${8 - i}`, count });
  }

  const totalWeeklyPatients = weeksData.reduce((s, w) => s + w.count, 0);
  const weeklyAvg = (totalWeeklyPatients / weeksData.length).toFixed(1);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-8">

      {/* ── Hero Header ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-teal via-brand-teal/90 to-[#005f5a] p-6 sm:p-8 text-white shadow-lg">
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-white/5" />
        <div className="absolute top-1/2 right-24 w-20 h-20 rounded-full bg-white/5" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-white/20 rounded-lg">
                <BarChart2 className="h-4 w-4" />
              </div>
              <span className="text-white/70 text-xs font-medium uppercase tracking-widest">Analytics Dashboard</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Practice Overview</h1>
            <p className="text-white/70 text-sm mt-1">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="text-center bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 border border-white/10 min-w-0">
              <p className="text-xl sm:text-2xl font-bold">{totalPatients.toLocaleString('en-IN')}</p>
              <p className="text-white/70 text-xs mt-0.5">Total Patients</p>
            </div>
            <div className="text-center bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 border border-white/10 min-w-0">
              <p className="text-xl sm:text-2xl font-bold">{consultationsToday}</p>
              <p className="text-white/70 text-xs mt-0.5">Today</p>
            </div>
            <div className="text-center bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 border border-white/10 min-w-0">
              <p className={`text-xl sm:text-2xl font-bold ${growthPositive ? 'text-green-300' : 'text-red-300'}`}>
                {growthPositive ? '+' : ''}{growthRate}%
              </p>
              <p className="text-white/70 text-xs mt-0.5">Growth</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Primary KPI Row ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Patients */}
        <div className="group bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-brand-teal/10 rounded-xl group-hover:bg-brand-teal/20 transition-colors">
              <Users className="h-5 w-5 text-brand-teal" />
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 bg-gray-50 text-gray-500 rounded-full">All Time</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalPatients.toLocaleString('en-IN')}</p>
          <p className="text-sm text-gray-500 mt-1">Total Patients</p>
          <div className="mt-3 pt-3 border-t border-gray-50">
            <span className="text-xs text-gray-400">{patientsWithCompleteRecords} with complete records</span>
          </div>
        </div>

        {/* This Month */}
        <div className="group bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-green-50 rounded-xl group-hover:bg-green-100 transition-colors">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${growthPositive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
              {growthPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {growthPositive ? '+' : ''}{growthRate}%
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{patientsThisMonth}</p>
          <p className="text-sm text-gray-500 mt-1">New This Month</p>
          <div className="mt-3 pt-3 border-t border-gray-50">
            <span className="text-xs text-gray-400">vs {patientsLastMonth} last month</span>
          </div>
        </div>

        {/* This Week */}
        <div className="group bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-brand-yellow/10 rounded-xl group-hover:bg-brand-yellow/20 transition-colors">
              <Calendar className="h-5 w-5 text-brand-yellow" />
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 bg-gray-50 text-gray-500 rounded-full">This Week</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{patientsThisWeek}</p>
          <p className="text-sm text-gray-500 mt-1">New This Week</p>
          <div className="mt-3 pt-3 border-t border-gray-50">
            <span className="text-xs text-gray-400">{avgPatientsPerDay} avg per day</span>
          </div>
        </div>

        {/* Consultations Today */}
        <div className="group bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-brand-red/10 rounded-xl group-hover:bg-brand-red/20 transition-colors">
              <Stethoscope className="h-5 w-5 text-brand-red" />
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 bg-red-50 text-brand-red rounded-full">Today</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{consultationsToday}</p>
          <p className="text-sm text-gray-500 mt-1">Consultations Today</p>
          <div className="mt-3 pt-3 border-t border-gray-50">
            <span className="text-xs text-gray-400">{totalAppointments} total appointments</span>
          </div>
        </div>
      </div>

      {/* ── Follow-up Strip ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all">
          <div className="p-3 bg-brand-teal/10 rounded-xl flex-shrink-0">
            <CheckCircle className="h-5 w-5 text-brand-teal" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{followUpsThisWeek}</p>
            <p className="text-xs text-gray-500">Follow-ups This Week</p>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all">
          <div className="p-3 bg-brand-yellow/10 rounded-xl flex-shrink-0">
            <Clock className="h-5 w-5 text-brand-yellow" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{upcomingFollowUps}</p>
            <p className="text-xs text-gray-500">Upcoming Follow-ups</p>
          </div>
        </div>
        <div className={`flex items-center gap-4 rounded-2xl p-4 shadow-sm border transition-all hover:shadow-md ${overdueFollowUps > 0 ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100'}`}>
          <div className={`p-3 rounded-xl flex-shrink-0 ${overdueFollowUps > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
            <AlertCircle className={`h-5 w-5 ${overdueFollowUps > 0 ? 'text-brand-red' : 'text-gray-400'}`} />
          </div>
          <div>
            <p className={`text-2xl font-bold ${overdueFollowUps > 0 ? 'text-brand-red' : 'text-gray-900'}`}>{overdueFollowUps}</p>
            <p className="text-xs text-gray-500">Overdue Follow-ups</p>
          </div>
          {overdueFollowUps > 0 && (
            <span className="ml-auto text-xs font-bold text-brand-red bg-red-100 px-2 py-0.5 rounded-full">Action needed</span>
          )}
        </div>
      </div>

      {/* ── Charts Row 1 — Weekly + Appointments ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
        {/* Weekly registrations — wider */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-gray-900">Weekly Patient Registrations</h3>
              <p className="text-xs text-gray-400 mt-0.5">Last 8 weeks</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-sm font-bold text-brand-teal">{weeklyAvg}</p>
                <p className="text-xs text-gray-400">avg / week</p>
              </div>
              <div className="p-2 bg-brand-teal/10 rounded-xl">
                <TrendingUp className="h-4 w-4 text-brand-teal" />
              </div>
            </div>
          </div>
          <WeeklyRegistrationsChart data={weeksData} />
        </div>

        {/* Appointment types — narrower */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-gray-900">Appointment Types</h3>
              <p className="text-xs text-gray-400 mt-0.5">{totalAppointments} total</p>
            </div>
            <div className="p-2 bg-brand-teal/10 rounded-xl">
              <UserCheck className="h-4 w-4 text-brand-teal" />
            </div>
          </div>
          <AppointmentTypesChart data={{ oldPatientAppointments, newPatientAppointments, totalAppointments }} />
        </div>
      </div>

      {/* ── Charts Row 2 — Demographics ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Gender */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-gray-900">Gender Distribution</h3>
              <p className="text-xs text-gray-400 mt-0.5">{totalPatients} patients total</p>
            </div>
            <div className="p-2 bg-brand-teal/10 rounded-xl">
              <Users className="h-4 w-4 text-brand-teal" />
            </div>
          </div>
          {/* Mini legend */}
          <div className="flex gap-4 mb-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-brand-teal" />
              <span className="text-xs text-gray-500">Male <span className="font-semibold text-gray-700">{maleCount}</span></span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-brand-yellow" />
              <span className="text-xs text-gray-500">Female <span className="font-semibold text-gray-700">{femaleCount}</span></span>
            </div>
            {otherCount > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-brand-red" />
                <span className="text-xs text-gray-500">Other <span className="font-semibold text-gray-700">{otherCount}</span></span>
              </div>
            )}
          </div>
          <GenderPieChart data={{ maleCount, femaleCount, otherCount, totalPatients }} />
        </div>

        {/* Age Distribution */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-gray-900">Age Distribution</h3>
              <p className="text-xs text-gray-400 mt-0.5">Patients by age group</p>
            </div>
            <div className="p-2 bg-brand-yellow/10 rounded-xl">
              <Activity className="h-4 w-4 text-brand-yellow" />
            </div>
          </div>
          <AgeDistributionChart data={ageGroups} />
        </div>
      </div>

      {/* ── Performance Metrics Row ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

        {/* Record Completion */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">Record Completion</h3>
            <div className="p-2 bg-brand-teal/10 rounded-xl">
              <Activity className="h-4 w-4 text-brand-teal" />
            </div>
          </div>
          <div className="flex items-end gap-3 mb-4">
            <p className="text-4xl font-bold text-brand-teal">{completionRate}%</p>
            <p className="text-sm text-gray-400 mb-1.5">of records complete</p>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-teal to-brand-teal/60 transition-all duration-700"
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <p className="text-xs text-gray-400">{patientsWithCompleteRecords} complete</p>
            <p className="text-xs text-gray-400">{totalPatients - patientsWithCompleteRecords} pending</p>
          </div>
        </div>

        {/* Daily Average */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">Daily Average</h3>
            <div className="p-2 bg-brand-yellow/10 rounded-xl">
              <Zap className="h-4 w-4 text-brand-yellow" />
            </div>
          </div>
          <div className="flex items-end gap-3 mb-4">
            <p className="text-4xl font-bold text-brand-yellow">{avgPatientsPerDay}</p>
            <p className="text-sm text-gray-400 mb-1.5">patients / day</p>
          </div>
          <div className="space-y-2 mt-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">This month</span>
              <span className="font-semibold text-gray-700">{patientsThisMonth} patients</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Days elapsed</span>
              <span className="font-semibold text-gray-700">{today.getDate()} days</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Workload</span>
              <span className={`font-semibold ${Number(avgPatientsPerDay) > 10 ? 'text-brand-red' : 'text-green-600'}`}>
                {Number(avgPatientsPerDay) > 10 ? 'High' : 'Manageable'}
              </span>
            </div>
          </div>
        </div>

        {/* Follow-up Compliance */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">Follow-up Status</h3>
            <div className={`p-2 rounded-xl ${overdueFollowUps > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
              <Heart className={`h-4 w-4 ${overdueFollowUps > 0 ? 'text-brand-red' : 'text-green-500'}`} />
            </div>
          </div>
          <div className="flex items-end gap-3 mb-4">
            <p className={`text-4xl font-bold ${overdueFollowUps > 0 ? 'text-brand-red' : 'text-green-600'}`}>
              {overdueFollowUps}
            </p>
            <p className="text-sm text-gray-400 mb-1.5">overdue</p>
          </div>
          <div className="space-y-2 mt-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">This week</span>
              <span className="font-semibold text-gray-700">{followUpsThisWeek} scheduled</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Upcoming</span>
              <span className="font-semibold text-gray-700">{upcomingFollowUps} total</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Status</span>
              <span className={`font-semibold ${overdueFollowUps > 0 ? 'text-brand-red' : 'text-green-600'}`}>
                {overdueFollowUps > 0 ? `${overdueFollowUps} need attention` : 'All on track'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Medical Charts Row ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Common Conditions */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-gray-900">Common Conditions</h3>
              <p className="text-xs text-gray-400 mt-0.5">Top {topConditions.length} diagnoses detected</p>
            </div>
            <div className="p-2 bg-brand-teal/10 rounded-xl">
              <Activity className="h-4 w-4 text-brand-teal" />
            </div>
          </div>
          <TopConditionsChart data={topConditions} />
        </div>

        {/* Top Medicines */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-gray-900">Top Prescribed Medicines</h3>
              <p className="text-xs text-gray-400 mt-0.5">Most frequently prescribed</p>
            </div>
            <div className="p-2 bg-brand-red/10 rounded-xl">
              <Stethoscope className="h-4 w-4 text-brand-red" />
            </div>
          </div>
          <TopMedicinesChart data={topMedicines} />
        </div>
      </div>

      {/* ── Actionable Insights ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Section header */}
        <div className="flex items-center gap-3 px-5 sm:px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-brand-teal/5 to-transparent">
          <div className="p-2 bg-brand-teal/10 rounded-xl">
            <Zap className="h-4 w-4 text-brand-teal" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Actionable Insights</h3>
            <p className="text-xs text-gray-400">AI-powered recommendations based on your data</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-100">

          {/* Growth */}
          <div className="p-5 sm:p-6 hover:bg-gray-50/60 transition-colors">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-xl flex-shrink-0 ${growthPositive ? 'bg-green-50' : 'bg-red-50'}`}>
                <TrendingUp className={`h-4 w-4 ${growthPositive ? 'text-green-600' : 'text-brand-red'}`} />
              </div>
              <div>
                <p className={`font-semibold text-sm mb-1 ${growthPositive ? 'text-green-700' : 'text-brand-red'}`}>
                  Patient Growth Trend
                </p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {growthPositive
                    ? <>Your base <span className="font-semibold text-green-600">grew {growthRate}%</span> this month.{' '}
                        {Number(growthRate) > 10 ? 'Excellent! Consider expanding clinic hours.' : 'Steady growth maintained.'}</>
                    : <>Registrations <span className="font-semibold text-brand-red">decreased {Math.abs(Number(growthRate))}%</span>. Review outreach strategies.</>}
                </p>
              </div>
            </div>
          </div>

          {/* Follow-up */}
          <div className="p-5 sm:p-6 hover:bg-gray-50/60 transition-colors">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-xl flex-shrink-0 ${overdueFollowUps > 0 ? 'bg-red-50' : 'bg-brand-yellow/10'}`}>
                <AlertCircle className={`h-4 w-4 ${overdueFollowUps > 0 ? 'text-brand-red' : 'text-brand-yellow'}`} />
              </div>
              <div>
                <p className={`font-semibold text-sm mb-1 ${overdueFollowUps > 0 ? 'text-brand-red' : 'text-brand-yellow'}`}>
                  {overdueFollowUps > 0 ? 'Urgent: Overdue Follow-ups' : 'Follow-up Status'}
                </p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {overdueFollowUps > 0
                    ? <><span className="font-semibold">{overdueFollowUps} patient{overdueFollowUps !== 1 ? 's' : ''}</span> missed follow-up dates and need immediate contact.</>
                    : <>All follow-ups on track. <span className="font-semibold">{upcomingFollowUps}</span> appointment{upcomingFollowUps !== 1 ? 's' : ''} scheduled ahead.</>}
                </p>
              </div>
            </div>
          </div>

          {/* Completion */}
          <div className="p-5 sm:p-6 hover:bg-gray-50/60 transition-colors">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-brand-yellow/10 rounded-xl flex-shrink-0">
                <CheckCircle className="h-4 w-4 text-brand-yellow" />
              </div>
              <div>
                <p className="font-semibold text-sm text-brand-yellow mb-1">Record Completion</p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {Number(completionRate) >= 80
                    ? <><span className="font-semibold text-green-600">{completionRate}%</span> of records are complete — excellent documentation!.</>
                    : Number(completionRate) >= 60
                    ? <><span className="font-semibold">{completionRate}%</span> complete. {totalPatients - patientsWithCompleteRecords} records still need consultation notes.</>
                    : <>Only <span className="font-semibold">{completionRate}%</span> complete. Prioritise documenting consultations and treatments.</>}
                </p>
              </div>
            </div>
          </div>

          {/* Demographics */}
          <div className="p-5 sm:p-6 hover:bg-gray-50/60 transition-colors">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-brand-teal/10 rounded-xl flex-shrink-0">
                <Users className="h-4 w-4 text-brand-teal" />
              </div>
              <div>
                <p className="font-semibold text-sm text-brand-teal mb-1">Patient Demographics</p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Primary group: <span className="font-semibold">{maleCount > femaleCount ? 'Male' : 'Female'}</span> ({Math.max(maleCount, femaleCount)} patients).{' '}
                  {totalPatients > 0 && (
                    <>Ratio: {((maleCount / totalPatients) * 100).toFixed(0)}% Male, {((femaleCount / totalPatients) * 100).toFixed(0)}% Female.</>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Workload */}
          <div className="p-5 sm:p-6 hover:bg-gray-50/60 transition-colors">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-brand-teal/10 rounded-xl flex-shrink-0">
                <Activity className="h-4 w-4 text-brand-teal" />
              </div>
              <div>
                <p className="font-semibold text-sm text-brand-teal mb-1">Daily Workload</p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Averaging <span className="font-semibold">{avgPatientsPerDay} patients/day</span> this month.{' '}
                  {Number(avgPatientsPerDay) > 10 ? 'High volume — ensure adequate staffing.' : 'Manageable patient flow.'}
                </p>
              </div>
            </div>
          </div>

          {/* Weekly */}
          <div className="p-5 sm:p-6 hover:bg-gray-50/60 transition-colors">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-brand-teal/10 rounded-xl flex-shrink-0">
                <Calendar className="h-4 w-4 text-brand-teal" />
              </div>
              <div>
                <p className="font-semibold text-sm text-brand-teal mb-1">This Week</p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  <span className="font-semibold">{patientsThisWeek} new patient{patientsThisWeek !== 1 ? 's' : ''}</span> registered
                  {' '}and <span className="font-semibold">{followUpsThisWeek} follow-up{followUpsThisWeek !== 1 ? 's' : ''}</span> scheduled.
                  {consultationsToday > 0 && <> <span className="font-semibold">{consultationsToday}</span> consultation{consultationsToday !== 1 ? 's' : ''} today.</>}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

export default AnalyticsPage;
