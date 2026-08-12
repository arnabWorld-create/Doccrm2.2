'use client';

import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { patientSchema, PatientFormData } from '@/lib/validations';
import { useRouter } from 'next/navigation';
// FIX: Import React to use React.FC and other React features.
import React, { useState } from 'react';
import ReportsUploader from './ReportsUploader';
import MedicineInputStructured from './MedicineInputStructured';
import ConditionInput from './ConditionInput';
import BPInput from './BPInput';
import { VisitFeeForm } from './VisitFeeForm';
import { Toast, type ToastState } from './ui/Toast';
import type { Patient } from '@prisma/client';

interface PatientFormProps {
  defaultValues?: Patient | null;
  appointmentId?: string;
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


const PatientForm: React.FC<PatientFormProps> = ({ defaultValues, appointmentId }) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Parse reports from JSON string if it exists
  const parseReports = (reports: any) => {
    if (!reports) return [];
    if (Array.isArray(reports)) return reports;
    if (typeof reports === 'string') {
      try {
        return JSON.parse(reports);
      } catch {
        return [];
      }
    }
    return [];
  };

  const methods = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      ...defaultValues,
      age: defaultValues?.age ?? undefined,
    } as any,
  });

  const { register, handleSubmit, formState: { errors } } = methods;

  const onSubmit = async (formData: PatientFormData) => {
    setIsSubmitting(true);
    setError(null);

    // Check if we're editing (defaultValues has an id) or creating new
    const isEditing = defaultValues && 'id' in defaultValues && defaultValues.id;
    const apiEndpoint = isEditing ? `/api/patients/${defaultValues.id}` : '/api/patients';
    const method = isEditing ? 'PUT' : 'POST';

    try {
      // Save custom medicines in background (don't wait for it)
      if (formData.medicines) {
        const medicines = formData.medicines.split('\n').map(m => m.trim()).filter(m => m);
        // Fire and forget - save medicines in background without blocking
        Promise.all(
          medicines.map(medicine => 
            medicine ? fetch('/api/medicines', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: medicine }),
            }).catch(err => console.error('Failed to save medicine:', medicine, err)) : Promise.resolve()
          )
        ).catch(err => console.error('Failed to save some medicines:', err));
      }

      // Save structured medicines in background
      if (formData.medications && Array.isArray(formData.medications)) {
        Promise.all(
          formData.medications.map(med => 
            med.name ? fetch('/api/medicines', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: med.name.trim() }),
            }).catch(err => console.error('Failed to save medicine:', med.name, err)) : Promise.resolve()
          )
        ).catch(err => console.error('Failed to save some medicines:', err));
      }

      // Clean up the data - remove undefined values and convert empty strings to null
      const cleanData = Object.entries(formData).reduce((acc, [key, value]) => {
        if (value === undefined || value === '') {
          acc[key] = null;
        } else {
          acc[key] = value;
        }
        return acc;
      }, {} as any);

      const response = await fetch(apiEndpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error:', errorData);
        const msg = errorData.message || 'Something went wrong. Please try again.';
        setError(msg);
        setToast({ message: msg, type: 'error' });
        return;
      }
      
      const responseData = await response.json();
      
      // If this patient was created from an appointment, link them
      if (appointmentId && !isEditing) {
        try {
          await fetch(`/api/appointments/${appointmentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              patientId: responseData.id,
              tempPatientName: null,
              tempPatientContact: null,
            }),
          });
          // Redirect to the appointment immediately
          router.push(`/appointments/${appointmentId}`);
          return;
        } catch (error) {
          console.error('Failed to link appointment:', error);
        }
      }
      
      // Redirect immediately without waiting for refresh
      router.push('/patients');
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
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700 flex items-center">
              <span className="mr-2">⚠</span>
              {error}
            </p>
          </div>
        )}

        {/* Personal Information Card */}
        <div className="bg-white p-4 sm:p-6 md:p-8 rounded-xl shadow-lg border-2 border-gray-100">
          <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b-2 border-brand-teal">
            <div className="p-2 sm:p-3 bg-brand-teal rounded-lg sm:rounded-xl">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-brand-teal">Personal Information</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <Input name="name" label="Full Name" register={register} error={errors.name} placeholder="John Doe" type="text" />
            <Input name="age" label="Age" register={register} error={errors.age} placeholder="35" type="number" />
            <Select name="gender" label="Gender" register={register} error={errors.gender}>
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
            </Select>
            <Input name="contact" label="Contact Number" register={register} error={errors.contact} placeholder="+91-9876543210" type="text" />
            <Textarea name="address" label="Address" register={register} error={errors.address} placeholder="Street, City, State, PIN" />
            <Input name="consultationDate" label="Consultation Date" register={register} error={errors.consultationDate} type="date" />
            <Input name="followUpDate" label="Follow-up Date" register={register} error={errors.followUpDate} type="date" />
          </div>
        </div>

        {/* Medical History Card */}
        <div className="bg-white p-4 sm:p-6 md:p-8 rounded-xl shadow-lg border-2 border-gray-100">
          <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b-2 border-red-500">
            <div className="p-2 sm:p-3 bg-red-500 rounded-lg sm:rounded-xl">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-red-500">Medical History</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <Select name="bloodGroup" label="Blood Group" register={register} error={errors.bloodGroup}>
                <option value="">Select Blood Group</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
            </Select>
            <Textarea name="allergies" label="Allergies" register={register} error={errors.allergies} placeholder="e.g., Penicillin, Peanuts, Dust..." />
            <div className="md:col-span-2">
              <Textarea name="chronicConditions" label="Chronic Conditions" register={register} error={errors.chronicConditions} placeholder="e.g., Diabetes, Hypertension, Asthma..." />
            </div>
          </div>
        </div>

        {/* Vitals Card */}
        <div className="bg-white p-4 sm:p-6 md:p-8 rounded-xl shadow-lg border-2 border-gray-100">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b-2 border-brand-red">
              <div className="p-2 sm:p-3 bg-brand-red rounded-lg sm:rounded-xl">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-brand-red">Vitals</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <Input name="temp" label="Temperature (°F)" register={register} error={errors.temp} placeholder="98.6" type="number" step="0.1" />
                <Input name="spo2" label="SpO2 (%)" register={register} error={errors.spo2} placeholder="98" type="number" />
                <Input name="pulse" label="Pulse (bpm)" register={register} error={errors.pulse} placeholder="72" type="number" />
                <BPInput name="bloodPressure" label="Blood Pressure (mmHg)" register={register} error={errors.bloodPressure} placeholder="120/80" />
                <Input name="rbs" label="RBS (mg/dl)" register={register} error={errors.rbs} placeholder="100" type="number" />
            </div>
        </div>

        {/* Medical Details Card */}
        <div className="bg-white p-4 sm:p-6 md:p-8 rounded-xl shadow-lg border-2 border-gray-100">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b-2 border-brand-teal">
              <div className="p-2 sm:p-3 bg-brand-teal rounded-lg sm:rounded-xl">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-brand-teal">Medical Details</h3>
            </div>
            <div className="space-y-4 sm:space-y-6">
                <Textarea name="chiefComplaint" label="Chief Complaint" register={register} error={errors.chiefComplaint} placeholder="Main reason for visit..."/>
                <ConditionInput name="signs" label="Signs & Symptoms" error={errors.signs} placeholder="e.g., Fever, Cough, Headache (type to see suggestions)..." />
                <Textarea name="investigations" label="Investigations" register={register} error={errors.investigations} placeholder="e.g., CBC, X-Ray Chest..."/>
                <Textarea name="diagnosis" label="Diagnosis" register={register} error={errors.diagnosis} placeholder="e.g., Viral Fever, Hypertension..."/>
                <Textarea name="treatment" label="Treatment" register={register} error={errors.treatment} placeholder="e.g., Oxygen therapy, bed rest..."/>
                <MedicineInputStructured name="medications" label="Medicines" error={errors.medications} />
                <Textarea name="history" label="Medical History / Summary" register={register} error={errors.history} placeholder="e.g., History of hypertension..."/>
            </div>
        </div>

        {/* Reports & Referrals Card */}
        <div className="bg-white p-4 sm:p-6 md:p-8 rounded-xl shadow-lg border-2 border-gray-100">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b-2 border-brand-yellow">
              <div className="p-2 sm:p-3 bg-brand-yellow rounded-lg sm:rounded-xl">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-brand-yellow">Reports & Referrals</h3>
            </div>
            <div className="space-y-4 sm:space-y-6">
                <ReportsUploader />
                <Input name="referredTo" label="Referred To" register={register} error={errors.referredTo} placeholder="Dr. Jane Smith (Cardiologist)" type="text" />
            </div>
        </div>

        {/* Visit Fees */}
        <VisitFeeForm />

        {error && (
          <div className="bg-brand-red/10 border-l-4 border-brand-red p-4 rounded-lg">
            <div className="flex items-center">
              <span className="text-brand-red text-xl mr-3">⚠</span>
              <p className="text-brand-red font-medium">{error}</p>
            </div>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row justify-end gap-3 sm:space-x-4 pt-4">
          <button 
            type="button" 
            onClick={() => router.back()} 
            className="w-full sm:w-auto px-6 py-3 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-8 py-3 text-sm font-medium text-white bg-brand-teal hover:bg-brand-teal/90 rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : (defaultValues ? 'Update Patient' : 'Add Patient')}
          </button>
        </div>
      </form>
    </FormProvider>
  );
};

export default PatientForm;