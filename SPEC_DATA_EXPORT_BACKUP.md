# Data Export & Backup Feature
## Faith Clinic - Download Your Data Anytime

**Version:** 1.0  
**Status:** 🔴 DESIGN PHASE  
**Priority:** HIGH  
**Estimated Effort:** 1 week

---

## 🎯 What Doctors Need

### Export Their Data
- ✅ Download all patient data as Excel
- ✅ Download as CSV for other software
- ✅ Download as PDF for printing
- ✅ Backup before switching systems
- ✅ Compliance (data portability)

---

## 📊 Export Formats

### 1. Excel (.xlsx) - RECOMMENDED
**Best for:** Backup, switching to another system

**What's included:**
- Sheet 1: Patients (all fields)
- Sheet 2: Visits (all consultations)
- Sheet 3: Medications (all prescriptions)
- Sheet 4: Appointments

**Features:**
- ✅ Formatted tables
- ✅ Multiple sheets
- ✅ Easy to open in Excel/Google Sheets

---

### 2. CSV (Multiple Files)
**Best for:** Import to other software

**Files generated:**
- `patients.csv` - All patient data
- `visits.csv` - All visit records
- `medications.csv` - All medications
- `appointments.csv` - All appointments

**Features:**
- ✅ Universal format
- ✅ Works everywhere
- ✅ Easy to process

---

### 3. PDF Report
**Best for:** Printing, sharing with authorities

**What's included:**
- Clinic summary
- Patient list with key details
- Statistics
- Professional formatting

---

### 4. JSON (Complete Backup)
**Best for:** Technical backup, API integration

**What's included:**
- Complete database dump
- All relationships preserved
- Can restore exactly

---

## 💻 Implementation

### Export Service

```typescript
// lib/export-service.ts
import * as XLSX from 'xlsx';
import { Parser } from 'json2csv';
import prisma from './prisma';

export class ExportService {
  /**
   * Export all data as Excel
   */
  async exportToExcel(clinicId: string): Promise<Buffer> {
    // Fetch all data
    const [patients, visits, medications, appointments] = await Promise.all([
      prisma.patient.findMany({
        where: { clinicId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.visit.findMany({
        where: { clinicId },
        include: { patient: true },
        orderBy: { visitDate: 'desc' },
      }),
      prisma.medication.findMany({
        where: { visit: { clinicId } },
        include: { visit: { include: { patient: true } } },
      }),
      prisma.appointment.findMany({
        where: { clinicId },
        include: { patient: true },
        orderBy: { appointmentDate: 'desc' },
      }),
    ]);
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    
    // Sheet 1: Patients
    const patientsSheet = XLSX.utils.json_to_sheet(
      patients.map(p => ({
        'Patient ID': p.patientId,
        'Name': p.name,
        'Age': p.age,
        'Gender': p.gender,
        'Contact': p.contact,
        'Blood Group': p.bloodGroup,
        'Address': p.address,
        'Allergies': p.allergies,
        'Chronic Conditions': p.chronicConditions,
        'Created Date': p.createdAt.toLocaleDateString(),
      }))
    );
    XLSX.utils.book_append_sheet(workbook, patientsSheet, 'Patients');
    
    // Sheet 2: Visits
    const visitsSheet = XLSX.utils.json_to_sheet(
      visits.map(v => ({
        'Visit Date': v.visitDate.toLocaleDateString(),
        'Patient Name': v.patient.name,
        'Patient ID': v.patient.patientId,
        'Visit Type': v.visitType,
        'Chief Complaint': v.chiefComplaint,
        'Diagnosis': v.diagnosis,
        'Treatment': v.treatment,
        'Medicines': v.medicines,
        'Follow-up Date': v.followUpDate?.toLocaleDateString() || '',
      }))
    );
    XLSX.utils.book_append_sheet(workbook, visitsSheet, 'Visits');
    
    // Sheet 3: Medications
    const medicationsSheet = XLSX.utils.json_to_sheet(
      medications.map(m => ({
        'Patient Name': m.visit.patient.name,
        'Visit Date': m.visit.visitDate.toLocaleDateString(),
        'Medicine': m.medicine,
        'Dose': m.dose,
        'Frequency': m.frequency,
        'Duration': m.duration,
        'Instructions': m.instructions,
      }))
    );
    XLSX.utils.book_append_sheet(workbook, medicationsSheet, 'Medications');
    
    // Sheet 4: Appointments
    const appointmentsSheet = XLSX.utils.json_to_sheet(
      appointments.map(a => ({
        'Date': a.appointmentDate.toLocaleDateString(),
        'Time': a.appointmentTime,
        'Patient Name': a.patient?.name || a.tempPatientName,
        'Type': a.appointmentType,
        'Status': a.status,
        'Reason': a.reason,
      }))
    );
    XLSX.utils.book_append_sheet(workbook, appointmentsSheet, 'Appointments');
    
    // Generate buffer
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
  
  /**
   * Export as CSV (multiple files in ZIP)
   */
  async exportToCSV(clinicId: string): Promise<{ [filename: string]: string }> {
    // Fetch data
    const [patients, visits, medications, appointments] = await Promise.all([
      prisma.patient.findMany({ where: { clinicId } }),
      prisma.visit.findMany({ where: { clinicId }, include: { patient: true } }),
      prisma.medication.findMany({ where: { visit: { clinicId } }, include: { visit: { include: { patient: true } } } }),
      prisma.appointment.findMany({ where: { clinicId }, include: { patient: true } }),
    ]);
    
    // Convert to CSV
    const parser = new Parser();
    
    return {
      'patients.csv': parser.parse(patients),
      'visits.csv': parser.parse(visits),
      'medications.csv': parser.parse(medications),
      'appointments.csv': parser.parse(appointments),
    };
  }
  
  /**
   * Export as JSON (complete backup)
   */
  async exportToJSON(clinicId: string): Promise<any> {
    const [clinic, patients, visits, medications, appointments] = await Promise.all([
      prisma.clinic.findUnique({ where: { id: clinicId } }),
      prisma.patient.findMany({ where: { clinicId } }),
      prisma.visit.findMany({ where: { clinicId }, include: { medications: true } }),
      prisma.medication.findMany({ where: { visit: { clinicId } } }),
      prisma.appointment.findMany({ where: { clinicId } }),
    ]);
    
    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      clinic,
      data: {
        patients,
        visits,
        medications,
        appointments,
      },
    };
  }
}
```

---

### Export API

```typescript
// app/api/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ExportService } from '@/lib/export-service';
import { requireClinicContext } from '@/lib/clinic-context';

export async function GET(request: NextRequest) {
  const { error, context } = await requireClinicContext(request);
  if (error) return error;
  
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'excel';
  
  const exportService = new ExportService();
  
  try {
    switch (format) {
      case 'excel': {
        const buffer = await exportService.exportToExcel(context.clinicId);
        return new Response(buffer, {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="faithclinic-export-${Date.now()}.xlsx"`,
          },
        });
      }
      
      case 'json': {
        const data = await exportService.exportToJSON(context.clinicId);
        return NextResponse.json(data, {
          headers: {
            'Content-Disposition': `attachment; filename="faithclinic-backup-${Date.now()}.json"`,
          },
        });
      }
      
      default:
        return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
```

---

### Export UI

```typescript
// app/settings/export/page.tsx
'use client';

import { Download, FileSpreadsheet, FileJson, FileText } from 'lucide-react';

export default function ExportPage() {
  const handleExport = async (format: string) => {
    const response = await fetch(`/api/export?format=${format}`);
    const blob = await response.blob();
    
    // Download file
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `faithclinic-export-${Date.now()}.${format === 'excel' ? 'xlsx' : format}`;
    a.click();
    window.URL.revokeObjectURL(url);
  };
  
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Export Your Data</h1>
      <p className="text-gray-600">
        Download all your patient data in various formats
      </p>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Excel Export */}
        <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-gray-100">
          <FileSpreadsheet className="w-12 h-12 text-green-600 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Excel Export</h3>
          <p className="text-gray-600 mb-4">
            Download as Excel file with multiple sheets (Patients, Visits, Medications)
          </p>
          <button
            onClick={() => handleExport('excel')}
            className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Download Excel
          </button>
        </div>
        
        {/* JSON Export */}
        <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-gray-100">
          <FileJson className="w-12 h-12 text-blue-600 mb-4" />
          <h3 className="text-xl font-semibold mb-2">JSON Backup</h3>
          <p className="text-gray-600 mb-4">
            Complete backup in JSON format (for technical users or API integration)
          </p>
          <button
            onClick={() => handleExport('json')}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Download JSON
          </button>
        </div>
      </div>
      
      {/* Info Box */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
        <h4 className="font-semibold text-blue-900 mb-2">📋 What's Included?</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>✅ All patient records</li>
          <li>✅ All visit history</li>
          <li>✅ All medications</li>
          <li>✅ All appointments</li>
          <li>✅ Clinic information</li>
        </ul>
      </div>
      
      {/* Security Note */}
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
        <h4 className="font-semibold text-yellow-900 mb-2">🔒 Security Note</h4>
        <p className="text-sm text-yellow-700">
          Your exported data contains sensitive patient information. 
          Please store it securely and do not share it publicly.
        </p>
      </div>
    </div>
  );
}
```

---

## 📋 Implementation Checklist

### Day 1-2: Export Service
- [ ] Implement Excel export
- [ ] Implement JSON export
- [ ] Test with real data

### Day 3: API Routes
- [ ] Create export API
- [ ] Add authentication
- [ ] Test downloads

### Day 4-5: UI & Testing
- [ ] Build export page
- [ ] Add to settings menu
- [ ] Test all formats
- [ ] Deploy

---

## 🎯 Success Criteria

- ✅ Export 1000+ patients in <30 seconds
- ✅ Excel file opens correctly
- ✅ All data included
- ✅ Easy to use (1 click)

---

**This completes the data migration system!**

Doctors can:
1. **Import** their existing data (Excel/CSV) → Faith Clinic
2. **Export** their data anytime → Excel/JSON
3. **Switch** to Faith Clinic without losing data
4. **Backup** their data regularly
