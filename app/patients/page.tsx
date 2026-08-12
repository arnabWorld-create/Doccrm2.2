'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import PatientTable from '@/components/PatientTable';
import { PageHero } from '@/components/ui/page-hero';
import { Users } from 'lucide-react';

interface Patient {
  id: string;
  patientId: string;
  name: string;
  age: number | null;
  gender: string | null;
  contact: string | null;
  visits: { visitDate: Date }[];
  _count?: { visits: number };
}

function PatientsContent() {
  const searchParams = useSearchParams();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [totalPatients, setTotalPatients] = useState(0);
  const [loading, setLoading] = useState(true);

  const search    = searchParams.get('search')    || '';
  const page      = Number(searchParams.get('page'))  || 1;
  const limit     = Number(searchParams.get('limit')) || 10;
  const startDate = searchParams.get('startDate') || '';
  const endDate   = searchParams.get('endDate')   || '';
  const month     = searchParams.get('month')     || '';

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search)       params.set('search', search);
      if (page > 1)     params.set('page', String(page));
      if (limit !== 10) params.set('limit', String(limit));
      if (startDate)    params.set('startDate', startDate);
      if (endDate)      params.set('endDate', endDate);
      if (month)        params.set('month', month);

      const res = await fetch(`/api/patients?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();

      setPatients(data.data || []);
      setTotalPatients(data.pagination?.total ?? 0);
    } catch (err) {
      console.error('Failed to fetch patients:', err);
      setPatients([]);
      setTotalPatients(0);
    } finally {
      setLoading(false);
    }
  }, [search, page, limit, startDate, endDate, month]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  return (
    <div className="space-y-5">
      <PageHero
        eyebrow="Patient Management"
        eyebrowIcon={<Users className="h-3.5 w-3.5" />}
        title="Patient Records"
        subtitle="Manage and track all patient information"
        stats={[
          { label: 'Total', value: totalPatients.toLocaleString('en-IN') },
        ]}
      />

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-brand-teal border-b-transparent" />
        </div>
      ) : (
        <PatientTable
          patients={patients}
          totalPatients={totalPatients}
          currentPage={page}
          perPage={limit}
        />
      )}
    </div>
  );
}

export default function PatientsPage() {
  return (
    <Suspense fallback={
      <div className="space-y-5">
        <div className="h-32 bg-white rounded-2xl animate-pulse border border-gray-100" />
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-brand-teal border-b-transparent" />
        </div>
      </div>
    }>
      <PatientsContent />
    </Suspense>
  );
}
