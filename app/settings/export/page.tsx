'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, FileJson, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { notificationManager } from '@/lib/notifications';
import { PageHero } from '@/components/ui/page-hero';

export default function ExportPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [includeVisits, setIncludeVisits] = useState(true);
  const [includeAppointments, setIncludeAppointments] = useState(true);
  
  const handleExport = async (format: 'excel' | 'json' | 'csv') => {
    setIsExporting(true);
    
    try {
      const params = new URLSearchParams({
        format,
        includeVisits: includeVisits.toString(),
        includeAppointments: includeAppointments.toString(),
      });
      
      const response = await fetch(`/api/export?${params}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Export failed');
      }
      
      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `faithclinic-export.${format === 'excel' ? 'xlsx' : format}`;
      
      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      notificationManager.success('Export Complete', `Downloaded ${filename}`);
    } catch (error) {
      notificationManager.error('Export Failed', (error as Error).message);
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHero
        eyebrow="Settings"
        eyebrowIcon={<Download className="h-3.5 w-3.5" />}
        title="Export Your Data"
        subtitle="Download all patient data in Excel, JSON or CSV for backup or migration"
      />
      
      {/* Export Options */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Export Options</h3>
        
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={includeVisits}
              onChange={(e) => setIncludeVisits(e.target.checked)}
              className="w-5 h-5 text-brand-teal rounded focus:ring-2 focus:ring-brand-teal"
            />
            <div>
              <div className="font-medium">Include Visit History</div>
              <div className="text-sm text-gray-600">Export all patient consultations and visit records</div>
            </div>
          </label>
          
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={includeAppointments}
              onChange={(e) => setIncludeAppointments(e.target.checked)}
              className="w-5 h-5 text-brand-teal rounded focus:ring-2 focus:ring-brand-teal"
            />
            <div>
              <div className="font-medium">Include Appointments</div>
              <div className="text-sm text-gray-600">Export all scheduled appointments</div>
            </div>
          </label>
        </div>
      </div>
      
      {/* Export Formats */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Excel Export */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-green-300 transition-all">
          <FileSpreadsheet className="w-10 h-10 text-green-600 mb-3" />
          <h3 className="text-xl font-semibold mb-2">Excel Export</h3>
          <p className="text-gray-600 mb-4 text-sm">
            Download as Excel file with multiple sheets. Best for backup and migration.
          </p>
          
          <div className="mb-4 text-xs text-gray-500">
            <div className="font-medium mb-1">Includes:</div>
            <ul className="space-y-1">
              <li>✓ All patient records</li>
              {includeVisits && <li>✓ Visit history</li>}
              {includeAppointments && <li>✓ Appointments</li>}
            </ul>
          </div>
          
          <button
            onClick={() => handleExport('excel')}
            disabled={isExporting}
            className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            {isExporting ? 'Exporting...' : 'Download Excel'}
          </button>
        </div>
        
        {/* JSON Export */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-blue-300 transition-all">
          <FileJson className="w-10 h-10 text-blue-600 mb-3" />
          <h3 className="text-xl font-semibold mb-2">JSON Backup</h3>
          <p className="text-gray-600 mb-4 text-sm">
            Complete backup in JSON format. Best for technical users and API integration.
          </p>
          
          <div className="mb-4 text-xs text-gray-500">
            <div className="font-medium mb-1">Includes:</div>
            <ul className="space-y-1">
              <li>✓ Complete database dump</li>
              <li>✓ All relationships</li>
              <li>✓ Clinic information</li>
            </ul>
          </div>
          
          <button
            onClick={() => handleExport('json')}
            disabled={isExporting}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            {isExporting ? 'Exporting...' : 'Download JSON'}
          </button>
        </div>
        
        {/* CSV Export */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-purple-300 transition-all">
          <FileText className="w-10 h-10 text-purple-600 mb-3" />
          <h3 className="text-xl font-semibold mb-2">CSV Export</h3>
          <p className="text-gray-600 mb-4 text-sm">
            Download as CSV file. Universal format that works with any software.
          </p>
          
          <div className="mb-4 text-xs text-gray-500">
            <div className="font-medium mb-1">Includes:</div>
            <ul className="space-y-1">
              <li>✓ Patient records (CSV)</li>
              <li className="text-gray-400">• Visits & appointments</li>
              <li className="text-gray-400 text-xs">(separate files)</li>
            </ul>
          </div>
          
          <button
            onClick={() => handleExport('csv')}
            disabled={isExporting}
            className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            {isExporting ? 'Exporting...' : 'Download CSV'}
          </button>
        </div>
      </div>
      
      {/* Info Boxes */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* What's Included */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">What's Included?</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>✓ All patient records with complete details</li>
                {includeVisits && <li>✓ Complete visit history and consultations</li>}
                {includeAppointments && <li>✓ All scheduled appointments</li>}
                <li>✓ Clinic information and settings</li>
                <li>✓ Export date and version info</li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Security Note */}
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-yellow-900 mb-2">Security Note</h4>
              <p className="text-sm text-yellow-700 mb-2">
                Your exported data contains sensitive patient information.
              </p>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Store files securely</li>
                <li>• Don't share publicly</li>
                <li>• Delete after use if temporary</li>
                <li>• Use encryption for storage</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      {/* Use Cases */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">When to Export?</h3>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="font-medium text-brand-teal mb-1">📦 Regular Backups</div>
            <p className="text-gray-600">Export weekly or monthly to keep offline backups of your data</p>
          </div>
          <div>
            <div className="font-medium text-brand-teal mb-1">🔄 System Migration</div>
            <p className="text-gray-600">Moving to another system? Export all your data first</p>
          </div>
          <div>
            <div className="font-medium text-brand-teal mb-1">📊 Data Analysis</div>
            <p className="text-gray-600">Use Excel or other tools to analyze your clinic data</p>
          </div>
        </div>
      </div>
    </div>
  );
}
