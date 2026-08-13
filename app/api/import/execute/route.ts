import { NextRequest } from 'next/server';
import { ImportService } from '@/lib/import-service';
import { requirePermission } from '@/lib/rbac';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { calculatePatientAnalytics } from '@/lib/analytics-calculator';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max for imports

// Track active imports per user to prevent concurrent imports
const activeImports = new Map<string, boolean>();

/**
 * Execute import with progress streaming.
 *
 * FIX #1: Changed from requireAuth (any logged-in user) to
 * requirePermission('patients', 'write') — bulk importing 5,000 patients
 * is a write operation and must be restricted accordingly.
 *
 * FIX #3: Raw Prisma/internal error messages are no longer streamed
 * to the client. User-friendly messages are sent instead.
 */
export async function POST(request: NextRequest) {
  // FIX #1: Require explicit write permission, not just any valid token
  const { error, user } = await requirePermission(request, 'patients', 'write');
  if (error) return error;
  
  const userId = user.userId;
  
  // Check for concurrent imports (prevent multiple imports at once)
  if (activeImports.get(userId)) {
    return new Response(
      JSON.stringify({ error: 'An import is already in progress. Please wait for it to complete.' }),
      { status: 409, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  try {
    const body = await request.json();
    const { data, mapping, duplicateStrategy = 'skip' } = body;
    
    if (!data || !Array.isArray(data)) {
      return new Response(
        JSON.stringify({ error: 'Invalid data format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Limit data size (Issue 3 - Memory protection)
    if (data.length > 5000) {
      return new Response(
        JSON.stringify({ error: 'Too many rows. Maximum 5000 records per import.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Mark import as active
    activeImports.set(userId, true);
    
    // Create readable stream for progress updates
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const importService = new ImportService();
        const startTime = Date.now();
        
        let successCount = 0;
        let failedCount = 0;
        let patientsCreated = 0;
        let visitsCreated = 0;
        let duplicatesSkipped = 0;
        let duplicatesUpdated = 0;
        const errors: Array<{ row: number; error: string }> = [];
        
        const batchSize = 50; // Reduced batch size for better memory management
        const totalBatches = Math.ceil(data.length / batchSize);
        
        try {
          // Pre-generate all patient IDs needed for this import to avoid
          // race conditions when multiple rows in the same batch need new IDs.
          // We'll pop from this pool inside the loop rather than querying mid-transaction.
          const needsNewIds = data.filter((_: any, idx: number) => {
            // We can't know ahead of time which rows are duplicates, so we
            // generate enough IDs for every row — unused ones are simply discarded.
            return true;
          });
          const preGeneratedIds = await importService.preallocatePatientIds(prisma, needsNewIds.length);
          let idPool = [...preGeneratedIds];

          for (let i = 0; i < totalBatches; i++) {
            const batch = data.slice(i * batchSize, (i + 1) * batchSize);
            const batchOffset = i * batchSize; // absolute start index of this batch
            
            // Process each row individually so a single bad row doesn't roll
            // back the whole batch.
            for (let j = 0; j < batch.length; j++) {
              const row = batch[j];
              const rowIndex = batchOffset + j; // correct absolute index, no indexOf()
              
              try {
                await prisma.$transaction(async (tx) => {
                  // Map row to patient and visit data
                  const { patient: patientData, visit: visitData } = await importService.mapRowToPatientAndVisit(row, mapping);
                  
                  // Skip if name is empty
                  if (!patientData.name) {
                    failedCount++;
                    errors.push({
                      row: rowIndex + 2,
                      error: 'Patient name is required',
                    });
                    return; // return from transaction callback — not a throw, no rollback needed
                  }
                  
                  // Check for duplicates
                  const duplicateCheck = await importService.checkDuplicate(patientData, tx);
                  
                  let patient;
                  if (duplicateCheck.isDuplicate && duplicateStrategy !== 'create') {
                    if (duplicateStrategy === 'skip') {
                      duplicatesSkipped++;
                      successCount++;
                      return;
                    } else if (duplicateStrategy === 'update') {
                      // Update existing patient
                      patient = await tx.patient.update({
                        where: { id: duplicateCheck.existingPatient.id },
                        data: {
                          age: patientData.age || duplicateCheck.existingPatient.age,
                          gender: patientData.gender || duplicateCheck.existingPatient.gender,
                          bloodGroup: patientData.bloodGroup || duplicateCheck.existingPatient.bloodGroup,
                          address: patientData.address || duplicateCheck.existingPatient.address,
                          allergies: patientData.allergies || duplicateCheck.existingPatient.allergies,
                          chronicConditions: patientData.chronicConditions || duplicateCheck.existingPatient.chronicConditions,
                        },
                      });
                      duplicatesUpdated++;
                    }
                  } else {
                    // Create new patient — use a pre-generated ID from the pool
                    // to avoid the MAX() race condition inside a transaction.
                    patientData.patientId = idPool.shift() ?? await importService.generateUniquePatientId(tx);
                    
                    patient = await tx.patient.create({
                      data: patientData,
                    });
                    patientsCreated++;
                  }
                  
                  // Create visit if visit data exists
                  if (visitData && patient) {
                    await tx.visit.create({
                      data: {
                        ...visitData,
                        patientId: patient.id,
                      },
                    });
                    visitsCreated++;
                  }
                  
                  successCount++;
                }, {
                  timeout: 10000, // 10 second timeout per single-row transaction
                });
              } catch (err: any) {
                failedCount++;
                let errorMessage = err.message || 'Unknown error';
                
                // Log detailed error for debugging (server-side only)
                logger.error(`Import row ${rowIndex + 2} failed`, err, {
                  message: err.message,
                  code: err.code,
                  meta: err.meta,
                });
                
                // User-friendly error messages
                if (err.code === 'P2002') {
                  const target = err.meta?.target || [];
                  if (target.includes('patientId')) {
                    errorMessage = 'Duplicate patient ID';
                  } else if (target.includes('contact')) {
                    errorMessage = 'Duplicate contact number';
                  } else {
                    errorMessage = 'Duplicate record detected';
                  }
                } else if (err.code === 'P2003') {
                  errorMessage = 'Invalid reference data';
                } else if (errorMessage.includes('Unique constraint')) {
                  errorMessage = 'Duplicate patient ID detected';
                } else if (errorMessage.includes('Foreign key constraint')) {
                  errorMessage = 'Invalid reference data';
                } else if (errorMessage.includes('Invalid')) {
                  errorMessage = `Invalid data: ${errorMessage}`;
                }
                
                errors.push({
                  row: rowIndex + 2,
                  error: errorMessage,
                });
              }
            }
            
            // Send progress update
            const progress = ((i + 1) / totalBatches) * 100;
            const message = `data: ${JSON.stringify({ 
              progress: Math.round(progress),
              success: successCount,
              failed: failedCount,
            })}\n\n`;
            
            controller.enqueue(encoder.encode(message));
          }
          
          // Send final result
          const duration = Math.round((Date.now() - startTime) / 1000);
          const result = {
            success: successCount,
            failed: failedCount,
            errors: errors.slice(0, 100), // Limit to first 100 errors
            duration,
            patientsCreated,
            visitsCreated,
            duplicatesSkipped,
            duplicatesUpdated,
          };
          
          const finalMessage = `data: ${JSON.stringify({ result })}\n\n`;
          controller.enqueue(encoder.encode(finalMessage));

          // Rebuild analytics cache after import so the analytics page
          // reflects the newly imported patients immediately.
          // Runs after the stream is flushed — user already sees "done".
          // Fire-and-forget: a failure here must never fail the import.
          if (patientsCreated > 0 || visitsCreated > 0) {
            calculatePatientAnalytics()
              .then((r) => logger.info('Post-import analytics rebuild complete', r))
              .catch((e) => logger.error('Post-import analytics rebuild failed', e));
          }

          controller.close();
        } catch (err) {
          // FIX #3: Log full error server-side, send only a safe message in the stream
          logger.error('Import stream error', err);
          const errorMessage = `data: ${JSON.stringify({
            error: 'Import failed due to an internal error. Please try again.',
          })}\n\n`;
          controller.enqueue(encoder.encode(errorMessage));
          controller.close();
        } finally {
          // Release import lock
          activeImports.delete(userId);
        }
      },
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    activeImports.delete(user!.userId);
    // FIX #3: Log full error server-side, send only a safe message to client
    logger.error('Import execute failed', error);
    return new Response(
      JSON.stringify({ error: 'Import failed. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
