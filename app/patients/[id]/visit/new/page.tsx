import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { verifyToken } from '@/lib/auth';
import prisma from '@/lib/prisma';
import VisitForm from '@/components/VisitForm';

interface AddVisitPageProps {
  params: { id: string };
}

const AddVisitPage = async ({ params }: AddVisitPageProps) => {
  // Server-side auth guard — prevents unauthenticated direct URL access
  const token = cookies().get('auth-token')?.value;
  if (!token || !verifyToken(token)) {
    redirect('/auth/login');
  }

  const patient = await prisma.patient.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      patientId: true,
      name: true,
      age: true,
      gender: true,
      contact: true,
    },
  });

  if (!patient) {
    notFound();
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border-2 border-brand-teal">
        <div className="flex items-center space-x-3 mb-2">
          <span className="text-sm font-bold text-brand-teal bg-brand-teal/10 px-3 py-1 rounded-full">
            {patient.patientId}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-teal">{patient.name}</h1>
        </div>
        <p className="text-sm text-gray-600">
          {patient.age && `${patient.age} years`}
          {patient.gender && ` • ${patient.gender}`}
          {patient.contact && ` • ${patient.contact}`}
        </p>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border-2 border-gray-100">
        <h2 className="text-xl font-bold text-brand-teal mb-4">Add New Visit</h2>
        <VisitForm patientId={patient.id} />
      </div>
    </div>
  );
};

export default AddVisitPage;
