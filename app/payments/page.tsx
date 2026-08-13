'use client';

import { useState, useEffect } from 'react';
import { CreditCard, DollarSign, FileText, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { CardSkeleton } from '@/components/LoadingStates';
import { notificationManager } from '@/lib/notifications';
import { PaymentAnalytics } from '@/components/PaymentAnalytics';
import { PageHero } from '@/components/ui/page-hero';

interface Invoice {
  id: string;
  invoiceNumber: string;
  patientId: string;
  patientName?: string;
  amount: number;
  status: string;
  dueDate: string;
  createdAt: string;
  visitId?: string;
  paymentMethod?: string;
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  invoiceId?: string;
}

interface Visit {
  id: string;
  patientId: string;
  patientName?: string;
  visitDate: string;
  notes?: string;
  paidBy?: string;
  fees?: { total: number }[];
}

interface ClinicProfile {
  clinicName?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  invoiceHeader?: string | null;
  invoiceFooter?: string | null;
  receiptHeader?: string | null;
  receiptFooter?: string | null;
}

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState<'analytics' | 'invoices' | 'payments'>('analytics');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch invoices summary (optimized single query instead of N+1)
      const invoicesRes = await fetch('/api/invoices/summary');
      if (invoicesRes.ok) {
        const invoicesData = await invoicesRes.json();
        setInvoices(Array.isArray(invoicesData) ? invoicesData : invoicesData.data || []);
      }

      // Fetch payments
      const paymentsRes = await fetch('/api/payments');
      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json();
        setPayments(Array.isArray(paymentsData) ? paymentsData : paymentsData.data || paymentsData.payments || []);
      }

      // Visit-level analytics (paidBy grouping, per-patient revenue) are handled
      // by the PatientVisitAnalytics component via /api/patients/analytics.
      // We no longer need a bulk patient dump here — it was always returning an
      // empty visits array anyway because the patients list endpoint only returns
      // the most-recent visitDate, not full visit records.
    } catch (error) {
      notificationManager.error('Error', 'Failed to load payment data');
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getClinicProfile = async (): Promise<ClinicProfile | null> => {
    try {
      const response = await fetch('/api/clinic-profile');
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('Failed to load clinic profile:', error);
      return null;
    }
  };

  const handleDownloadInvoice = async (invoice: Invoice) => {
    const profile = await getClinicProfile();
    const clinicAddress = [profile?.address, profile?.city, profile?.state, profile?.pincode]
      .filter(Boolean)
      .join(', ');

    // Generate a professional invoice PDF
    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; }
          .container { max-width: 900px; margin: 0 auto; padding: 40px 20px; }
          .header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 40px; border-bottom: 3px solid #1a7f7e; padding-bottom: 20px; }
          .clinic-info h1 { color: #1a7f7e; font-size: 28px; margin-bottom: 5px; }
          .clinic-info p { color: #666; font-size: 13px; margin: 2px 0; }
          .invoice-title { text-align: right; }
          .invoice-title h2 { color: #1a7f7e; font-size: 32px; font-weight: 300; letter-spacing: 2px; }
          .invoice-title p { color: #999; font-size: 12px; }
          
          .invoice-details { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
          .detail-section h3 { color: #1a7f7e; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 1px; }
          .detail-section p { font-size: 13px; margin: 5px 0; }
          .detail-section .label { color: #999; font-size: 12px; }
          
          table { width: 100%; border-collapse: collapse; margin: 30px 0; }
          thead { background-color: #f5f5f5; border-top: 2px solid #1a7f7e; border-bottom: 2px solid #1a7f7e; }
          th { padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #1a7f7e; text-transform: uppercase; letter-spacing: 0.5px; }
          td { padding: 12px; font-size: 13px; border-bottom: 1px solid #eee; }
          tbody tr:last-child td { border-bottom: 2px solid #1a7f7e; }
          
          .amount-right { text-align: right; }
          .total-section { display: flex; justify-content: flex-end; margin: 30px 0; }
          .total-box { width: 300px; }
          .total-row { display: flex; justify-content: space-between; padding: 10px 0; font-size: 13px; border-bottom: 1px solid #eee; }
          .total-row.grand-total { border-top: 2px solid #1a7f7e; border-bottom: 2px solid #1a7f7e; font-weight: 600; font-size: 16px; color: #1a7f7e; padding: 15px 0; }
          
          .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 11px; }
          .footer p { margin: 5px 0; }
          
          .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
          .status-paid { background-color: #d4edda; color: #155724; }
          .status-pending { background-color: #fff3cd; color: #856404; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="clinic-info">
              <h1>${profile?.clinicName || 'Clinic Name'}</h1>
              <p>${profile?.website || 'Professional Medical Services'}</p>
              ${profile?.invoiceHeader ? `<p style="margin-top: 10px; font-size: 12px;">${profile.invoiceHeader}</p>` : ''}
              ${clinicAddress ? `<p style="font-size: 12px;">${clinicAddress}</p>` : ''}
              ${profile?.email ? `<p style="margin-top: 10px; font-size: 12px;">Email: ${profile.email}</p>` : ''}
              ${profile?.phone ? `<p style="font-size: 12px;">Phone: ${profile.phone}</p>` : ''}
            </div>
            <div class="invoice-title">
              <h2>INVOICE</h2>
              <p>Professional Medical Services</p>
            </div>
          </div>
          
          <div class="invoice-details">
            <div>
              <div class="detail-section">
                <h3>Bill To</h3>
                <p><strong>${invoice.patientName || 'Patient'}</strong></p>
                <p class="label">Patient Invoice</p>
              </div>
            </div>
            <div>
              <div class="detail-section">
                <h3>Invoice Details</h3>
                <p><span class="label">Invoice #:</span> <strong>${invoice.invoiceNumber}</strong></p>
                <p><span class="label">Date:</span> <strong>${formatDate(invoice.createdAt)}</strong></p>
                <p><span class="label">Due Date:</span> <strong>${formatDate(invoice.dueDate)}</strong></p>
                <p style="margin-top: 10px;"><span class="label">Status:</span> <span class="status-badge status-${invoice.status?.toLowerCase()}">${invoice.status?.toUpperCase()}</span></p>
              </div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th class="amount-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Medical Services & Consultation</td>
                <td class="amount-right"><strong>₹${invoice.amount.toFixed(2)}</strong></td>
              </tr>
            </tbody>
          </table>
          
          <div class="total-section">
            <div class="total-box">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>₹${invoice.amount.toFixed(2)}</span>
              </div>
              <div class="total-row">
                <span>Tax (0%):</span>
                <span>₹0.00</span>
              </div>
              <div class="total-row grand-total">
                <span>Total Amount Due:</span>
                <span>₹${invoice.amount.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <div class="footer">
            <p><strong>Payment Terms:</strong> Due upon receipt</p>
            ${profile?.invoiceFooter ? `<p>${profile.invoiceFooter}</p>` : '<p>Thank you for choosing our clinic for your healthcare needs.</p>'}
            <p style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">This is an automatically generated invoice. Please retain for your records.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    downloadPDF(invoiceHTML);
    notificationManager.success('Success', 'Invoice downloaded');
  };

  const handleDownloadReceipt = async (invoice: Invoice) => {
    const profile = await getClinicProfile();

    // Generate a professional receipt PDF
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 30px 20px; }
          .receipt-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1a7f7e; padding-bottom: 20px; }
          .receipt-header h1 { color: #1a7f7e; font-size: 24px; margin-bottom: 5px; }
          .receipt-header p { color: #666; font-size: 12px; margin: 3px 0; }
          
          .receipt-details { margin: 25px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; border-bottom: 1px dotted #ddd; }
          .detail-row .label { color: #666; font-weight: 500; }
          .detail-row .value { font-weight: 600; }
          
          .divider { border-top: 2px dashed #1a7f7e; margin: 20px 0; }
          
          .amount-section { text-align: center; margin: 25px 0; }
          .amount-label { color: #666; font-size: 12px; margin-bottom: 8px; }
          .amount-value { font-size: 32px; font-weight: 300; color: #1a7f7e; letter-spacing: 1px; }
          
          .payment-info { background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; font-size: 12px; }
          .payment-info p { margin: 5px 0; }
          
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #999; font-size: 11px; }
          .footer p { margin: 5px 0; }
          
          .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; background-color: #d4edda; color: #155724; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="receipt-header">
            <h1>RECEIPT</h1>
            <p>${profile?.clinicName || 'Clinic Name'} - Medical Services</p>
            <p style="margin-top: 8px; font-size: 11px; color: #999;">${profile?.receiptHeader || 'Professional Healthcare Receipt'}</p>
          </div>
          
          <div class="receipt-details">
            <div class="detail-row">
              <span class="label">Receipt #:</span>
              <span class="value">${invoice.invoiceNumber}</span>
            </div>
            <div class="detail-row">
              <span class="label">Date:</span>
              <span class="value">${formatDate(invoice.createdAt)}</span>
            </div>
            <div class="detail-row">
              <span class="label">Patient Name:</span>
              <span class="value">${invoice.patientName || 'Patient'}</span>
            </div>
            <div class="detail-row">
              <span class="label">Status:</span>
              <span class="value"><span class="status-badge">${invoice.status?.toUpperCase()}</span></span>
            </div>
          </div>
          
          <div class="divider"></div>
          
          <div class="amount-section">
            <p class="amount-label">Amount Received</p>
            <p class="amount-value">₹${invoice.amount.toFixed(2)}</p>
          </div>
          
          <div class="divider"></div>
          
          <div class="payment-info">
            <p><strong>Service Details:</strong></p>
            <p>Medical Consultation & Services</p>
            <p style="margin-top: 8px; font-size: 11px; color: #999;">Invoice Reference: ${invoice.invoiceNumber}</p>
          </div>
          
          <div class="footer">
            <p><strong>Thank you for your payment!</strong></p>
            <p>Please retain this receipt for your records.</p>
            ${profile?.receiptFooter ? `<p style="margin-top: 15px; border-top: 1px solid #ddd; padding-top: 10px;">${profile.receiptFooter}</p>` : `<p style="margin-top: 15px; border-top: 1px solid #ddd; padding-top: 10px;">${profile?.clinicName || 'Clinic Name'} | Professional Medical Services</p>`}
            ${profile?.email ? `<p>For inquiries, please contact us at ${profile.email}</p>` : ''}
          </div>
        </div>
      </body>
      </html>
    `;
    
    downloadPDF(receiptHTML);
    notificationManager.success('Success', 'Receipt downloaded');
  };

  const downloadPDF = (htmlContent: string) => {
    // Create a blob from the HTML content
    const blob = new Blob([htmlContent], { type: 'text/html' });
    
    // Create a temporary iframe to print to PDF
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = URL.createObjectURL(blob);
    
    document.body.appendChild(iframe);
    
    iframe.onload = () => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(iframe.src);
      }, 100);
    };
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'overdue':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const totalPaid = payments.reduce((sum, pay) => sum + (pay.amount || 0), 0);
  const pendingAmount = totalInvoiced - totalPaid;

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="FinX"
        eyebrowIcon={<CreditCard className="h-3.5 w-3.5" />}
        title="Financial Overview"
        subtitle="Invoices, payments and revenue analytics"
        stats={[
          { label: 'Invoiced', value: `₹${totalInvoiced.toFixed(0)}` },
          { label: 'Collected', value: `₹${totalPaid.toFixed(0)}`, color: 'green' },
          { label: 'Pending', value: `₹${Math.max(0, pendingAmount).toFixed(0)}`, color: pendingAmount > 0 ? 'yellow' : 'white' },
        ]}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-brand-teal to-brand-teal/90 p-5 rounded-xl shadow-sm text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium">Total Invoiced</p>
              <p className="text-3xl font-bold mt-1">
                ₹{totalInvoiced.toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-white/20 rounded-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white border-2 border-brand-teal p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Total Collected</p>
              <p className="text-3xl font-bold text-brand-teal mt-1">
                ₹{totalPaid.toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-brand-teal/10 rounded-lg">
              <DollarSign className="w-6 h-6 text-brand-teal" />
            </div>
          </div>
        </div>

        <div className="bg-white border-2 border-brand-yellow p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Pending</p>
              <p className="text-3xl font-bold text-brand-yellow mt-1">
                ₹{pendingAmount.toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-brand-yellow/10 rounded-lg">
              <TrendingUp className="w-6 h-6 text-brand-yellow" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-3 font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'analytics'
              ? 'border-brand-teal text-brand-teal'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Analytics
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-3 font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'invoices'
              ? 'border-brand-teal text-brand-teal'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Invoices ({invoices.length})
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-3 font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'payments'
              ? 'border-brand-teal text-brand-teal'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Payments ({payments.length})
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <>
          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <PaymentAnalytics invoices={invoices} payments={payments} visits={visits} />
          )}

          {/* Invoices Tab */}
          {activeTab === 'invoices' && (
            <div className="space-y-4">
              {invoices.length === 0 ? (
                <Card className="p-12 text-center">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No invoices found</p>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {invoices.map((invoice) => (
                    <Card key={invoice.id} className="p-4 sm:p-6 hover:shadow-lg transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900">
                              {invoice.invoiceNumber}
                            </h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                              {invoice.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 truncate">
                            {invoice.patientName || 'Patient'} · Due: {formatDate(invoice.dueDate)}
                          </p>
                        </div>
                        <div className="sm:text-right flex-shrink-0">
                          <p className="text-2xl font-bold text-gray-900">
                            ₹{invoice.amount.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3 items-center justify-end">
                        <button
                          onClick={() => handleDownloadInvoice(invoice)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all"
                        >
                          Invoice
                        </button>
                        <button
                          onClick={() => handleDownloadReceipt(invoice)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-all"
                        >
                          Receipt
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              {payments.length === 0 ? (
                <Card className="p-12 text-center">
                  <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No payments found</p>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {payments.map((payment) => (
                    <Card key={payment.id} className="p-4 sm:p-6 hover:shadow-lg transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900">
                              Payment {payment.id.slice(0, 8)}
                            </h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                              {payment.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            {formatDate(payment.createdAt)}
                          </p>
                        </div>
                        <div className="sm:text-right flex-shrink-0">
                          <p className="text-2xl font-bold text-green-600">
                            ₹{payment.amount.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}


        </>
      )}
    </div>
  );
}
