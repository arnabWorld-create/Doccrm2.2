'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import CalendarView from '@/components/CalendarView';
import { PageHero } from '@/components/ui/page-hero';
import { Calendar } from 'lucide-react';

function CalendarContent() {
  const searchParams = useSearchParams();
  const today = new Date();
  const currentMonth = searchParams.get('month') ? parseInt(searchParams.get('month')!) : today.getMonth();
  const currentYear  = searchParams.get('year')  ? parseInt(searchParams.get('year')!)  : today.getFullYear();

  const [consultations, setConsultations] = useState<any[]>([]);
  const [followUps, setFollowUps]         = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    const firstDay = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
    const lastDay  = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];

    setLoading(true);
    fetch(`/api/calendar?startDate=${firstDay}&endDate=${lastDay}`)
      .then(r => r.ok ? r.json() : { consultations: [], followUps: [] })
      .then(data => {
        setConsultations(data.consultations ?? []);
        setFollowUps(data.followUps ?? []);
      })
      .catch(() => { setConsultations([]); setFollowUps([]); })
      .finally(() => setLoading(false));
  }, [currentMonth, currentYear]);

  return (
    <div className="space-y-5">
      <PageHero
        eyebrow="Calendar"
        eyebrowIcon={<Calendar className="h-3.5 w-3.5" />}
        title="Appointment Calendar"
        subtitle={`${new Date(currentYear, currentMonth).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`}
        stats={[
          { label: 'Consultations', value: consultations.length },
          { label: 'Follow-ups',    value: followUps.length },
        ]}
      />
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100 flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-brand-teal border-b-transparent" />
        </div>
      ) : (
        <CalendarView
          consultations={consultations}
          followUps={followUps}
          currentMonth={currentMonth}
          currentYear={currentYear}
        />
      )}
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-brand-teal border-b-transparent" />
      </div>
    }>
      <CalendarContent />
    </Suspense>
  );
}
