'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer } from 'lucide-react';

interface ClinicProfile {
  clinicName?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  workingHours?: string | null;
  doctorName?: string | null;
  doctorQualification?: string | null;
  registrationNumber?: string | null;
  specialization?: string | null;
  tagline?: string | null;
  logo?: string | null;
}

interface Medication {
  id: string;
  medicine: string;
  dose?: string | null;
  frequency?: string | null;
  timing?: string | null;
  duration?: string | null;
  startFrom?: string | null;
  instructions?: string | null;
}

interface Visit {
  id: string;
  visitDate: Date;
  visitType: string;
  chiefComplaint?: string | null;
  signs?: string | null;
  diagnosis?: string | null;
  treatment?: string | null;
  medicines?: string | null;
  medications?: Medication[];
  temp?: number | null;
  spo2?: number | null;
  pulse?: number | null;
  bloodPressure?: string | null;
  followUpDate?: Date | null;
  followUpNotes?: string | null;
}

interface Patient {
  patientId: string;
  name: string;
  age?: number | null;
  gender?: string | null;
  contact?: string | null;
  address?: string | null;
}

interface PrescriptionPrintProps {
  patient: Patient;
  visit: Visit;
  /** Optional callback to receive clinic profile after it loads */
  onClinicProfileLoad?: (profile: ClinicProfile) => void;
}

const PrescriptionPrint = React.forwardRef<HTMLDivElement, PrescriptionPrintProps>(
  ({ patient, visit, onClinicProfileLoad }, forwardedRef) => {
  const internalRef = useRef<HTMLDivElement>(null);
  // Use forwardedRef if provided, else internal ref
  const componentRef = (forwardedRef ?? internalRef) as React.RefObject<HTMLDivElement>;
  const [clinicProfile, setClinicProfile] = useState<ClinicProfile | null>(null);

  useEffect(() => {
    fetch('/api/clinic-profile')
      .then(res => res.json())
      .then(data => {
        setClinicProfile(data);
        onClinicProfileLoad?.(data);
      })
      .catch(err => console.error('Failed to fetch clinic profile:', err));
  }, []);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Prescription_${patient.patientId}_${new Date(visit.visitDate).toLocaleDateString('en-IN').replace(/\//g, '-')}`,
  });

  // Build full address
  const fullAddress = [
    clinicProfile?.address,
    clinicProfile?.city,
    clinicProfile?.state,
    clinicProfile?.pincode
  ].filter(Boolean).join(', ');

  return (
    <div>
      {/* Print Button */}
      <button
        onClick={handlePrint}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-teal text-white border border-brand-teal hover:bg-brand-teal/90 transition-all"
      >
        <Printer className="h-3.5 w-3.5" />
        Print Rx
      </button>

      {/* Hidden Prescription Template — off-screen but rendered so html2canvas can capture it */}
      <div style={{ visibility: 'hidden', position: 'absolute', left: '-9999px', top: 0, pointerEvents: 'none' }}>
        <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page {
                size: A4;
                margin: 20mm;
              }
              body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }
            }
            .prescription-print {
              width: 210mm;
              min-height: 297mm;
              padding: 20mm;
              background: white;
              font-family: 'Arial', sans-serif;
              color: #000;
            }
            .prescription-header {
              border-bottom: 3px solid #0d9488;
              padding-bottom: 15px;
              margin-bottom: 20px;
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }
            .header-left {
              flex: 1;
            }
            .header-right {
              flex-shrink: 0;
              margin-left: 20px;
            }
            .clinic-logo {
              max-width: 120px;
              max-height: 120px;
              object-fit: contain;
            }
            .clinic-name {
              font-size: 28px;
              font-weight: bold;
              color: #0d9488;
              margin-bottom: 5px;
            }
            .clinic-info {
              font-size: 12px;
              color: #666;
              line-height: 1.6;
            }
            .prescription-date {
              text-align: right;
              font-size: 12px;
              color: #666;
              margin-bottom: 20px;
            }
            .patient-info {
              background: #f0fdfa;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 20px;
              border-left: 4px solid #0d9488;
            }
            .patient-info-row {
              display: flex;
              margin-bottom: 8px;
              font-size: 14px;
            }
            .patient-info-label {
              font-weight: bold;
              width: 120px;
              color: #0d9488;
            }
            .patient-info-value {
              color: #333;
            }
            .section {
              margin-bottom: 25px;
            }
            .section-title {
              font-size: 16px;
              font-weight: bold;
              color: #0d9488;
              margin-bottom: 10px;
              padding-bottom: 5px;
              border-bottom: 2px solid #e5e7eb;
            }
            .section-content {
              font-size: 14px;
              line-height: 1.8;
              color: #333;
            }
            .vitals-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 15px;
              margin-bottom: 20px;
            }
            .vital-box {
              background: #f9fafb;
              padding: 10px;
              border-radius: 6px;
              border: 1px solid #e5e7eb;
            }
            .vital-label {
              font-size: 11px;
              color: #666;
              font-weight: bold;
              margin-bottom: 4px;
            }
            .vital-value {
              font-size: 16px;
              color: #0d9488;
              font-weight: bold;
            }
            .medicines-list {
              background: #fffbeb;
              padding: 15px;
              border-radius: 8px;
              border-left: 4px solid #f59e0b;
            }
            .medicine-item {
              padding: 8px 0;
              border-bottom: 1px dashed #e5e7eb;
              font-size: 14px;
              display: flex;
              align-items: center;
            }
            .medicine-item:last-child {
              border-bottom: none;
            }
            .medicine-number {
              background: #f59e0b;
              color: white;
              width: 24px;
              height: 24px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 12px;
              font-weight: bold;
              margin-right: 10px;
              flex-shrink: 0;
            }
            .prescription-footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #e5e7eb;
            }
            .doctor-signature {
              text-align: right;
              margin-top: 40px;
            }
            .signature-line {
              border-top: 2px solid #000;
              width: 200px;
              margin-left: auto;
              margin-bottom: 5px;
            }
            .doctor-name {
              font-weight: bold;
              font-size: 14px;
            }
            .doctor-title {
              font-size: 12px;
              color: #666;
            }
            .footer-note {
              font-size: 11px;
              color: #999;
              text-align: center;
              margin-top: 30px;
              font-style: italic;
            }
          ` }} />
        <div ref={componentRef} className="prescription-print">
          {/* Prescription Header */}
          <div className="prescription-header">
            <div className="header-left">
              <div className="clinic-name">{clinicProfile?.clinicName?.toUpperCase() || 'FAITH CLINIC'}</div>
              {clinicProfile?.tagline && (
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px', fontStyle: 'italic' }}>
                  {clinicProfile.tagline}
                </div>
              )}
              <div className="clinic-info">
                {fullAddress && <div>📍 {fullAddress}</div>}
                <div>
                  {clinicProfile?.phone && `📞 ${clinicProfile.phone}`}
                  {clinicProfile?.phone && clinicProfile?.email && ' | '}
                  {clinicProfile?.email && `✉️ ${clinicProfile.email}`}
                </div>
                <div>🕐 Mon - Fri: 09:30 AM - 12:30 PM & 05:30 PM - 07:30 PM</div>
                {clinicProfile?.website && <div>🌐 {clinicProfile.website}</div>}
              </div>
            </div>
            {clinicProfile?.logo && (
              <div className="header-right">
                <img 
                  src={clinicProfile.logo} 
                  alt="Clinic Logo" 
                  className="clinic-logo"
                />
              </div>
            )}
          </div>

          {/* Date */}
          <div className="prescription-date">
            <strong>Date:</strong> {new Date(visit.visitDate).toLocaleDateString('en-IN', { 
              day: '2-digit', 
              month: 'long', 
              year: 'numeric' 
            })}
          </div>

          {/* Patient Information */}
          <div className="patient-info">
            <div className="patient-info-row">
              <div className="patient-info-label">Patient ID:</div>
              <div className="patient-info-value">{patient.patientId}</div>
            </div>
            <div className="patient-info-row">
              <div className="patient-info-label">Patient Name:</div>
              <div className="patient-info-value">{patient.name}</div>
            </div>
            <div className="patient-info-row">
              <div className="patient-info-label">Age / Gender:</div>
              <div className="patient-info-value">
                {patient.age ? `${patient.age} years` : 'N/A'} / {patient.gender || 'N/A'}
              </div>
            </div>
            {patient.contact && (
              <div className="patient-info-row">
                <div className="patient-info-label">Contact:</div>
                <div className="patient-info-value">{patient.contact}</div>
              </div>
            )}
            {patient.address && (
              <div className="patient-info-row">
                <div className="patient-info-label">Address:</div>
                <div className="patient-info-value">{patient.address}</div>
              </div>
            )}
          </div>

          {/* Vitals */}
          {(visit.temp || visit.spo2 || visit.pulse || visit.bloodPressure) && (
            <div className="section">
              <div className="section-title">Vitals</div>
              <div className="vitals-grid">
                {visit.temp && (
                  <div className="vital-box">
                    <div className="vital-label">Temperature</div>
                    <div className="vital-value">{visit.temp}°F</div>
                  </div>
                )}
                {visit.spo2 && (
                  <div className="vital-box">
                    <div className="vital-label">SpO2</div>
                    <div className="vital-value">{visit.spo2}%</div>
                  </div>
                )}
                {visit.pulse && (
                  <div className="vital-box">
                    <div className="vital-label">Pulse</div>
                    <div className="vital-value">{visit.pulse} bpm</div>
                  </div>
                )}
                {visit.bloodPressure && (
                  <div className="vital-box">
                    <div className="vital-label">Blood Pressure</div>
                    <div className="vital-value">{visit.bloodPressure}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Chief Complaint */}
          {visit.chiefComplaint && (
            <div className="section">
              <div className="section-title">Chief Complaint</div>
              <div className="section-content">{visit.chiefComplaint}</div>
            </div>
          )}

          {/* Signs & Symptoms */}
          {visit.signs && (
            <div className="section">
              <div className="section-title">Signs & Symptoms</div>
              <div className="section-content">{visit.signs}</div>
            </div>
          )}

          {/* Diagnosis */}
          {visit.diagnosis && (
            <div className="section">
              <div className="section-title">Diagnosis</div>
              <div className="section-content">{visit.diagnosis}</div>
            </div>
          )}

          {/* Medicines (Rx) */}
          {(visit.medications && visit.medications.length > 0) && (
            <div className="section">
              <div className="section-title">℞ Prescription</div>
              <div className="medicines-list">
                {visit.medications.map((med: any, index: number) => (
                  <div key={index} className="medicine-item">
                    <div className="medicine-number">{index + 1}</div>
                    <div>
                      <strong>{med.medicine}</strong>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '4px', fontSize: '14px' }}>
                        {med.dose && <span>Dose: {med.dose}</span>}
                        {med.frequency && <span>Frequency: {med.frequency}</span>}
                        {med.timing && <span>Timing: {med.timing}</span>}
                        {med.duration && <span>Duration: {med.duration}</span>}
                      </div>
                      {med.instructions && <div style={{ marginTop: '4px', fontSize: '14px' }}>Instructions: {med.instructions}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Treatment / Advice */}
          {visit.treatment && (
            <div className="section">
              <div className="section-title">Treatment & Advice</div>
              <div className="section-content">{visit.treatment}</div>
            </div>
          )}

          {/* Follow-up */}
          {visit.followUpDate && (
            <div className="section">
              <div className="section-title">Follow-up</div>
              <div className="section-content">
                <strong>Next Visit:</strong> {new Date(visit.followUpDate).toLocaleDateString('en-IN', { 
                  day: '2-digit', 
                  month: 'long', 
                  year: 'numeric' 
                })}
                {visit.followUpNotes && (
                  <div style={{ marginTop: '8px' }}>
                    <strong>Notes:</strong> {visit.followUpNotes}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="prescription-footer">
            <div className="doctor-signature">
              <div className="signature-line"></div>
              <div className="doctor-name">{clinicProfile?.doctorName || 'Dr. [Your Name]'}</div>
              {clinicProfile?.doctorQualification && (
                <div className="doctor-title">{clinicProfile.doctorQualification}</div>
              )}
              {clinicProfile?.specialization && (
                <div className="doctor-title">{clinicProfile.specialization}</div>
              )}
              {clinicProfile?.registrationNumber && (
                <div className="doctor-title">Reg. No: {clinicProfile.registrationNumber}</div>
              )}
            </div>
            <div className="footer-note">
              This is a computer-generated prescription. For any queries, please contact the clinic.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

PrescriptionPrint.displayName = 'PrescriptionPrint';

export default PrescriptionPrint;
