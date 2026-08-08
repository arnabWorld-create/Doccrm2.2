import { NextRequest, NextResponse } from 'next/server';
import { ExportService } from '@/lib/export-service';
import { requirePermission } from '@/lib/rbac';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Export patient data.
 * GET /api/export?format=excel|json|csv
 *
 * FIX #1: Changed from requireAuth (any logged-in user) to
 * requirePermission('patients', 'read') — only roles that are
 * allowed to read patients can export the full database.
 *
 * FIX #3: Raw error message no longer sent to client.
 */
export async function GET(request: NextRequest) {
  // FIX #1: Require explicit read permission on patients
  const { error, user } = await requirePermission(request, 'patients', 'read');
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'excel';
    const includeVisits = searchParams.get('includeVisits') !== 'false';
    const includeAppointments = searchParams.get('includeAppointments') !== 'false';

    const exportService = new ExportService();
    const timestamp = new Date().toISOString().split('T')[0];

    logger.info('Exporting data', {
      userId: user.id,
      format,
      includeVisits,
      includeAppointments,
    });

    switch (format) {
      case 'excel': {
        const buffer = await exportService.exportToExcel({
          includeVisits,
          includeAppointments,
        });

        return new Response(buffer as any, {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="faithclinic-export-${timestamp}.xlsx"`,
            'Content-Length': buffer.length.toString(),
          },
        });
      }

      case 'json': {
        const data = await exportService.exportToJSON({
          includeVisits,
          includeAppointments,
        });

        const jsonString = JSON.stringify(data, null, 2);

        return new Response(jsonString, {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="faithclinic-backup-${timestamp}.json"`,
          },
        });
      }

      case 'csv': {
        const csvFiles = await exportService.exportToCSV({
          includeVisits,
          includeAppointments,
        });

        const patientsCSV = csvFiles['patients.csv'];

        return new Response(patientsCSV, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="faithclinic-patients-${timestamp}.csv"`,
          },
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid format. Use: excel, json, or csv' },
          { status: 400 }
        );
    }
  } catch (error) {
    // FIX #3: Log full error server-side, send only a safe message to client
    logger.error('Export failed', error);
    return NextResponse.json(
      { error: 'Export failed. Please try again.' },
      { status: 500 }
    );
  }
}
