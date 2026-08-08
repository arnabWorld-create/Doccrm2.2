# Data Import & Migration System Specification
## Faith Clinic - Easy Onboarding with Existing Data

**Version:** 1.0  
**Status:** 🔴 DESIGN PHASE - NOT IMPLEMENTED  
**Priority:** HIGH  
**Estimated Effort:** 2-3 weeks

---

## 🎯 Business Requirements

### Problem Statement
Doctors switching to Faith Clinic have:
- ❌ Patient data in Excel/CSV files
- ❌ Data in other clinic management software
- ❌ Paper records they want to digitize
- ❌ No easy way to import into Faith Clinic
- ❌ Fear of losing historical data

### Solution Goals
1. **Easy Import**: Upload Excel/CSV files with patient data
2. **Smart Mapping**: Automatically map columns to Faith Clinic fields
3. **Validation**: Check data quality before import
4. **Preview**: See what will be imported
5. **Bulk Import**: Import hundreds of patients at once
6. **Error Handling**: Clear error messages, skip bad rows
7. **Backup**: Keep original file for reference

---

## 🏗️ System Architecture

### Import Flow

```
┌─────────────────────────────────────────────────────────┐
│                    IMPORT PROCESS                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Step 1: Upload File                                   │
│  ├─ Drag & drop or file picker                         │
│  ├─ Support: Excel (.xlsx), CSV, JSON                  │
│  └─ Max size: 10MB (5000 patients)                     │
│                                                         │
│  Step 2: Column Mapping                                │
│  ├─ Auto-detect columns (Name, Age, Contact, etc.)    │
│  ├─ Manual mapping for custom columns                  │
│  └─ Preview first 10 rows                              │
│                                                         │
│  Step 3: Validation                                    │
│  ├─ Check required fields (Name)                       │
│  ├─ Validate data types (Age = number)                 │
│  ├─ Check duplicates                                   │
│  └─ Show errors/warnings                               │
│                                                         │
│  Step 4: Preview & Confirm                             │
│  ├─ Show summary (X patients, Y visits)                │
│  ├─ Show sample data                                   │
│  └─ Confirm import                                     │
│                                                         │
│  Step 5: Import                                        │
│  ├─ Progress bar                                       │
│  ├─ Import in batches (100 at a time)                  │
│  ├─ Skip errors, continue                              │
│  └─ Show results (Success: X, Failed: Y)               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Supported File Formats

### 1. Excel (.xlsx) - RECOMMENDED
**Why:** Most doctors use Excel

**Example Structure:**
```
| Name          | Age | Gender | Contact      | Blood Group | Address        |
|---------------|-----|--------|--------------|-------------|----------------|
| Rajesh Patel  | 45  | Male   | 9876543210   | O+          | Ahmedabad      |
| Priya Shah    | 32  | Female | 9876543211   | A+          | Surat          |
```

**Features:**
- ✅ Multiple sheets (Patients, Visits, Medications)
- ✅ Formatted data (dates, numbers)
- ✅ Easy to edit

---

### 2. CSV (Comma-Separated Values)
**Why:** Universal format, works everywhere

**Example:**
```csv
Name,Age,Gender,Contact,Blood Group,Address
Rajesh Patel,45,Male,9876543210,O+,Ahmedabad
Priya Shah,32,Female,9876543211,A+,Surat
```

**Features:**
- ✅ Simple format
- ✅ Works with any software
- ✅ Easy to generate

---

### 3. JSON (Advanced)
**Why:** For technical users or API integration

**Example:**
```json
{
  "patients": [
    {
      "name": "Rajesh Patel",
      "age": 45,
      "gender": "Male",
      "contact": "9876543210",
      "bloodGroup": "O+",
      "address": "Ahmedabad"
    }
  ]
}
```

---

## 🗂️ Data Mapping

### Standard Fields (Auto-Detected)

| Faith Clinic field | Common Column Names | Required |
|--------------|---------------------|----------|
| Name | Name, Patient Name, Full Name | ✅ Yes |
| Age | Age, Patient Age | ❌ No |
| Gender | Gender, Sex | ❌ No |
| Contact | Contact, Phone, Mobile, Phone Number | ❌ No |
| Blood Group | Blood Group, Blood Type, BG | ❌ No |
| Address | Address, Location, City | ❌ No |
| Allergies | Allergies, Allergy | ❌ No |
| Chronic Conditions | Chronic Conditions, Medical History | ❌ No |

### Visit Data (Optional)

| Faith Clinic field | Common Column Names |
|--------------|---------------------|
| Visit Date | Date, Visit Date, Consultation Date |
| Chief Complaint | Complaint, Reason, Problem |
| Diagnosis | Diagnosis, Disease |
| Treatment | Treatment, Prescription |
| Medicines | Medicines, Drugs, Medication |
| Follow-up Date | Follow-up, Next Visit |

---

## 💻 Implementation

### 1. Database Schema

```prisma
model DataImport {
  id              String   @id @default(cuid())
  
  // Import details
  fileName        String
  fileSize        Int      // bytes
  fileType        String   // "excel", "csv", "json"
  
  // Storage
  filePath        String   // S3 or Supabase storage
  
  // Status
  status          String   // "uploaded", "mapping", "validating", "importing", "completed", "failed"
  
  // Results
  totalRows       Int?
  successCount    Int?
  failedCount     Int?
  errors          Json?    // Array of error messages
  
  // Mapping
  columnMapping   Json?    // { "Name": "name", "Age": "age", ... }
  
  // Timing
  uploadedAt      DateTime @default(now())
  startedAt       DateTime?
  completedAt     DateTime?
  duration        Int?     // seconds
  
  // User
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  clinicId        String
  clinic          Clinic   @relation(fields: [clinicId], references: [id])
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([userId])
  @@index([clinicId])
  @@index([status])
  @@map("data_imports")
}
```

---

### 2. Import Service

```typescript
// lib/import-service.ts
import * as XLSX from 'xlsx';
import { parse } from 'csv-parse/sync';
import prisma from './prisma';

export class ImportService {
  /**
   * Parse uploaded file
   */
  async parseFile(file: File): Promise<ParsedData> {
    const buffer = await file.arrayBuffer();
    const fileType = this.detectFileType(file.name);
    
    switch (fileType) {
      case 'excel':
        return this.parseExcel(buffer);
      case 'csv':
        return this.parseCSV(buffer);
      case 'json':
        return this.parseJSON(buffer);
      default:
        throw new Error('Unsupported file type');
    }
  }
  
  /**
   * Parse Excel file
   */
  private parseExcel(buffer: ArrayBuffer): ParsedData {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    // Detect columns
    const columns = Object.keys(data[0] || {});
    
    return {
      data,
      columns,
      rowCount: data.length,
    };
  }
  
  /**
   * Parse CSV file
   */
  private parseCSV(buffer: ArrayBuffer): ParsedData {
    const text = new TextDecoder().decode(buffer);
    const data = parse(text, {
      columns: true,
      skip_empty_lines: true,
    });
    
    const columns = Object.keys(data[0] || {});
    
    return {
      data,
      columns,
      rowCount: data.length,
    };
  }
  
  /**
   * Auto-detect column mapping
   */
  autoMapColumns(columns: string[]): ColumnMapping {
    const mapping: ColumnMapping = {};
    
    // Common patterns
    const patterns = {
      name: /name|patient.*name|full.*name/i,
      age: /age|patient.*age/i,
      gender: /gender|sex/i,
      contact: /contact|phone|mobile|number/i,
      bloodGroup: /blood.*group|blood.*type|bg/i,
      address: /address|location|city/i,
      allergies: /allerg/i,
      chronicConditions: /chronic|medical.*history|conditions/i,
    };
    
    for (const column of columns) {
      for (const [field, pattern] of Object.entries(patterns)) {
        if (pattern.test(column)) {
          mapping[column] = field;
          break;
        }
      }
    }
    
    return mapping;
  }
  
  /**
   * Validate data
   */
  validateData(data: any[], mapping: ColumnMapping): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    data.forEach((row, index) => {
      const rowNumber = index + 2; // +2 for header and 0-index
      
      // Check required fields
      const name = this.getMappedValue(row, mapping, 'name');
      if (!name || name.trim() === '') {
        errors.push({
          row: rowNumber,
          field: 'name',
          message: 'Name is required',
        });
      }
      
      // Validate age
      const age = this.getMappedValue(row, mapping, 'age');
      if (age && (isNaN(age) || age < 0 || age > 150)) {
        warnings.push({
          row: rowNumber,
          field: 'age',
          message: 'Invalid age value',
        });
      }
      
      // Validate gender
      const gender = this.getMappedValue(row, mapping, 'gender');
      if (gender && !['Male', 'Female', 'Other', 'M', 'F'].includes(gender)) {
        warnings.push({
          row: rowNumber,
          field: 'gender',
          message: 'Invalid gender value',
        });
      }
      
      // Validate contact
      const contact = this.getMappedValue(row, mapping, 'contact');
      if (contact && !/^\d{10}$/.test(contact.replace(/\D/g, ''))) {
        warnings.push({
          row: rowNumber,
          field: 'contact',
          message: 'Invalid contact number',
        });
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
  
  /**
   * Import data to database
   */
  async importData(
    data: any[],
    mapping: ColumnMapping,
    clinicId: string,
    onProgress?: (progress: number) => void
  ): Promise<ImportResult> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[],
    };
    
    const batchSize = 100;
    const totalBatches = Math.ceil(data.length / batchSize);
    
    for (let i = 0; i < totalBatches; i++) {
      const batch = data.slice(i * batchSize, (i + 1) * batchSize);
      
      for (const row of batch) {
        try {
          // Map row to patient data
          const patientData = this.mapRowToPatient(row, mapping, clinicId);
          
          // Create patient
          await prisma.patient.create({
            data: patientData,
          });
          
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            row: data.indexOf(row) + 2,
            error: (error as Error).message,
          });
        }
      }
      
      // Report progress
      if (onProgress) {
        const progress = ((i + 1) / totalBatches) * 100;
        onProgress(progress);
      }
    }
    
    return results;
  }
  
  /**
   * Map row to patient data
   */
  private mapRowToPatient(row: any, mapping: ColumnMapping, clinicId: string): any {
    const patientId = this.generatePatientId();
    
    return {
      clinicId,
      patientId,
      name: this.getMappedValue(row, mapping, 'name'),
      age: this.parseNumber(this.getMappedValue(row, mapping, 'age')),
      gender: this.normalizeGender(this.getMappedValue(row, mapping, 'gender')),
      contact: this.normalizeContact(this.getMappedValue(row, mapping, 'contact')),
      bloodGroup: this.getMappedValue(row, mapping, 'bloodGroup'),
      address: this.getMappedValue(row, mapping, 'address'),
      allergies: this.getMappedValue(row, mapping, 'allergies'),
      chronicConditions: this.getMappedValue(row, mapping, 'chronicConditions'),
    };
  }
  
  // Helper methods
  private getMappedValue(row: any, mapping: ColumnMapping, field: string): any {
    const column = Object.keys(mapping).find(k => mapping[k] === field);
    return column ? row[column] : null;
  }
  
  private parseNumber(value: any): number | null {
    const num = parseInt(value);
    return isNaN(num) ? null : num;
  }
  
  private normalizeGender(value: any): string | null {
    if (!value) return null;
    const normalized = value.toString().toLowerCase();
    if (normalized === 'm' || normalized === 'male') return 'Male';
    if (normalized === 'f' || normalized === 'female') return 'Female';
    return 'Other';
  }
  
  private normalizeContact(value: any): string | null {
    if (!value) return null;
    return value.toString().replace(/\D/g, '');
  }
  
  private generatePatientId(): string {
    return `P${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  }
  
  private detectFileType(fileName: string): string {
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) return 'excel';
    if (fileName.endsWith('.csv')) return 'csv';
    if (fileName.endsWith('.json')) return 'json';
    throw new Error('Unsupported file type');
  }
}

interface ParsedData {
  data: any[];
  columns: string[];
  rowCount: number;
}

interface ColumnMapping {
  [column: string]: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface ValidationWarning {
  row: number;
  field: string;
  message: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: any[];
}
```

---

### 3. Import UI Component

```typescript
// app/settings/import/page.tsx
'use client';

import { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';

export default function ImportPage() {
  const [step, setStep] = useState<'upload' | 'mapping' | 'validation' | 'importing' | 'complete'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any>(null);
  const [mapping, setMapping] = useState<any>({});
  const [validation, setValidation] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    
    setFile(uploadedFile);
    
    // Parse file
    const formData = new FormData();
    formData.append('file', uploadedFile);
    
    const response = await fetch('/api/import/parse', {
      method: 'POST',
      body: formData,
    });
    
    const data = await response.json();
    setParsedData(data);
    setMapping(data.suggestedMapping);
    setStep('mapping');
  };
  
  const handleValidate = async () => {
    const response = await fetch('/api/import/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: parsedData.data,
        mapping,
      }),
    });
    
    const validationResult = await response.json();
    setValidation(validationResult);
    setStep('validation');
  };
  
  const handleImport = async () => {
    setStep('importing');
    
    const response = await fetch('/api/import/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: parsedData.data,
        mapping,
      }),
    });
    
    // Stream progress
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          if (data.progress) {
            setProgress(data.progress);
          }
          if (data.result) {
            setResult(data.result);
            setStep('complete');
          }
        }
      }
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Import Patient Data</h1>
      
      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="bg-white p-8 rounded-xl shadow-lg border-2 border-dashed border-gray-300">
          <div className="text-center">
            <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold mb-2">Upload Your Patient Data</h2>
            <p className="text-gray-600 mb-6">
              Support: Excel (.xlsx), CSV, JSON | Max size: 10MB
            </p>
            
            <input
              type="file"
              accept=".xlsx,.xls,.csv,.json"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            
            <label
              htmlFor="file-upload"
              className="inline-flex items-center px-6 py-3 bg-brand-teal text-white rounded-lg cursor-pointer hover:bg-brand-teal/90"
            >
              <FileSpreadsheet className="w-5 h-5 mr-2" />
              Choose File
            </label>
          </div>
        </div>
      )}
      
      {/* Step 2: Column Mapping */}
      {step === 'mapping' && (
        <div className="bg-white p-8 rounded-xl shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Map Columns</h2>
          <p className="text-gray-600 mb-6">
            Match your file columns to Faith Clinic fields
          </p>
          
          <div className="space-y-4">
            {parsedData.columns.map((column: string) => (
              <div key={column} className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium">{column}</label>
                </div>
                <select
                  value={mapping[column] || ''}
                  onChange={(e) => setMapping({ ...mapping, [column]: e.target.value })}
                  className="flex-1 rounded-lg border-2 border-gray-200 px-4 py-2"
                >
                  <option value="">Skip this column</option>
                  <option value="name">Name</option>
                  <option value="age">Age</option>
                  <option value="gender">Gender</option>
                  <option value="contact">Contact</option>
                  <option value="bloodGroup">Blood Group</option>
                  <option value="address">Address</option>
                  <option value="allergies">Allergies</option>
                  <option value="chronicConditions">Chronic Conditions</option>
                </select>
              </div>
            ))}
          </div>
          
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleValidate}
              className="px-6 py-3 bg-brand-teal text-white rounded-lg"
            >
              Next: Validate Data
            </button>
          </div>
        </div>
      )}
      
      {/* Step 3: Validation */}
      {step === 'validation' && (
        <div className="bg-white p-8 rounded-xl shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Validation Results</h2>
          
          {validation.errors.length > 0 && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <h3 className="font-semibold text-red-900">
                  {validation.errors.length} Errors Found
                </h3>
              </div>
              <ul className="text-sm text-red-700 space-y-1">
                {validation.errors.slice(0, 5).map((error: any, i: number) => (
                  <li key={i}>Row {error.row}: {error.message}</li>
                ))}
              </ul>
            </div>
          )}
          
          {validation.warnings.length > 0 && (
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <h3 className="font-semibold text-yellow-900">
                  {validation.warnings.length} Warnings
                </h3>
              </div>
              <p className="text-sm text-yellow-700">
                These rows have issues but can still be imported
              </p>
            </div>
          )}
          
          {validation.isValid && (
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-green-900">
                  Data is valid! Ready to import {parsedData.rowCount} patients
                </h3>
              </div>
            </div>
          )}
          
          <div className="mt-6 flex justify-end gap-4">
            <button
              onClick={() => setStep('mapping')}
              className="px-6 py-3 border-2 border-gray-300 rounded-lg"
            >
              Back
            </button>
            <button
              onClick={handleImport}
              disabled={!validation.isValid}
              className="px-6 py-3 bg-brand-teal text-white rounded-lg disabled:opacity-50"
            >
              Import Data
            </button>
          </div>
        </div>
      )}
      
      {/* Step 4: Importing */}
      {step === 'importing' && (
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <h2 className="text-xl font-semibold mb-4">Importing Data...</h2>
          <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
            <div
              className="bg-brand-teal h-4 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-gray-600">{progress.toFixed(0)}% complete</p>
        </div>
      )}
      
      {/* Step 5: Complete */}
      {step === 'complete' && result && (
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-600" />
          <h2 className="text-2xl font-bold mb-4">Import Complete!</h2>
          
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-6">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-3xl font-bold text-green-600">{result.success}</p>
              <p className="text-sm text-gray-600">Imported</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-3xl font-bold text-red-600">{result.failed}</p>
              <p className="text-sm text-gray-600">Failed</p>
            </div>
          </div>
          
          <button
            onClick={() => window.location.href = '/patients'}
            className="px-6 py-3 bg-brand-teal text-white rounded-lg"
          >
            View Patients
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## 📋 Implementation Checklist

### Week 1: Core Import Service
- [ ] Day 1-2: File parsing (Excel, CSV, JSON)
- [ ] Day 3: Column mapping logic
- [ ] Day 4: Data validation
- [ ] Day 5: Import service

### Week 2: UI & API
- [ ] Day 1-2: Upload UI
- [ ] Day 3: Mapping UI
- [ ] Day 4: Validation UI
- [ ] Day 5: Progress & results UI

### Week 3: Testing & Polish
- [ ] Day 1-2: Test with real data
- [ ] Day 3: Error handling
- [ ] Day 4: Documentation
- [ ] Day 5: Deploy

---

## 🎯 Success Criteria

- ✅ Import 1000+ patients in <5 minutes
- ✅ Auto-detect 80%+ of columns correctly
- ✅ Clear error messages
- ✅ Easy to use (3 clicks)
- ✅ No data loss

---

## 💰 Cost

- **Development:** 2-3 weeks = $4,000 - $9,000
- **Infrastructure:** $0 (uses existing storage)

---

**This is what you need, right?** Easy data import for doctors switching to Faith Clinic!
