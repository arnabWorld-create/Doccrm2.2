import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { verifyToken } from '@/lib/auth';
import PatientForm from '@/components/PatientForm';
import prisma from '@/lib/prisma';

interface EditPatientPageProps {
  params: {
    id: string;
  };
}

const EditPatientPage = async ({ params }: EditPatientPageProps) => {
  // Server-side auth guard
  const token = cookies().get('auth-token')?.value;
  if (!token || !verifyToken(token)) {
    redirect('/auth/login');
  }

  const patient = await prisma.patient.findUnique({
    where: { id: params.id },
    include: {
      visits: {
        orderBy: { visitDate: 'desc' },
        take: 1,
        include: { medications: true },
      },
    },
  });

  if (!patient) {
    notFound();
  }

  // Merge first visit data into patient data for form
  const patientWithVisitData = {
    ...patient,
    ...(patient.visits && patient.visits.length > 0 ? {
      temp: (patient.visits[0] as any).temp,
      spo2: (patient.visits[0] as any).spo2,
      pulse: (patient.visits[0] as any).pulse,
      bloodPressure: (patient.visits[0] as any).bloodPressure,
      bpSystolic: (patient.visits[0] as any).bpSystolic,
      bpDiastolic: (patient.visits[0] as any).bpDiastolic,
      rbs: (patient.visits[0] as any).rbs,
      weight: (patient.visits[0] as any).weight,
      chiefComplaint: (patient.visits[0] as any).chiefComplaint,
      signs: (patient.visits[0] as any).signs,
      investigations: (patient.visits[0] as any).investigations,
      diagnosis: (patient.visits[0] as any).diagnosis,
      treatment: (patient.visits[0] as any).treatment,
      consultationDate: (patient.visits[0] as any).visitDate,
      followUpDate: (patient.visits[0] as any).followUpDate,
      followUpNotes: (patient.visits[0] as any).followUpNotes,
      referredTo: (patient.visits[0] as any).referredTo,
      medications: (patient.visits[0] as any).medications,
    } : {}),
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center space-x-3 sm:space-x-4">
        <div className="p-2 sm:p-3 md:p-4 bg-brand-yellow rounded-lg sm:rounded-xl shadow-lg">
          <svg className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-brand-teal">
            Edit Patient
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1 truncate">Update patient information for <span className="font-semibold text-brand-yellow">{patient.name}</span></p>
        </div>
      </div>
      <PatientForm defaultValues={patientWithVisitData} />
    </div>
  );
};

export default EditPatientPage;