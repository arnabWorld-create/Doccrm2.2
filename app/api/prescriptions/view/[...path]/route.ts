import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * GET /api/prescriptions/view/prescriptions/prescription_xxx.pdf
 *
 * Proxies the PDF from Supabase storage and serves it through your own domain,
 * so WhatsApp (and other platforms) show your custom domain instead of supabase.co.
 *
 * No auth required — the filename acts as an unguessable token
 * (timestamp + patientId in the name).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const storagePath = params.path.join('/'); // e.g. "prescriptions/prescription_FC-864_2026-08-14_1723123456789.pdf"

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return new Response('Storage not configured', { status: 503 });
    }

    const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'patient-reports';

    const { data, error } = await supabase.storage
      .from(bucket)
      .download(storagePath);

    if (error || !data) {
      logger.error('[view-pdf] Download error', error);
      return new Response('PDF not found', { status: 404 });
    }

    const buffer = Buffer.from(await data.arrayBuffer());

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${params.path.at(-1)}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (err) {
    logger.error('[view-pdf] Proxy failed', err);
    return new Response('Failed to retrieve PDF', { status: 500 });
  }
}
