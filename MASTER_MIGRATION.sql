-- ============================================================================
-- MASTER MIGRATION FILE
-- Run this ONCE in Supabase SQL Editor after prisma migrate deploy
-- Combines all standalone SQL migrations in the correct order
-- ============================================================================


-- ============================================================================
-- 1. FULL-TEXT SEARCH (search_vector trigger + GIN index on patients)
-- ============================================================================

ALTER TABLE patients ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION patients_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW."patientId", '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.contact, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.address, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS patients_search_vector_trigger ON patients;
CREATE TRIGGER patients_search_vector_trigger
  BEFORE INSERT OR UPDATE ON patients
  FOR EACH ROW
  EXECUTE FUNCTION patients_search_vector_update();

UPDATE patients SET search_vector =
  setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE("patientId", '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(contact, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(address, '')), 'C');

CREATE INDEX IF NOT EXISTS idx_patients_search_vector ON patients USING GIN(search_vector);


-- ============================================================================
-- 2. PATIENT ID SEQUENCE (prevents duplicate FC-XXX IDs)
-- ============================================================================

DO $$
DECLARE
  current_max INTEGER;
BEGIN
  SELECT COALESCE(
    MAX(CAST(SUBSTRING("patientId" FROM 'FC-([0-9]+)') AS INTEGER)),
    0
  )
  INTO current_max
  FROM patients
  WHERE "patientId" ~ 'FC-[0-9]+';

  EXECUTE format(
    'CREATE SEQUENCE IF NOT EXISTS patient_id_seq START WITH %s INCREMENT BY 1 NO CYCLE',
    current_max + 1
  );

  PERFORM setval('patient_id_seq', GREATEST(current_max, nextval('patient_id_seq') - 1, 1), true);
END
$$;


-- ============================================================================
-- 3. INVOICE NUMBER SEQUENCE (prevents duplicate INV-YYYY-XXXXX numbers)
-- ============================================================================

DO $$
DECLARE
  current_max INTEGER;
BEGIN
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING("invoiceNumber" FROM 'INV-\d{4}-([0-9]+)')
        AS INTEGER
      )
    ),
    0
  )
  INTO current_max
  FROM invoices
  WHERE "invoiceNumber" ~ '^INV-\d{4}-[0-9]+$';

  EXECUTE format(
    'CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH %s INCREMENT BY 1 NO CYCLE',
    current_max + 1
  );

  PERFORM setval(
    'invoice_number_seq',
    GREATEST(current_max, nextval('invoice_number_seq') - 1, 1),
    true
  );
END
$$;


-- ============================================================================
-- 4. CRITICAL PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_visits_patient_id ON visits("patientId");
CREATE INDEX IF NOT EXISTS idx_visits_visit_date ON visits("visitDate");
CREATE INDEX IF NOT EXISTS idx_medications_visit_id ON medications("visitId");
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments("patientId");
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments("appointmentDate");
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items("invoiceId");
CREATE INDEX IF NOT EXISTS idx_payments_patient_id ON payments("patientId");
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments("createdAt");
CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON refunds("paymentId");
CREATE INDEX IF NOT EXISTS idx_invoices_patient_id ON invoices("patientId");
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);
CREATE INDEX IF NOT EXISTS idx_patients_contact ON patients(contact);
CREATE INDEX IF NOT EXISTS idx_patients_patient_id ON patients("patientId");
CREATE INDEX IF NOT EXISTS idx_visits_patient_date ON visits("patientId", "visitDate" DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_date ON appointments("patientId", "appointmentDate");
CREATE INDEX IF NOT EXISTS idx_visits_created_at ON visits("createdAt");
CREATE INDEX IF NOT EXISTS idx_patients_created_at ON patients("createdAt");
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);


-- ============================================================================
-- 5. ANALYTICS PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_patient_created_gender ON patients("createdAt", gender);
CREATE INDEX IF NOT EXISTS idx_patient_age ON patients(age) WHERE age IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_visit_signs ON visits("visitDate" DESC) WHERE signs IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_visit_medicines ON visits("visitDate" DESC) WHERE medicines IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_visit_followup_date ON visits("followUpDate") WHERE "followUpDate" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_appointment_patient_type ON appointments("patientId") WHERE "patientId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_status_date ON payments(status, "createdAt");
CREATE INDEX IF NOT EXISTS idx_invoice_status ON invoices(status);


-- ============================================================================
-- 6. STORAGE RLS POLICIES (for patient-reports bucket)
-- ============================================================================

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read patient-reports" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload patient-reports" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update patient-reports" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete patient-reports" ON storage.objects;

CREATE POLICY "Allow public read patient-reports"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'patient-reports');

CREATE POLICY "Allow authenticated upload patient-reports"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'patient-reports' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Allow authenticated update patient-reports"
  ON storage.objects FOR UPDATE
  WITH CHECK (
    bucket_id = 'patient-reports' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Allow authenticated delete patient-reports"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'patient-reports' AND
    auth.role() = 'authenticated'
  );


-- ============================================================================
-- DONE - Verify everything was created
-- ============================================================================

SELECT 'Tables' as type, COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public'
UNION ALL
SELECT 'Indexes', COUNT(*) FROM pg_indexes WHERE schemaname = 'public'
UNION ALL
SELECT 'Sequences', COUNT(*) FROM pg_sequences WHERE schemaname = 'public';
