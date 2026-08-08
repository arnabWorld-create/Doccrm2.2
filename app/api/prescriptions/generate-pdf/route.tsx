import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * POST /api/prescriptions/generate-pdf
 * Body: { patientId: string, visitId: string }
 * Returns: { url: string } — public Supabase URL, or inline PDF if no Supabase
 */
export async function POST(request: NextRequest) {
  const { error: authError } = await requirePermission(request, 'patients', 'read');
  if (authError) return authError;

  try {
    const { patientId, visitId } = await request.json();

    if (!patientId || !visitId) {
      return Response.json({ error: 'patientId and visitId are required' }, { status: 400 });
    }

    // ── Fetch all data needed ───────────────────────────────────────────────
    const [patient, visit, clinicProfile] = await Promise.all([
      prisma.patient.findUnique({ where: { id: patientId } }),
      prisma.visit.findUnique({
        where: { id: visitId },
        include: { medications: true },
      }),
      prisma.clinicProfile.findFirst(),
    ]);

    if (!patient || !visit) {
      return Response.json({ error: 'Patient or visit not found' }, { status: 404 });
    }

    // ── Fetch + resize logo for @react-pdf/renderer ─────────────────────
    let logoDataUri: string | null = null;
    if (clinicProfile?.logo) {
      try {
        const logoRes = await fetch(clinicProfile.logo);
        if (logoRes.ok) {
          const rawBuffer = Buffer.from(await logoRes.arrayBuffer());
          // Resize to max 120×120 px and convert to PNG — keeps file tiny for PDF embedding
          const { default: sharp } = await import('sharp');
          const resized = await sharp(rawBuffer)
            .resize(60, 60, { fit: 'inside', withoutEnlargement: true })
            .png({ compressionLevel: 9 })
            .toBuffer();
          logoDataUri = `data:image/png;base64,${resized.toString('base64')}`;
        }
      } catch {
        // Logo processing failed — render without it
      }
    }
    const { renderToBuffer, Document, Page, Text, View, StyleSheet, Image } =
      await import('@react-pdf/renderer');

    const TEAL = '#007c74';
    const YELLOW = '#F6D02F';
    const styles = StyleSheet.create({
      page:        { padding: 30, fontFamily: 'Helvetica', fontSize: 10, color: '#1e1e1e' },
      // Header
      headerRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 2, borderBottomColor: TEAL, paddingBottom: 8, marginBottom: 10 },
      clinicName:  { fontSize: 20, fontFamily: 'Helvetica-Bold', color: TEAL, marginBottom: 3 },
      headerSmall: { fontSize: 8.5, color: '#666', lineHeight: 1.5 },
      logo:        { width: 60, height: 60, objectFit: 'contain' },
      // Date
      dateRow:     { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 },
      dateText:    { fontSize: 9, color: '#888' },
      // Patient box
      patientBox:  { backgroundColor: '#f0fdfa', borderLeftWidth: 3, borderLeftColor: TEAL, padding: 10, borderRadius: 4, marginBottom: 12 },
      patientRow:  { flexDirection: 'row', marginBottom: 4 },
      patientLabel:{ fontFamily: 'Helvetica-Bold', color: TEAL, width: 90, fontSize: 9 },
      patientVal:  { flex: 1, fontSize: 9 },
      // Section — left accent bar style, no border radius issues
      sectionHdr:  { flexDirection: 'row', alignItems: 'center', marginBottom: 5, marginTop: 10 },
      sectionAccent: { width: 3, height: 14, backgroundColor: TEAL, marginRight: 6, borderRadius: 0 },
      sectionHdrText: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: TEAL, textTransform: 'uppercase', letterSpacing: 0.5 },
      sectionDivider: { borderBottomWidth: 0.5, borderBottomColor: TEAL, marginBottom: 5 },
      sectionBody: { fontSize: 9.5, lineHeight: 1.6, color: '#333', paddingLeft: 9 },
      // Vitals
      vitalsRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
      vitalBox:    { backgroundColor: '#f9fafb', borderWidth: 0.5, borderColor: '#e5e7eb', borderRadius: 3, padding: '4 8', minWidth: 70 },
      vitalLabel:  { fontSize: 7.5, color: '#888', marginBottom: 1 },
      vitalVal:    { fontSize: 10, fontFamily: 'Helvetica-Bold', color: TEAL },
      // Medicine
      medItem:     { flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb', borderStyle: 'dashed' },
      medBadge:    { width: 18, height: 18, backgroundColor: YELLOW, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginRight: 8, marginTop: 1 },
      medBadgeTxt: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#fff' },
      medName:     { fontFamily: 'Helvetica-Bold', fontSize: 10, marginBottom: 2 },
      medDetail:   { fontSize: 8.5, color: '#555' },
      // Follow-up
      followupBox: { backgroundColor: '#fffbeb', borderLeftWidth: 3, borderLeftColor: YELLOW, padding: 8, borderRadius: 3, marginTop: 6 },
      // Signature
      sigSection:  { marginTop: 30, flexDirection: 'row', justifyContent: 'flex-end' },
      sigBox:      { alignItems: 'center', width: 160 },
      sigLine:     { borderTopWidth: 1, borderTopColor: '#000', width: '100%', marginBottom: 4 },
      sigName:     { fontFamily: 'Helvetica-Bold', fontSize: 10 },
      sigSmall:    { fontSize: 8, color: '#666', marginTop: 1 },
      footer:      { position: 'absolute', bottom: 20, left: 30, right: 30, borderTopWidth: 0.5, borderTopColor: '#e5e7eb', paddingTop: 6, fontSize: 7.5, color: '#aaa', textAlign: 'center' },
    });

    const fmtDate = (d: Date | null | undefined) =>
      d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

    const fullAddress = [clinicProfile?.address, clinicProfile?.city, clinicProfile?.state, clinicProfile?.pincode]
      .filter(Boolean).join(', ');

    const meds: any[] = (visit as any).medications ?? [];
    const vitals: { label: string; value: string }[] = [
      (visit as any).temp       ? { label: 'Temp',  value: `${(visit as any).temp}°F` }          : null,
      (visit as any).spo2       ? { label: 'SpO₂',  value: `${(visit as any).spo2}%` }           : null,
      (visit as any).pulse      ? { label: 'Pulse', value: `${(visit as any).pulse} bpm` }        : null,
      (visit as any).bloodPressure ? { label: 'BP', value: (visit as any).bloodPressure }         : null,
      (visit as any).bpSystolic && (visit as any).bpDiastolic
        ? { label: 'BP', value: `${(visit as any).bpSystolic}/${(visit as any).bpDiastolic}` }   : null,
      (visit as any).rbs        ? { label: 'RBS',   value: `${(visit as any).rbs} mg/dl` }        : null,
    ].filter(Boolean) as { label: string; value: string }[];

    // Pre-build all strings — no conditional expressions inside JSX at all
    const clinicNameStr    = (clinicProfile?.clinicName || 'Faith Clinic').toUpperCase();
    const doctorLine       = clinicProfile?.doctorName
      ? (clinicProfile.doctorQualification
          ? `Dr. ${clinicProfile.doctorName} — ${clinicProfile.doctorQualification}`
          : `Dr. ${clinicProfile.doctorName}`)
      : null;
    const specializationStr = clinicProfile?.specialization || null;
    const addressStr       = fullAddress || null;
    const contactStr       = [
      clinicProfile?.phone ? `Ph: ${clinicProfile.phone}` : null,
      clinicProfile?.email || null,
    ].filter(Boolean).join('  |  ') || null;

    const sigNameStr = clinicProfile?.doctorName ? `Dr. ${clinicProfile.doctorName}` : 'Doctor';
    const sigQualStr = clinicProfile?.doctorQualification || null;
    const sigSpecStr = clinicProfile?.specialization || null;
    const sigRegStr  = (clinicProfile as any)?.registrationNumber
      ? `Reg: ${(clinicProfile as any).registrationNumber}`
      : null;

    // Helper: section header with left accent bar
    const SectionHeader = ({ title }: { title: string }) => (
      <View style={{ marginTop: 10, marginBottom: 4 }}>
        <View style={styles.sectionHdr}>
          <View style={styles.sectionAccent} />
          <Text style={styles.sectionHdrText}>{title}</Text>
        </View>
        <View style={styles.sectionDivider} />
      </View>
    );

    const doc = (
      <Document title={`Prescription_${patient.patientId}`}>
        <Page size="A4" style={styles.page}>

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.clinicName}>{clinicNameStr}</Text>
              {doctorLine       ? <Text style={styles.headerSmall}>{doctorLine}</Text>       : null}
              {specializationStr ? <Text style={styles.headerSmall}>{specializationStr}</Text> : null}
              {addressStr       ? <Text style={styles.headerSmall}>{addressStr}</Text>       : null}
              {contactStr       ? <Text style={styles.headerSmall}>{contactStr}</Text>       : null}
            </View>
            {logoDataUri ? <Image src={logoDataUri} style={styles.logo} /> : null}
          </View>

          {/* Date */}
          <View style={styles.dateRow}>
            <Text style={styles.dateText}>{`Date: ${fmtDate(visit.visitDate)}`}</Text>
          </View>

          {/* Patient info */}
          <View style={styles.patientBox}>
            <View style={styles.patientRow}>
              <Text style={styles.patientLabel}>Patient ID</Text>
              <Text style={styles.patientVal}>{patient.patientId}</Text>
              <Text style={[styles.patientLabel, { marginLeft: 20 }]}>Contact</Text>
              <Text style={styles.patientVal}>{patient.contact || 'N/A'}</Text>
            </View>
            <View style={styles.patientRow}>
              <Text style={styles.patientLabel}>Name</Text>
              <Text style={[styles.patientVal, { fontFamily: 'Helvetica-Bold' }]}>{patient.name}</Text>
            </View>
            <View style={styles.patientRow}>
              <Text style={styles.patientLabel}>Age / Gender</Text>
              <Text style={styles.patientVal}>
                {`${patient.age ? `${patient.age} yrs` : 'N/A'} / ${patient.gender || 'N/A'}`}
              </Text>
              {patient.address ? (
                <>
                  <Text style={[styles.patientLabel, { marginLeft: 20 }]}>Address</Text>
                  <Text style={styles.patientVal}>{patient.address}</Text>
                </>
              ) : null}
            </View>
          </View>

          {/* Vitals */}
          {vitals.length > 0 && (
            <>
              <SectionHeader title="VITALS" />
              <View style={styles.vitalsRow}>
                {vitals.map((v, i) => (
                  <View key={i} style={styles.vitalBox}>
                    <Text style={styles.vitalLabel}>{v.label}</Text>
                    <Text style={styles.vitalVal}>{v.value}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Clinical sections — two column layout */}
          {((visit as any).chiefComplaint || (visit as any).signs) && (
            <View style={{ flexDirection: 'row', marginTop: 4 }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                {(visit as any).chiefComplaint ? (
                  <>
                    <SectionHeader title="CHIEF COMPLAINT" />
                    <Text style={styles.sectionBody}>{(visit as any).chiefComplaint}</Text>
                  </>
                ) : null}
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                {(visit as any).signs ? (
                  <>
                    <SectionHeader title="SIGNS & SYMPTOMS" />
                    <Text style={styles.sectionBody}>{(visit as any).signs}</Text>
                  </>
                ) : null}
              </View>
            </View>
          )}

          {((visit as any).investigations || (visit as any).diagnosis) && (
            <View style={{ flexDirection: 'row', marginTop: 4 }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                {(visit as any).investigations ? (
                  <>
                    <SectionHeader title="INVESTIGATIONS" />
                    <Text style={styles.sectionBody}>{(visit as any).investigations}</Text>
                  </>
                ) : null}
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                {(visit as any).diagnosis ? (
                  <>
                    <SectionHeader title="DIAGNOSIS" />
                    <Text style={[styles.sectionBody, { fontFamily: 'Helvetica-Bold' }]}>{(visit as any).diagnosis}</Text>
                  </>
                ) : null}
              </View>
            </View>
          )}

          {/* Medicines */}
          {meds.length > 0 && (
            <>
              <SectionHeader title="PRESCRIPTION" />
              {meds.map((m: any, i: number) => (
                <View key={i} style={styles.medItem}>
                  <View style={styles.medBadge}>
                    <Text style={styles.medBadgeTxt}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.medName}>{m.medicine}</Text>
                    <Text style={styles.medDetail}>
                      {[
                        m.dose      ? `Dose: ${m.dose}`         : null,
                        m.frequency ? `Freq: ${m.frequency}`    : null,
                        m.timing    ? `Timing: ${m.timing}`     : null,
                        m.duration  ? `Duration: ${m.duration}` : null,
                      ].filter(Boolean).join('   ') || ' '}
                    </Text>
                    {m.instructions ? <Text style={[styles.medDetail, { color: '#888', marginTop: 1 }]}>{`Instructions: ${m.instructions}`}</Text> : null}
                  </View>
                </View>
              ))}
            </>
          )}
          {meds.length === 0 && (visit as any).medicines && (
            <>
              <SectionHeader title="PRESCRIPTION" />
              <Text style={styles.sectionBody}>{(visit as any).medicines}</Text>
            </>
          )}

          {/* Treatment */}
          {(visit as any).treatment && (
            <>
              <SectionHeader title="TREATMENT & ADVICE" />
              <Text style={styles.sectionBody}>{(visit as any).treatment}</Text>
            </>
          )}

          {/* Follow-up */}
          {visit.followUpDate && (
            <>
              <SectionHeader title="FOLLOW-UP" />
              <View style={styles.followupBox}>
                <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold' }}>
                  {`Next Visit: ${fmtDate(visit.followUpDate)}`}
                </Text>
                {(visit as any).followUpNotes ? (
                  <Text style={{ fontSize: 9, color: '#666', marginTop: 3 }}>{(visit as any).followUpNotes}</Text>
                ) : null}
              </View>
            </>
          )}

          {/* Signature */}
          <View style={styles.sigSection}>
            <View style={styles.sigBox}>
              <View style={styles.sigLine} />
              <Text style={styles.sigName}>{sigNameStr}</Text>
              {sigQualStr ? <Text style={styles.sigSmall}>{sigQualStr}</Text> : null}
              {sigSpecStr ? <Text style={styles.sigSmall}>{sigSpecStr}</Text> : null}
              {sigRegStr  ? <Text style={styles.sigSmall}>{sigRegStr}</Text>  : null}
            </View>
          </View>

          <Text style={styles.footer}>{'Computer generated prescription. For queries, please contact the clinic.'}</Text>

        </Page>
      </Document>
    );

    const pdfBuffer = await renderToBuffer(doc);

    // ── Upload to Supabase ─────────────────────────────────────────────────
    const supabase = getSupabaseAdmin();
    const safeDate = new Date(visit.visitDate).toISOString().split('T')[0];
    const filename = `prescriptions/prescription_${patient.patientId}_${safeDate}_${Date.now()}.pdf`;

    if (supabase) {
      const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'patient-reports';
      const { error } = await supabase.storage
        .from(bucket)
        .upload(filename, pdfBuffer, { contentType: 'application/pdf', upsert: true });

      if (error) {
        console.error('[generate-pdf] Supabase upload error:', error.message);
        throw new Error(`Supabase upload: ${error.message}`);
      }

      // Build the proxy URL.
      // Prefer NEXT_PUBLIC_APP_URL (set to your production domain) so the link
      // in WhatsApp is always publicly accessible. Falls back to the request
      // host for environments where the env var isn't set.
      const configuredUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
      const host   = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
      const proto  = request.headers.get('x-forwarded-proto') || 'https';
      const origin = configuredUrl || `${proto}://${host}`;
      const proxyUrl = `${origin}/api/prescriptions/view/${filename}`;
      return Response.json({ url: proxyUrl });
    }

    // Dev fallback: return PDF inline as base64
    const b64 = pdfBuffer.toString('base64');
    return Response.json({ url: null, base64: b64, warning: 'Supabase not configured — PDF not uploaded' });

  } catch (err) {
    logger.error('PDF generation failed', err);
    return Response.json({ error: 'PDF generation failed. Please try again.' }, { status: 500 });
  }
}
