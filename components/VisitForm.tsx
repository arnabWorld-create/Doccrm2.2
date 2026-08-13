'use client';

import { useForm, FormProvider } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import ReportsUploader from './ReportsUploader';
import MedicineInputStructured from './MedicineInputStructured';
import ConditionInput from './ConditionInput';
import BPInput from './BPInput';
import { VisitFeeForm } from './VisitFeeForm';
import { Toast, type ToastState } from './ui/Toast';

interface VisitFormProps {
  patientId: string;
  initialData?: any;
  onSubmit?: (data: any) => Promise<void>;
  isEdit?: boolean;
}

interface Medicine {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  timing: string;
  duration: string;
  startFrom: string;
  instructions: string;
}

interface VisitFormData {
  visitDate: string;
  visitType: string;
  chiefComplaint?: string;
  signs?: string;
  investigations?: string;
  diagnosis?: string;
  treatment?: string;
  medicines?: string;
  medications?: Medicine[];
  temp?: string;
  spo2?: string;
  pulse?: string;
  bloodPressure?: string;
  bpSystolic?: string;
  bpDiastolic?: string;
  rbs?: string;
  notes?: string;
  followUpDate?: string;
  followUpNotes?: string;
  referredTo?: string;
  reports?: string;
  paidBy?: string;
}

const Input = ({ name, label, register, error, ...rest }: any) => (
  <div>
    <label htmlFor={name} className="block text-sm font-semibold text-brand-teal mb-2">{label}</label>
    <input 
      id={name} 
      {...register(name)} 
      {...rest} 
      className="block w-full rounded-lg border-2 border-gray-200 px-4 py-2.5 text-sm focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none transition-all" 
    />
    {error && <p className="mt-1.5 text-sm text-brand-red flex items-center"><span className="mr-1">⚠</span>{error.message}</p>}
  </div>
);

const Textarea = ({ name, label, register, error, ...rest }: any) => (
  <div>
    <label htmlFor={name} className="block text-sm font-semibold text-brand-teal mb-2">{label}</label>
    <textarea 
      id={name} 
      {...register(name)} 
      {...rest} 
      rows={3} 
      className="block w-full rounded-lg border-2 border-gray-200 px-4 py-2.5 text-sm focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none transition-all resize-none" 
    />
    {error && <p className="mt-1.5 text-sm text-brand-red flex items-center"><span className="mr-1">⚠</span>{error.message}</p>}
  </div>
);

const Select = ({ name, label, register, error, children, ...rest }: any) => (
  <div>
    <label htmlFor={name} className="block text-sm font-semibold text-brand-teal mb-2">{label}</label>
    <select 
      id={name} 
      {...register(name)} 
      {...rest} 
      className="block w-full rounded-lg border-2 border-gray-200 px-4 py-2.5 text-sm focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none transition-all bg-white"
    >
      {children}
    </select>
    {error && <p className="mt-1.5 text-sm text-brand-red flex items-center"><span className="mr-1">⚠</span>{error.message}</p>}
  </div>
);

const VisitForm: React.FC<VisitFormProps> = ({ patientId, initialData, onSubmit: customOnSubmit, isEdit = false }) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Prepare default values
  const getDefaultValues = () => {
    if (initialData) {
      // Convert medications from DB format to form format
      const medications = initialData.medications && Array.isArray(initialData.medications) && initialData.medications.length > 0
        ? initialData.medications.map((med: any) => ({
            id: med.id || Date.now().toString(),
            name: med.medicine || '',
            dose: med.dose || '',
            frequency: med.frequency || '',
            timing: med.timing || '',
            duration: med.duration || '',
            startFrom: med.startFrom || '',
            instructions: med.instructions || '',
          }))
        : [{ id: Date.now().toString(), name: '', dose: '', frequency: '', timing: '', duration: '', startFrom: '', instructions: '' }];

      // Build blood pressure string from systolic/diastolic if available
      let bpString = initialData.bloodPressure || '';
      if (initialData.bpSystolic && initialData.bpDiastolic) {
        bpString = `${initialData.bpSystolic}/${initialData.bpDiastolic}`;
      }

      return {
        visitDate: initialData.visitDate ? new Date(initialData.visitDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        visitType: initialData.visitType || 'Consultation',
        chiefComplaint: initialData.chiefComplaint || '',
        signs: initialData.signs || '',
        investigations: initialData.investigations || '',
        diagnosis: initialData.diagnosis || '',
        treatment: initialData.treatment || '',
        medicines: initialData.medicines || '',
        medications,
        temp: initialData.temp?.toString() || '',
        spo2: initialData.spo2?.toString() || '',
        pulse: initialData.pulse?.toString() || '',
        bloodPressure: bpString,
        bpSystolic: initialData.bpSystolic?.toString() || '',
        bpDiastolic: initialData.bpDiastolic?.toString() || '',
        rbs: initialData.rbs?.toString() || '',
        followUpDate: initialData.followUpDate ? new Date(initialData.followUpDate).toISOString().split('T')[0] : '',
        followUpNotes: initialData.followUpNotes || '',
      };
    }
    return {
      visitDate: new Date().toISOString().split('T')[0],
      visitType: 'Consultation',
      medications: [{ id: Date.now().toString(), name: '', dose: '', frequency: '', timing: '', duration: '', startFrom: '', instructions: '' }],
    };
  };

  const methods = useForm<VisitFormData>({
    defaultValues: getDefaultValues(),
  });

  const { register, handleSubmit, formState: { errors } } = methods;

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Save custom medicines from structured input
      if (data.medications && Array.isArray(data.medications)) {
        for (const med of data.medications) {
          if (med.name && med.name.trim()) {
            try {
              await fetch('/api/medicines', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: med.name.trim() }),
              });
            } catch (error) {
              console.error('Failed to save medicine:', med.name, error);
            }
          }
        }
      }

      // Fees are sent as visitFees array — the API writes them to the VisitFee
      // table directly. Do NOT embed them in notes anymore.
      // Strip any legacy __FEES_JSON__ markers that might have been loaded
      // from old visit notes (edit mode) so they don't get re-saved.
      if (typeof data.notes === 'string') {
        data.notes = data.notes
          .replace(/__FEES_JSON__[\s\S]*?__FEES_JSON__/g, '')
          .trim() || null;
      }

      // Use custom onSubmit if provided (for edit mode)
      if (customOnSubmit) {
        await customOnSubmit(data);
        return;
      }

      // Default behavior for creating new visit
      const response = await fetch(`/api/patients/${patientId}/visits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const msg = errorData.message || 'Something went wrong. Please try again.';
        setError(msg);
        setToast({ message: msg, type: 'error' });
        return;
      }
      
      setToast({ message: 'Visit saved successfully!', type: 'success' });
      setTimeout(() => {
        router.push(`/patients/${patientId}`);
        router.refresh();
      }, 1000);
    } catch (err) {
      console.error('Submit error:', err);
      const msg = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(msg);
      setToast({ message: msg, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormProvider {...methods}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Visit Info */}
        <div className="bg-white p-4 sm:p-6 md:p-8 rounded-xl shadow-lg border-2 border-gray-100">
          <h3 className="text-lg sm:text-xl font-bold text-brand-teal mb-4">Visit Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <Input name="visitDate" label="Visit Date" register={register} error={errors.visitDate} type="date" />
            <Select name="visitType" label="Visit Type" register={register} error={errors.visitType}>
              <option value="Consultation">Consultation</option>
              <option value="Follow-up">Follow-up</option>
              <option value="Emergency">Emergency</option>
            </Select>
          </div>
        </div>

        {/* Vitals */}
        <div className="bg-white p-4 sm:p-6 md:p-8 rounded-xl shadow-lg border-2 border-gray-100">
          <h3 className="text-lg sm:text-xl font-bold text-brand-red mb-4">Vitals</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <Input name="temp" label="Temperature (°F)" register={register} error={errors.temp} placeholder="98.6" type="number" step="0.1" />
            <Input name="spo2" label="SpO2 (%)" register={register} error={errors.spo2} placeholder="98" type="number" />
            <Input name="pulse" label="Pulse (bpm)" register={register} error={errors.pulse} placeholder="72" type="number" />
            <BPInput name="bloodPressure" label="Blood Pressure (mmHg)" register={register} error={errors.bloodPressure} placeholder="120/80" />
            <Input name="rbs" label="RBS (mg/dl)" register={register} error={errors.rbs} placeholder="100" type="number" />
          </div>
        </div>

        {/* Medical Details */}
        <div className="bg-white p-4 sm:p-6 md:p-8 rounded-xl shadow-lg border-2 border-gray-100">
          <h3 className="text-lg sm:text-xl font-bold text-brand-teal mb-4">Medical Details</h3>
          <div className="space-y-4 sm:space-y-6">
            <Textarea name="chiefComplaint" label="Chief Complaint" register={register} error={errors.chiefComplaint} placeholder="Main reason for visit..."/>
            <ConditionInput name="signs" label="Signs & Symptoms" error={errors.signs} placeholder="e.g., Fever, Cough, Headache..." />
            <Textarea name="investigations" label="Investigations" register={register} error={errors.investigations} placeholder="e.g., CBC, X-Ray..."/>
            <Textarea name="diagnosis" label="Diagnosis" register={register} error={errors.diagnosis} placeholder="e.g., Viral Fever, Hypertension..."/>
            <Textarea name="treatment" label="Treatment" register={register} error={errors.treatment} placeholder="e.g., Bed rest, medications..."/>
            <MedicineInputStructured name="medications" label="Medications" error={errors.medications} />
            <Textarea name="notes" label="Additional Notes" register={register} error={errors.notes} placeholder="Any additional observations..."/>
          </div>
        </div>

        {/* Follow-up */}
        <div className="bg-white p-4 sm:p-6 md:p-8 rounded-xl shadow-lg border-2 border-gray-100">
          <h3 className="text-lg sm:text-xl font-bold text-brand-yellow mb-4">Follow-up & Referral</h3>
          <div className="space-y-4 sm:space-y-6">
            <ReportsUploader />
            <Input name="followUpDate" label="Follow-up Date" register={register} error={errors.followUpDate} type="date" />
            <Textarea name="followUpNotes" label="Follow-up Notes" register={register} error={errors.followUpNotes} placeholder="Instructions for follow-up..."/>
            <Input name="referredTo" label="Referred To" register={register} error={errors.referredTo} placeholder="Dr. Name (Specialist)" type="text" />
          </div>
        </div>

        {/* Visit Fees */}
        <VisitFeeForm
          initialFees={initialData?.fees?.map((f: any) => ({
            id: f.id,
            serviceName: f.serviceName,
            amount: f.amount,
            quantity: f.quantity,
            discount: f.discount,
            total: f.total,
          }))}
        />

        {error && (
          <div className="bg-brand-red/10 border-l-4 border-brand-red p-4 rounded-lg">
            <p className="text-brand-red font-medium">{error}</p>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row justify-end gap-3 sm:space-x-4 pt-4">
          <button 
            type="button" 
            onClick={() => router.back()} 
            className="w-full sm:w-auto px-6 py-3 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-8 py-3 text-sm font-medium text-white bg-brand-teal hover:bg-brand-teal/90 rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSubmitting ? (isEdit ? 'Updating Visit...' : 'Saving Visit...') : (isEdit ? 'Update Visit' : 'Save Visit')}
          </button>
        </div>
      </form>
    </FormProvider>
  );
};

export default VisitForm;
