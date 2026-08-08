-- Complete Supabase Migration
-- Run this in Supabase SQL Editor: https://app.supabase.com -> SQL Editor

-- Create users table
CREATE TABLE IF NOT EXISTS "users" (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'doctor',
  "isActive" BOOLEAN DEFAULT true,
  "lastLogin" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create patients table
CREATE TABLE IF NOT EXISTS "patients" (
  id TEXT PRIMARY KEY,
  "patientId" TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  age INTEGER,
  gender TEXT,
  contact TEXT,
  address TEXT,
  "bloodGroup" TEXT,
  allergies TEXT,
  "chronicConditions" TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create visits table
CREATE TABLE IF NOT EXISTS "visits" (
  id TEXT PRIMARY KEY,
  "patientId" TEXT NOT NULL REFERENCES "patients"(id) ON DELETE CASCADE,
  "visitDate" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "visitType" TEXT DEFAULT 'Consultation',
  temp FLOAT,
  spo2 INTEGER,
  pulse INTEGER,
  "bloodPressure" TEXT,
  "bpSystolic" INTEGER,
  "bpDiastolic" INTEGER,
  rbs INTEGER,
  weight FLOAT,
  "chiefComplaint" TEXT,
  signs TEXT,
  investigations TEXT,
  diagnosis TEXT,
  treatment TEXT,
  medicines TEXT,
  notes TEXT,
  reports TEXT,
  "referredTo" TEXT,
  "followUpDate" TIMESTAMP,
  "followUpNotes" TEXT,
  "paidBy" TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create custom_medicines table
CREATE TABLE IF NOT EXISTS "custom_medicines" (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  "usageCount" INTEGER DEFAULT 1,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create medications table
CREATE TABLE IF NOT EXISTS "medications" (
  id TEXT PRIMARY KEY,
  "visitId" TEXT NOT NULL REFERENCES "visits"(id) ON DELETE CASCADE,
  medicine TEXT NOT NULL,
  dose TEXT,
  frequency TEXT,
  timing TEXT,
  duration TEXT,
  "startFrom" TEXT,
  instructions TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create clinic_profile table
CREATE TABLE IF NOT EXISTS "clinic_profile" (
  id TEXT PRIMARY KEY,
  "clinicName" TEXT DEFAULT 'Faith Clinic',
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  "workingHours" TEXT DEFAULT 'Mon-Sat: 9:00 AM - 8:00 PM | Sun: 10:00 AM - 2:00 PM',
  "doctorName" TEXT,
  "doctorQualification" TEXT,
  "registrationNumber" TEXT,
  specialization TEXT,
  logo TEXT,
  tagline TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS "appointments" (
  id TEXT PRIMARY KEY,
  "patientId" TEXT REFERENCES "patients"(id) ON DELETE CASCADE,
  "tempPatientName" TEXT,
  "tempPatientContact" TEXT,
  "appointmentDate" TIMESTAMP NOT NULL,
  "appointmentTime" TEXT NOT NULL,
  duration INTEGER DEFAULT 30,
  "appointmentType" TEXT DEFAULT 'Consultation',
  status TEXT DEFAULT 'Scheduled',
  reason TEXT,
  notes TEXT,
  "reminderSent" BOOLEAN DEFAULT false,
  "visitId" TEXT UNIQUE,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS "invoices" (
  id TEXT PRIMARY KEY,
  "invoiceNumber" TEXT UNIQUE NOT NULL,
  "patientId" TEXT NOT NULL REFERENCES "patients"(id) ON DELETE CASCADE,
  "visitId" TEXT,
  amount FLOAT NOT NULL,
  currency TEXT DEFAULT 'INR',
  status TEXT DEFAULT 'pending',
  "issuedDate" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "dueDate" TIMESTAMP NOT NULL,
  "paidDate" TIMESTAMP,
  notes TEXT,
  metadata TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create invoice_items table
CREATE TABLE IF NOT EXISTS "invoice_items" (
  id TEXT PRIMARY KEY,
  "invoiceId" TEXT NOT NULL REFERENCES "invoices"(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  "unitPrice" FLOAT NOT NULL,
  discount INTEGER DEFAULT 0,
  total FLOAT NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create payments table
CREATE TABLE IF NOT EXISTS "payments" (
  id TEXT PRIMARY KEY,
  "patientId" TEXT NOT NULL REFERENCES "patients"(id) ON DELETE CASCADE,
  amount FLOAT NOT NULL,
  currency TEXT DEFAULT 'INR',
  status TEXT DEFAULT 'pending',
  "paymentMethod" TEXT,
  provider TEXT DEFAULT 'stripe',
  "providerPaymentId" TEXT UNIQUE,
  "invoiceId" TEXT REFERENCES "invoices"(id),
  description TEXT,
  metadata TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create refunds table
CREATE TABLE IF NOT EXISTS "refunds" (
  id TEXT PRIMARY KEY,
  "paymentId" TEXT NOT NULL REFERENCES "payments"(id) ON DELETE CASCADE,
  amount FLOAT NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  "providerRefundId" TEXT UNIQUE,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "visits_patientId_idx" ON "visits"("patientId");
CREATE INDEX IF NOT EXISTS "visits_visitDate_idx" ON "visits"("visitDate");
CREATE INDEX IF NOT EXISTS "medications_visitId_idx" ON "medications"("visitId");
CREATE INDEX IF NOT EXISTS "appointments_patientId_idx" ON "appointments"("patientId");
CREATE INDEX IF NOT EXISTS "appointments_appointmentDate_idx" ON "appointments"("appointmentDate");
CREATE INDEX IF NOT EXISTS "appointments_status_idx" ON "appointments"(status);
CREATE INDEX IF NOT EXISTS "invoices_patientId_idx" ON "invoices"("patientId");
CREATE INDEX IF NOT EXISTS "invoices_status_idx" ON "invoices"(status);
CREATE INDEX IF NOT EXISTS "invoices_dueDate_idx" ON "invoices"("dueDate");
CREATE INDEX IF NOT EXISTS "invoice_items_invoiceId_idx" ON "invoice_items"("invoiceId");
CREATE INDEX IF NOT EXISTS "payments_patientId_idx" ON "payments"("patientId");
CREATE INDEX IF NOT EXISTS "payments_status_idx" ON "payments"(status);
CREATE INDEX IF NOT EXISTS "payments_createdAt_idx" ON "payments"("createdAt");
CREATE INDEX IF NOT EXISTS "refunds_paymentId_idx" ON "refunds"("paymentId");
CREATE INDEX IF NOT EXISTS "refunds_status_idx" ON "refunds"(status);

-- Insert demo users
INSERT INTO "users" (id, email, password, name, role, "isActive", "createdAt", "updatedAt")
VALUES 
  ('demo-001', 'demo@doxcia.com', '$2a$08$8.oJJKj7H8.8.8.8.8.8.8.8.8.8.8.8.8.8.8.8.8.8.8.8.8.8.8.8', 'Demo User', 'doctor', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('admin-001', 'admin@doxcia.com', '$2a$08$8.oJJKj7H8.8.8.8.8.8.8.8.8.8.8.8.8.8.8.8.8.8.8.8.8.8.8.8', 'Admin User', 'doctor', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING;

-- Verify users were created
SELECT id, email, name, role FROM "users" WHERE email IN ('demo@doxcia.com', 'admin@doxcia.com');
