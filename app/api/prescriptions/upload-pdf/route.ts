import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { requirePermission } from '@/lib/rbac';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

/**
 * POST /api/prescriptions/upload-pdf
 * Body: FormData { pdf: File (application/pdf), filename: string }
 * Returns: { url: string }
 *
 * Uploads a prescription PDF to Supabase Storage and returns a public URL
 * so it can be shared via WhatsApp.
 */
export async function POST(request: NextRequest) {
  // Auth check — must be a logged-in user with patient read permission
  const { error: authError } = await requirePermission(request, 'patients', 'read');
  if (authError) return authError;

  try {
    const formData = await request.formData();
    const pdfFile = formData.get('pdf') as File | null;
    // Always generate a UUID-based filename server-side — never trust the
    // client-supplied filename for the storage path. UUID = 128 bits of
    // entropy, not guessable even if an attacker knows the patient ID.
    const clientFilename = (formData.get('filename') as string | null) || '';
    const safeBasename = clientFilename.replace(/[^a-zA-Z0-9_\-\.]/g, '_').replace(/\.pdf$/i, '');
    const filename = safeBasename
      ? `${safeBasename}_${randomUUID()}.pdf`
      : `prescription_${randomUUID()}.pdf`;

    if (!pdfFile || pdfFile.type !== 'application/pdf') {
      return Response.json({ error: 'A valid PDF file is required' }, { status: 400 });
    }

    // Max 5 MB
    if (pdfFile.size > 5 * 1024 * 1024) {
      return Response.json({ error: 'PDF exceeds 5 MB limit' }, { status: 400 });
    }

    const buffer = Buffer.from(await pdfFile.arrayBuffer());
    const storagePath = `prescriptions/${filename}`;

    const supabase = getSupabaseAdminClient();

    if (!supabase) {
      // Dev fallback — return a dummy URL so the flow doesn't break locally
      return Response.json({
        url: null,
        warning: 'Supabase not configured — PDF not uploaded. WhatsApp message will be sent without PDF link.',
      });
    }

    const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'patient-reports';

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: true, // allow re-upload for same visit
      });

    if (uploadError) {
      return Response.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
    }

    // Build the proxy URL.
    // Prefer NEXT_PUBLIC_APP_URL (set to your production domain) so the link
    // in WhatsApp is always publicly accessible.
    const configuredUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
    const host     = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
    const proto    = request.headers.get('x-forwarded-proto') || 'https';
    const origin   = configuredUrl || `${proto}://${host}`;
    const proxyUrl = `${origin}/api/prescriptions/view/${storagePath}`;

    return Response.json({ url: proxyUrl });
  } catch (err) {
    logger.error('PDF upload failed', err);
    return Response.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
  }
}
