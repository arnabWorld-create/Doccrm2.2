import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';
import { withMiddleware, successResponse } from '@/lib/middleware';
import { ApiErrors } from '@/lib/api-error';
import { validateFileOrThrow, FILE_UPLOAD_CONFIGS, generateSafeFilename } from '@/lib/file-upload-validator';
import { RATE_LIMITS } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

// Logo uploads go to Supabase Storage when configured,
// otherwise fall back to local /public/uploads/ for dev environments.

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
    const { error: permError } = await requirePermission(request, 'settings', 'write');
    if (permError) throw ApiErrors.forbidden('Insufficient permissions to upload logo');

    const formData = await request.formData();
    const file = formData.get('logo') as File;

    if (!file) {
      throw ApiErrors.badRequest('No file uploaded');
    }

    // Validate file size, MIME type, and extension
    validateFileOrThrow(file, FILE_UPLOAD_CONFIGS.CLINIC_LOGO);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Additional magic-byte check to guard against spoofed file.type values
    validateImageMagicBytes(buffer, file.name);

    let logoPath: string;

    const supabase = getSupabaseAdminClient();

    if (supabase) {
      // ── Supabase storage (production) ────────────────────────────────────
      const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'patient-reports';
      const filename = generateSafeFilename(file.name, 'logo');
      const storagePath = `logos/${filename}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(storagePath, buffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        throw ApiErrors.internalError(`Storage upload failed: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(storagePath);

      logoPath = publicUrlData.publicUrl;
    } else {
      // ── Local filesystem fallback (development) ───────────────────────────
      const filename = generateSafeFilename(file.name, 'logo');
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

      await mkdir(uploadsDir, { recursive: true });
      await writeFile(path.join(uploadsDir, filename), buffer);

      logoPath = `/uploads/${filename}`;
    }

    // Update or create the clinic profile with the new logo URL
    const profile = await prisma.clinicProfile.findFirst();

    if (profile) {
      await prisma.clinicProfile.update({
        where: { id: profile.id },
        data: { logo: logoPath },
      });
    } else {
      await prisma.clinicProfile.create({
        data: {
          clinicName: 'Faith Clinic',
          logo: logoPath,
        },
      });
    }

    return successResponse(
      { message: 'Logo uploaded successfully', logoPath },
      200,
      request
    );
  },
  {
    rateLimit: RATE_LIMITS.UPLOAD,
  }
);

/**
 * Validate image magic bytes to catch files with spoofed MIME types.
 * Supports JPEG, PNG, GIF, WebP, and SVG.
 */
function validateImageMagicBytes(buffer: Buffer, filename: string): void {
  const ext = filename.toLowerCase().split('.').pop();

  // SVG is text-based — verify it looks like XML/SVG
  if (ext === 'svg') {
    const text = buffer.slice(0, 256).toString('utf8');
    if (!text.includes('<svg') && !text.includes('<?xml')) {
      throw ApiErrors.badRequest('File does not appear to be a valid SVG');
    }
    return;
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return;
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return;
  // GIF: 47 49 46 38
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return;
  // WebP: RIFF....WEBP
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) return;

  throw ApiErrors.badRequest(
    'File content does not match an allowed image format (JPEG, PNG, GIF, WebP, SVG)'
  );
}
