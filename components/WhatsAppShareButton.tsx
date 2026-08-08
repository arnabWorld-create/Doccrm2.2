'use client';

import { useState } from 'react';
import { MessageCircle, Loader2 } from 'lucide-react';

interface Medication {
  medicine: string;
  dose?: string | null;
  frequency?: string | null;
  timing?: string | null;
  duration?: string | null;
  instructions?: string | null;
}

interface Visit {
  id: string;
  visitDate: Date | string;
  chiefComplaint?: string | null;
  diagnosis?: string | null;
  treatment?: string | null;
  medicines?: string | null;
  medications?: Medication[];
  followUpDate?: Date | string | null;
  followUpNotes?: string | null;
}

interface Patient {
  id: string;
  patientId: string;
  name: string;
  age?: number | null;
  gender?: string | null;
  contact?: string | null;
}

interface ClinicProfile {
  clinicName?: string | null;
  doctorName?: string | null;
  phone?: string | null;
}

interface WhatsAppShareButtonProps {
  patient: Patient;
  visit: Visit;
  clinicProfile?: ClinicProfile | null;
  prescriptionRef?: React.RefObject<HTMLDivElement | null>; // kept for API compat, unused
}

export default function WhatsAppShareButton({
  patient,
  visit,
  clinicProfile,
}: WhatsAppShareButtonProps) {
  const [status, setStatus] = useState<'idle' | 'generating' | 'opening'>('idle');

  const phone = patient.contact?.replace(/\D/g, '') ?? '';

  const fmt = (d: Date | string | null | undefined) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '';

  const buildMessage = (pdfUrl: string | null) => {
    const lines: string[] = [];
    const clinic = clinicProfile?.clinicName || 'Faith Clinic';
    if (clinicProfile?.doctorName) lines.push(`👨‍⚕️ Dr. ${clinicProfile.doctorName}`);
    lines.push(`🏥 *${clinic}* — Visit Summary`);
    lines.push('');
    lines.push(`👤 Patient: *${patient.name}*  |  ID: ${patient.patientId}`);
    if (patient.age || patient.gender)
      lines.push(`   ${[patient.age ? `${patient.age} yrs` : null, patient.gender].filter(Boolean).join(' · ')}`);
    lines.push(`📅 Visit Date: ${fmt(visit.visitDate)}`);
    lines.push('');

    if (visit.chiefComplaint) lines.push(`🤒 *Complaint:* ${visit.chiefComplaint}`);
    if (visit.diagnosis)      lines.push(`✅ *Diagnosis:* ${visit.diagnosis}`);
    if (visit.treatment)      lines.push(`💊 *Treatment:* ${visit.treatment}`);

    const meds = visit.medications;
    if (meds && meds.length > 0) {
      lines.push('');
      lines.push('💊 *Medicines:*');
      meds.forEach((m) => {
        let line = `  • *${m.medicine}*`;
        if (m.dose)      line += ` — ${m.dose}`;
        if (m.frequency) line += ` (${m.frequency})`;
        if (m.timing)    line += ` | ${m.timing}`;
        if (m.duration)  line += ` | ${m.duration}`;
        lines.push(line);
      });
    } else if (visit.medicines) {
      lines.push('');
      lines.push(`💊 *Medicines:*\n${visit.medicines}`);
    }

    if (visit.followUpDate) {
      lines.push('');
      lines.push(`🔔 *Follow-up:* ${fmt(visit.followUpDate)}`);
      if (visit.followUpNotes) lines.push(`   ${visit.followUpNotes}`);
    }
    if (pdfUrl) {
      lines.push('');
      lines.push(`📄 *Prescription PDF:*`);
      lines.push(pdfUrl);
    }
    if (clinicProfile?.phone) lines.push(`\n📞 Clinic: ${clinicProfile.phone}`);
    lines.push('\n_Sent via Faith Clinic_');
    return encodeURIComponent(lines.join('\n'));
  };

  const handleShare = async () => {
    if (!phone) { alert('No contact number found for this patient.'); return; }

    try {
      setStatus('generating');

      // Generate PDF server-side (no DOM capture needed)
      const res  = await fetch('/api/prescriptions/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: patient.id, visitId: visit.id }),
      });
      const json = await res.json();

      if (!res.ok || json.error) {
        console.error('PDF generation error:', json.error || res.status);
      }

      setStatus('opening');
      const msg = buildMessage(json.url ?? null);
      window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');

    } catch (err) {
      console.error('WhatsApp share failed:', err);
      // Fallback: text-only
      setStatus('opening');
      const msg = buildMessage(null);
      window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
    } finally {
      setStatus('idle');
    }
  };

  const busy  = status !== 'idle';
  const label = status === 'generating' ? 'Generating PDF…'
              : status === 'opening'    ? 'Opening…'
              : 'WhatsApp';

  return (
    <button
      onClick={handleShare}
      disabled={busy}
      title="Send visit summary + prescription PDF via WhatsApp"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-500 hover:text-white hover:border-green-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
    >
      {busy
        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
        : <MessageCircle className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}
