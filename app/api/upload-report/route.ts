import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateFileOrThrow, FILE_UPLOAD_CONFIGS, generateSafeFilename } from '@/lib/file-upload-validator';
import { withMiddleware, successResponse } from '@/lib/middleware';
import { ApiErrors } from '@/lib/api-error';
import { RATE_LIMITS } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

export const POST = withMiddleware(
  async (request: NextRequest) => {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      throw ApiErrors.badRequest('No file uploaded');
    }

    // Validate file size, MIME type, and extension
    validateFileOrThrow(file, FILE_UPLOAD_CONFIGS.PATIENT_REPORTS);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const supabase = getSupabaseAdminClient();

    if (!supabase) {
      throw ApiErrors.internalError('Storage not configured: missing Supabase credentials');
    }

    const bucketName = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'patient-reports';
    const fileName = generateSafeFilename(file.name, 'report');
    const filePath = `reports/${fileName}`;

    // Upload using service role key — bypasses RLS
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw ApiErrors.internalError(`Storage upload failed: ${uploadError.message}`);
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${filePath}`;

    return successResponse(
      {
        url: publicUrl,
        filename: file.name,
        uploadedAt: new Date().toISOString(),
      },
      200,
      request
    );
  },
  {
    rateLimit: RATE_LIMITS.UPLOAD,
  }
);
