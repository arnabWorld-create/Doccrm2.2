'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDate } from '@/utils/formatDate';
import {
  FileText, ArrowLeft, Pill, Plus, Calendar, Activity,
  Pencil, Trash2, User, Phone, Droplet, AlertTriangle,
  RefreshCw, Thermometer, Heart, Wind, Gauge, FlaskConical,
  ClipboardList, Stethoscope, FlaskRound, CheckCircle, Clock,
} from 'lucide-react';
import PrescriptionPrint from '@/components/PrescriptionPrint';
import ConfirmModal from '@/components/ConfirmModal';
import WhatsAppShareButton from '@/components/WhatsAppShareButton';

interface PatientDetailPageProps {
  params: { id: string };
}

export default function PatientDetailPage({ params }: PatientDetailPageProps) {
  const router = useRouter();
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [visitToDelete, setVisitToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [clinicProfile, setClinicProfile] = useState<any>(null);
  const [visitPage, setVisitPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  // Map of visitId → ref for the hidden prescription DOM node
  const prescriptionRefs = React.useRef<Record<string, React.RefObject<HTMLDivElement>>>({});

  useEffect(() => { fetchPatient(1, true); }, [params.id]);

  const fetchPatient = async (page = 1, reset = false) => {
    if (page === 1) setLoading(true);
    else setIsLoadingMore(true);
    try {
      const response = await fetch(`/api/patients/${params.id}?visitPage=${page}&visitLimit=20`);
      if (!response.ok) { router.push('/patients'); return; }
      const data = await response.json();
      if (reset || page === 1) {
        setPatient(data);
      } else {
        // Append additional visits for "load more"
        setPatient((prev: any) => prev ? {
          ...data,
          visits: [...(prev.visits || []), ...(data.visits || [])],
        } : data);
      }
      setVisitPage(page);
    } catch { router.push('/patients'); }
    finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleDeleteVisit = (visitId: string) => {
    setVisitToDelete(visitId);
    setDeleteModalOpen(true);
  };

  const confirmDeleteVisit = async () => {
    if (!visitToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/patients/${params.id}/visits/${visitToDelete}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteModalOpen(false);
        setVisitToDelete(null);
        fetchPatient(1, true);
      } else { alert('Failed to delete visit'); }
    } catch { alert('Failed to delete visit'); }
    finally { setIsDeleting(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-brand-teal border-b-transparent" />
    </div>
  );
  if (!patient) return null;

  // Use pagination total when available so the stat card shows the real count
  // even when only the first page of visits is loaded.
  const totalVisits = patient.visitPagination?.total ?? patient.visits?.length ?? 0;
  const lastVisit = patient.visits?.[0];

  return (
    <div className="space-y-5">

      {/* ── Patient Header Card ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Top accent bar */}
        <div className="h-1.5 bg-gradient-to-r from-brand-teal via-brand-teal/70 to-brand-teal/30" />

        <div className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">

            {/* Avatar + Info */}
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-brand-teal flex items-center justify-center flex-shrink-0 shadow-sm">
                <User className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-brand-teal bg-brand-teal/10 px-2.5 py-0.5 rounded-full">
                    {patient.patientId}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
                  {patient.name}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-1.5 text-sm text-gray-500">
                  {patient.age && (
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />{patient.age} yrs
                    </span>
                  )}
                  {patient.gender && (
                    <span className="text-gray-300">·</span>
                  )}
                  {patient.gender && <span>{patient.gender}</span>}
                  {patient.contact && (
                    <>
                      <span className="text-gray-300">·</span>
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />{patient.contact}
                      </span>
                    </>
                  )}
                </div>

                {/* Medical tags */}
                {(patient.bloodGroup || patient.allergies || patient.chronicConditions) && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {patient.bloodGroup && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 rounded-lg text-xs font-semibold border border-red-100">
                        <Droplet className="h-3 w-3" />{patient.bloodGroup}
                      </span>
                    )}
                    {patient.allergies && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 text-orange-700 rounded-lg text-xs font-medium border border-orange-100">
                        <AlertTriangle className="h-3 w-3" />{patient.allergies}
                      </span>
                    )}
                    {patient.chronicConditions && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium border border-purple-100">
                        <RefreshCw className="h-3 w-3" />{patient.chronicConditions}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
              <Link href="/patients">
                <button className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all">
                  <ArrowLeft className="h-4 w-4" />Back
                </button>
              </Link>
              <Link href={`/patients/${patient.id}/visit/new`}>
                <button className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 text-sm font-medium text-white bg-brand-teal hover:bg-brand-teal/90 rounded-lg shadow-sm transition-all">
                  <Plus className="h-4 w-4" />Add Visit
                </button>
              </Link>
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-gray-100">
            <div className="text-center">
              <p className="text-2xl font-bold text-brand-teal">{totalVisits}</p>
              <p className="text-xs text-gray-400 mt-0.5">Total Visits</p>
            </div>
            <div className="text-center border-x border-gray-100">
              <p className="text-sm font-semibold text-gray-700">
                {lastVisit ? new Date(lastVisit.visitDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Last Visit</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-700">
                {patient.visits?.find((v: any) => v.followUpDate)
                  ? new Date(patient.visits.find((v: any) => v.followUpDate).followUpDate)
                      .toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                  : '—'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Next Follow-up</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Visit History ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="h-5 w-5 text-brand-teal" />
          <h3 className="text-lg font-bold text-gray-900">Visit History</h3>
          <span className="ml-1 text-xs font-semibold bg-brand-teal/10 text-brand-teal px-2 py-0.5 rounded-full">
            {totalVisits}
          </span>
        </div>

        {totalVisits > 0 ? (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-3.5 top-0 bottom-0 w-px bg-gray-100 hidden sm:block" />

            <div className="space-y-5">
              {patient.visits.map((visit: any, index: number) => {
                const reports = visit.reports ? JSON.parse(visit.reports as string) : [];
                // Use total from pagination if available; fall back to loaded-visits count.
                // Visits are ordered newest-first, so visit #1 from the top is the newest.
                const totalForNum = patient.visitPagination?.total ?? totalVisits;
                const visitNum = totalForNum - index;
                // Create a stable ref for each visit's prescription node
                if (!prescriptionRefs.current[visit.id]) {
                  prescriptionRefs.current[visit.id] = React.createRef<HTMLDivElement>();
                }
                const rxRef = prescriptionRefs.current[visit.id];
                return (
                  <div key={visit.id} className="relative sm:pl-10">
                    {/* Timeline dot */}
                    <div className="absolute left-0 top-5 w-7 h-7 rounded-full bg-brand-teal/10 border-2 border-brand-teal flex items-center justify-center hidden sm:flex z-10">
                      <span className="text-[9px] font-bold text-brand-teal">{visitNum}</span>
                    </div>

                    <div className="border border-gray-100 rounded-xl overflow-hidden hover:border-brand-teal/30 hover:shadow-sm transition-all">
                      {/* Visit header */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-white bg-brand-teal px-2.5 py-1 rounded-full">
                            Visit #{visitNum}
                          </span>
                          <span className="text-xs font-medium text-gray-500 bg-white px-2 py-0.5 rounded-md border border-gray-200">
                            {visit.visitType}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(visit.visitDate)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* WhatsApp */}
                          {patient.contact && (
                            <WhatsAppShareButton
                              patient={{
                                id: patient.id,
                                patientId: patient.patientId,
                                name: patient.name,
                                age: patient.age,
                                gender: patient.gender,
                                contact: patient.contact,
                              }}
                              visit={visit}
                              clinicProfile={clinicProfile}
                              prescriptionRef={rxRef}
                            />
                          )}
                          <Link href={`/patients/${patient.id}/visit/${visit.id}/edit`}>
                            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-all">
                              <Pencil className="h-3.5 w-3.5" />Edit
                            </button>
                          </Link>
                          <button
                            onClick={() => handleDeleteVisit(visit.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-brand-red hover:text-white hover:border-brand-red transition-all"
                          >
                            <Trash2 className="h-3.5 w-3.5" />Delete
                          </button>
                          <PrescriptionPrint
                            ref={rxRef}
                            patient={{
                              patientId: patient.patientId,
                              name: patient.name,
                              age: patient.age,
                              gender: patient.gender,
                              contact: patient.contact,
                              address: patient.address,
                            }}
                            visit={visit}
                            onClinicProfileLoad={(p) => setClinicProfile(p)}
                          />
                        </div>
                      </div>

                      {/* Visit detail grid */}
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {visit.chiefComplaint && (
                          <DetailBox
                            icon={<ClipboardList className="h-3.5 w-3.5" />}
                            label="Chief Complaint"
                            color="blue"
                            value={visit.chiefComplaint}
                          />
                        )}
                        {visit.signs && (
                          <DetailBox
                            icon={<Activity className="h-3.5 w-3.5" />}
                            label="Signs & Symptoms"
                            color="purple"
                            value={visit.signs}
                            pre
                          />
                        )}
                        {visit.investigations && (
                          <DetailBox
                            icon={<FlaskConical className="h-3.5 w-3.5" />}
                            label="Investigations"
                            color="indigo"
                            value={visit.investigations}
                            pre
                          />
                        )}
                        {visit.diagnosis && (
                          <DetailBox
                            icon={<CheckCircle className="h-3.5 w-3.5" />}
                            label="Diagnosis"
                            color="green"
                            value={visit.diagnosis}
                          />
                        )}
                        {visit.treatment && (
                          <DetailBox
                            icon={<Stethoscope className="h-3.5 w-3.5" />}
                            label="Treatment"
                            color="teal"
                            value={visit.treatment}
                            pre
                          />
                        )}

                        {/* Medicines */}
                        {((visit.medications && visit.medications.length > 0) || visit.medicines) && (
                          <div className="md:col-span-2 bg-orange-50 border border-orange-100 rounded-lg p-3">
                            <h4 className="flex items-center gap-1.5 text-xs font-bold text-orange-600 uppercase tracking-wide mb-2">
                              <Pill className="h-3.5 w-3.5" />Medicines
                            </h4>
                            {visit.medications?.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                                {visit.medications.map((med: any, idx: number) => (
                                  <div key={idx} className="flex items-start gap-1.5">
                                    <span className="text-orange-400 mt-0.5 flex-shrink-0">•</span>
                                    <span className="text-sm text-gray-700">
                                      {med.medicine}{med.dose && ` — ${med.dose}`}{med.frequency && ` (${med.frequency})`}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{visit.medicines}</p>
                            )}
                          </div>
                        )}

                        {/* Vitals */}
                        {(visit.temp || visit.spo2 || visit.pulse || visit.bloodPressure || visit.bpSystolic || visit.bpDiastolic || visit.rbs) && (
                          <div className="bg-rose-50 border border-rose-100 rounded-lg p-3">
                            <h4 className="flex items-center gap-1.5 text-xs font-bold text-rose-600 uppercase tracking-wide mb-2.5">
                              <Heart className="h-3.5 w-3.5" />Vitals
                            </h4>
                            <div className="grid grid-cols-2 gap-2">
                              {visit.temp && <VitalItem icon={<Thermometer className="h-3 w-3" />} label="Temp" value={`${visit.temp}°F`} />}
                              {visit.spo2 && <VitalItem icon={<Wind className="h-3 w-3" />} label="SpO₂" value={`${visit.spo2}%`} />}
                              {visit.pulse && <VitalItem icon={<Heart className="h-3 w-3" />} label="Pulse" value={`${visit.pulse} bpm`} />}
                              {visit.bloodPressure && <VitalItem icon={<Gauge className="h-3 w-3" />} label="BP" value={visit.bloodPressure} />}
                              {visit.bpSystolic && visit.bpDiastolic && <VitalItem icon={<Gauge className="h-3 w-3" />} label="BP" value={`${visit.bpSystolic}/${visit.bpDiastolic}`} />}
                              {visit.rbs && <VitalItem icon={<FlaskRound className="h-3 w-3" />} label="RBS" value={`${visit.rbs} mg/dl`} />}
                            </div>
                          </div>
                        )}

                        {/* Follow-up */}
                        {visit.followUpDate && (
                          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                            <h4 className="flex items-center gap-1.5 text-xs font-bold text-amber-600 uppercase tracking-wide mb-2">
                              <Clock className="h-3.5 w-3.5" />Follow-up
                            </h4>
                            <p className="text-sm font-semibold text-gray-800">{formatDate(visit.followUpDate)}</p>
                            {visit.followUpNotes && (
                              <p className="text-xs text-gray-500 mt-1">{visit.followUpNotes}</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Reports */}
                      {reports.length > 0 && (
                        <div className="px-4 pb-4">
                          <div className="pt-3 border-t border-gray-100">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Reports</h4>
                            <div className="flex flex-wrap gap-2">
                              {reports.map((report: any, idx: number) => (
                                <a key={idx} href={report.url} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-teal bg-brand-teal/10 hover:bg-brand-teal hover:text-white rounded-lg border border-brand-teal/20 transition-all">
                                  <FileText className="h-3 w-3" />{report.filename}
                                </a>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Load more visits if pagination has more pages */}
            {patient.visitPagination && visitPage < patient.visitPagination.pages && (
              <div className="mt-6 text-center">
                <p className="text-xs text-gray-400 mb-3">
                  Showing {patient.visits?.length} of {patient.visitPagination.total} visits
                </p>
                <button
                  onClick={() => fetchPatient(visitPage + 1)}
                  disabled={isLoadingMore}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-brand-teal border-2 border-brand-teal rounded-lg hover:bg-brand-teal hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isLoadingMore ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-brand-teal border-b-transparent" />
                      Loading...
                    </>
                  ) : (
                    <>Load more visits</>
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity className="h-8 w-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">No visits recorded yet</p>
            <p className="text-sm text-gray-400 mt-1 mb-4">Start tracking this patient's health journey</p>
            <Link href={`/patients/${patient.id}/visit/new`}>
              <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-teal hover:bg-brand-teal/90 rounded-lg transition-all">
                <Plus className="h-4 w-4" />Add First Visit
              </button>
            </Link>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setVisitToDelete(null); }}
        onConfirm={confirmDeleteVisit}
        title="Delete Visit"
        message="Are you sure you want to delete this visit? This action cannot be undone and all visit data including prescriptions will be permanently removed."
        confirmText="Delete Visit"
        isLoading={isDeleting}
      />
    </div>
  );
}

// ── Helper components ─────────────────────────────────────────────────────────

const colorMap: Record<string, { bg: string; border: string; label: string }> = {
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-100',   label: 'text-blue-600' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-100', label: 'text-purple-600' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-100', label: 'text-indigo-600' },
  green:  { bg: 'bg-green-50',  border: 'border-green-100',  label: 'text-green-600' },
  teal:   { bg: 'bg-teal-50',   border: 'border-teal-100',   label: 'text-teal-600' },
};

function DetailBox({
  icon, label, color, value, pre = false,
}: {
  icon: React.ReactNode;
  label: string;
  color: keyof typeof colorMap;
  value: string;
  pre?: boolean;
}) {
  const c = colorMap[color];
  return (
    <div className={`${c.bg} border ${c.border} rounded-lg p-3`}>
      <h4 className={`flex items-center gap-1.5 text-xs font-bold ${c.label} uppercase tracking-wide mb-1.5`}>
        {icon}{label}
      </h4>
      <p className={`text-sm text-gray-700 ${pre ? 'whitespace-pre-wrap' : ''}`}>{value}</p>
    </div>
  );
}

function VitalItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-rose-400">{icon}</span>
      <span className="text-xs text-gray-500">{label}:</span>
      <span className="text-sm font-semibold text-gray-800">{value}</span>
    </div>
  );
}
