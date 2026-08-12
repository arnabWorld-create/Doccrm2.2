import { Suspense } from 'react';
import PatientTable from '@/components/PatientTable';
import prisma from '@/lib/prisma';
import { PageHero } from '@/components/ui/page-hero';
import { Users } from 'lucide-react';

// SSR with streaming — loading.tsx skeleton shows in <10ms while DB query runs
export const dynamic = 'force-dynamic';

interface PatientsPageProps {
  searchParams?: {
    search?: string;
    page?: string;
    limit?: string;
    startDate?: string;
    endDate?: string;
    month?: string;
  };
}

export default async function PatientsPage({ searchParams }: PatientsPageProps) {
  const search      = searchParams?.search || '';
  const currentPage = Number(searchParams?.page)  || 1;
  const perPage     = Number(searchParams?.limit) || 10;
  const startDate   = searchParams?.startDate;
  const endDate     = searchParams?.endDate;
  const month       = searchParams?.month;

  const whereClause: any = {};

  if (search) {
    whereClause.OR = [
      { name:      { contains: search, mode: 'insensitive' as const } },
      { contact:   { contains: search, mode: 'insensitive' as const } },
      { patientId: { contains: search, mode: 'insensitive' as const } },
    ];
  }

  const visitFilter: any = {};
  if (month) {
    const [year, monthNum] = month.split('-').map(Number);
    visitFilter.visitDate = {
      gte: new Date(year, monthNum - 1, 1),
      lt:  new Date(year, monthNum, 1),
    };
  } else if (startDate || endDate) {
    visitFilter.visitDate = {};
    if (startDate) visitFilter.visitDate.gte = new Date(startDate);
    if (endDate) {
      const e = new Date(endDate);
      e.setDate(e.getDate() + 1);
      visitFilter.visitDate.lt = e;
    }
  }

  if (Object.keys(visitFilter).length > 0) {
    whereClause.visits = { some: visitFilter };
  }

  const [patients, totalPatients] = await Promise.all([
    prisma.patient.findMany({
      where: whereClause,
      select: {
        id: true, patientId: true, name: true,
        age: true, gender: true, contact: true,
        visits: {
          select: { visitDate: true },
          orderBy: { visitDate: 'desc' },
          take: 1,
        },
        _count: { select: { visits: true } },
      },
      skip: (currentPage - 1) * perPage,
      take: perPage,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.patient.count({ where: whereClause }),
  ]);

  return (
    <div className="space-y-5">
      <PageHero
        eyebrow="Patient Management"
        eyebrowIcon={<Users className="h-3.5 w-3.5" />}
        title="Patient Records"
        subtitle="Manage and track all patient information"
        stats={[{ label: 'Total', value: totalPatients.toLocaleString('en-IN') }]}
      />
      <Suspense fallback={
        <div className="bg-white rounded-xl border border-gray-100 flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-brand-teal border-b-transparent" />
        </div>
      }>
        <PatientTable
          patients={patients}
          totalPatients={totalPatients}
          currentPage={currentPage}
          perPage={perPage}
        />
      </Suspense>
    </div>
  );
}
