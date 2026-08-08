'use client';

import { useState } from 'react';
import { Download, FileJson, FileText, Share2 } from 'lucide-react';
import { notificationManager } from '@/lib/notifications';

interface AnalyticsData {
  totalPatients: number;
  patientsThisMonth: number;
  patientsThisWeek: number;
  consultationsToday: number;
  followUpsThisWeek: number;
  upcomingFollowUps: number;
  overdueFollowUps: number;
  [key: string]: any;
}

interface AnalyticsExportProps {
  data: AnalyticsData;
  fileName?: string;
}

export function AnalyticsExport({ data, fileName = 'analytics' }: AnalyticsExportProps) {
  const [isExporting, setIsExporting] = useState(false);

  const exportToJSON = async () => {
    try {
      setIsExporting(true);
      const jsonData = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      downloadFile(blob, `${fileName}-${new Date().toISOString().split('T')[0]}.json`);
      notificationManager.success('Export successful', 'Analytics data exported as JSON');
    } catch (error) {
      notificationManager.error('Export failed', 'Could not export analytics data');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToCSV = async () => {
    try {
      setIsExporting(true);
      const csv = convertToCSV(data);
      const blob = new Blob([csv], { type: 'text/csv' });
      downloadFile(blob, `${fileName}-${new Date().toISOString().split('T')[0]}.csv`);
      notificationManager.success('Export successful', 'Analytics data exported as CSV');
    } catch (error) {
      notificationManager.error('Export failed', 'Could not export analytics data');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToHTML = async () => {
    try {
      setIsExporting(true);
      const html = generateHTMLReport(data);
      const blob = new Blob([html], { type: 'text/html' });
      downloadFile(blob, `${fileName}-${new Date().toISOString().split('T')[0]}.html`);
      notificationManager.success('Export successful', 'Analytics report exported as HTML');
    } catch (error) {
      notificationManager.error('Export failed', 'Could not export analytics report');
    } finally {
      setIsExporting(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      const text = JSON.stringify(data, null, 2);
      await navigator.clipboard.writeText(text);
      notificationManager.success('Copied', 'Analytics data copied to clipboard');
    } catch (error) {
      notificationManager.error('Copy failed', 'Could not copy to clipboard');
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={exportToJSON}
        disabled={isExporting}
        className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border-2 border-blue-200 rounded-lg hover:bg-blue-100 transition-all disabled:opacity-50 font-medium text-sm"
      >
        <FileJson className="w-4 h-4" />
        JSON
      </button>

      <button
        onClick={exportToCSV}
        disabled={isExporting}
        className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 border-2 border-green-200 rounded-lg hover:bg-green-100 transition-all disabled:opacity-50 font-medium text-sm"
      >
        <FileText className="w-4 h-4" />
        CSV
      </button>

      <button
        onClick={exportToHTML}
        disabled={isExporting}
        className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 border-2 border-purple-200 rounded-lg hover:bg-purple-100 transition-all disabled:opacity-50 font-medium text-sm"
      >
        <Download className="w-4 h-4" />
        HTML
      </button>

      <button
        onClick={copyToClipboard}
        disabled={isExporting}
        className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 border-2 border-gray-200 rounded-lg hover:bg-gray-100 transition-all disabled:opacity-50 font-medium text-sm"
      >
        <Share2 className="w-4 h-4" />
        Copy
      </button>
    </div>
  );
}

/**
 * Download file helper
 */
function downloadFile(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Convert data to CSV format
 */
function convertToCSV(data: AnalyticsData): string {
  const headers = Object.keys(data);
  const values = Object.values(data).map(v => {
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  });

  const headerRow = headers.join(',');
  const valueRow = values.map(v => `"${v}"`).join(',');

  return `${headerRow}\n${valueRow}`;
}

/**
 * Generate HTML report
 */
function generateHTMLReport(data: AnalyticsData): string {
  const timestamp = new Date().toLocaleString();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Analytics Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .header {
      background: linear-gradient(135deg, #0d9488 0%, #0d9488 100%);
      color: white;
      padding: 30px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0 0 10px 0;
      font-size: 28px;
    }
    .header p {
      margin: 0;
      opacity: 0.9;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .metric-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #0d9488;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .metric-card h3 {
      margin: 0 0 10px 0;
      color: #0d9488;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .metric-card .value {
      font-size: 32px;
      font-weight: bold;
      color: #333;
      margin: 0;
    }
    .footer {
      text-align: center;
      color: #666;
      font-size: 12px;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
    }
    @media print {
      body { background: white; }
      .metric-card { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Analytics Report</h1>
    <p>Generated on ${timestamp}</p>
  </div>

  <div class="metrics-grid">
    ${Object.entries(data)
      .map(
        ([key, value]) => `
      <div class="metric-card">
        <h3>${formatKey(key)}</h3>
        <p class="value">${formatValue(value)}</p>
      </div>
    `
      )
      .join('')}
  </div>

  <div class="footer">
    <p>This report was automatically generated by Faith Clinic Analytics System</p>
  </div>
</body>
</html>
  `;
}

/**
 * Format object keys for display
 */
function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/**
 * Format values for display
 */
function formatValue(value: any): string {
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    return value.toLocaleString();
  }
  return String(value);
}
