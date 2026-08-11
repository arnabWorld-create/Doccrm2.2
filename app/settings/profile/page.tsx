'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, User, Phone, Mail, Clock, Upload, Save, Image as ImageIcon, Settings, CheckCircle, XCircle } from 'lucide-react';
import Image from 'next/image';
import { PageHero } from '@/components/ui/page-hero';

// Toast notification component
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl border text-sm font-medium transition-all animate-in slide-in-from-bottom-4 ${
      type === 'success'
        ? 'bg-green-50 border-green-200 text-green-800'
        : 'bg-red-50 border-red-200 text-red-800'
    }`}>
      {type === 'success'
        ? <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
        : <XCircle className="h-5 w-5 text-red-600 shrink-0" />
      }
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100 text-lg leading-none">&times;</button>
    </div>
  );
}

export default function ClinicProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  const [formData, setFormData] = useState({
    clinicName: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: '',
    website: '',
    workingHours: '',
    doctorName: '',
    doctorQualification: '',
    registrationNumber: '',
    specialization: '',
    tagline: '',
    logo: '',
    invoiceHeader: '',
    invoiceFooter: '',
    receiptHeader: '',
    receiptFooter: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/clinic-profile');
      if (response.ok) {
        const data = await response.json();
        let legacySettings: Record<string, string> = {};

        try {
          const stored = window.localStorage.getItem('clinic_settings');
          legacySettings = stored ? JSON.parse(stored) : {};
        } catch (error) {
          console.error('Failed to read legacy clinic settings:', error);
        }

        setFormData({
          clinicName: data.clinicName || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          pincode: data.pincode || '',
          phone: data.phone || '',
          email: data.email || '',
          website: data.website || '',
          workingHours: data.workingHours || '',
          doctorName: data.doctorName || '',
          doctorQualification: data.doctorQualification || '',
          registrationNumber: data.registrationNumber || '',
          specialization: data.specialization || '',
          tagline: data.tagline || '',
          logo: data.logo || '',
          invoiceHeader: data.invoiceHeader || legacySettings.invoiceHeader || '',
          invoiceFooter: data.invoiceFooter || legacySettings.invoiceFooter || '',
          receiptHeader: data.receiptHeader || legacySettings.receiptHeader || '',
          receiptFooter: data.receiptFooter || legacySettings.receiptFooter || '',
        });
        if ([
          legacySettings.invoiceHeader,
          legacySettings.invoiceFooter,
          legacySettings.receiptHeader,
          legacySettings.receiptFooter,
        ].some(Boolean)) {
          showToast('Legacy invoice settings loaded. Save to apply for all users.', 'success');
        }
        if (data.logo) {
          setLogoPreview(data.logo);
        }
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file (PNG, JPG, or SVG)', 'error');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast('File size must be less than 2MB', 'error');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch('/api/upload-logo', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setLogoPreview(data.logoPath + '?t=' + Date.now());
        showToast('Logo uploaded successfully!', 'success');
      } else {
        showToast('Failed to upload logo. Please try again.', 'error');
      }
    } catch (error) {
      showToast('Failed to upload logo. Please try again.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFieldErrors({});

    try {
      const response = await fetch('/api/clinic-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        showToast('Profile saved successfully!', 'success');
      } else {
        const data = await response.json();
        if (response.status === 422 && data.errors) {
          // Show field-level validation errors
          setFieldErrors(
            Object.fromEntries(
              Object.entries(data.errors as Record<string, string[]>).map(([k, v]) => [k, v[0]])
            )
          );
          showToast('Please fix the errors below and try again.', 'error');
        } else {
          showToast(data.message || 'Failed to save profile. Please try again.', 'error');
        }
      }
    } catch (error) {
      showToast('Network error. Please check your connection and try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-brand-teal">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHero
        eyebrow="Settings"
        eyebrowIcon={<Settings className="h-3.5 w-3.5" />}
        title="Clinic Profile"
        subtitle="Manage your clinic information and doctor details for prescriptions"
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Logo Upload */}
        <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-gray-100">
          <h3 className="text-xl font-bold text-brand-teal mb-4 flex items-center">
            <ImageIcon className="h-5 w-5 mr-2" />
            Prescription Logo (Optional)
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Upload your clinic logo. It will appear only on printed prescriptions.
          </p>

          <div className="flex flex-col md:flex-row items-start gap-6">
            {/* Logo Preview */}
            <div className="w-full md:w-48 h-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
              {logoPreview ? (
                <Image
                  src={logoPreview}
                  alt="Clinic Logo"
                  width={180}
                  height={180}
                  className="object-contain"
                />
              ) : (
                <div className="text-center text-gray-400">
                  <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                  <p className="text-sm">No logo uploaded</p>
                </div>
              )}
            </div>

            {/* Upload Button */}
            <div className="flex-1">
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <div className="flex items-center space-x-2 px-4 py-2 bg-brand-yellow text-white rounded-lg hover:bg-brand-yellow/90 transition-colors cursor-pointer inline-flex">
                  <Upload className="h-5 w-5" />
                  <span>{uploading ? 'Uploading...' : 'Upload Logo'}</span>
                </div>
              </label>
              <p className="text-xs text-gray-500 mt-2">
                Supported: PNG, JPG, SVG • Max size: 2MB • Recommended: 500x500px
              </p>
            </div>
          </div>
        </div>

        {/* Clinic Information */}
        <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-gray-100">
          <h3 className="text-xl font-bold text-brand-teal mb-4 flex items-center">
            <Building2 className="h-5 w-5 mr-2" />
            Clinic Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-brand-teal mb-2">
                Clinic Name *
              </label>
              <input
                type="text"
                name="clinicName"
                value={formData.clinicName}
                onChange={handleChange}
                required
                className="w-full rounded-lg border-2 border-gray-200 px-4 py-2.5 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none"
                placeholder="Faith Clinic"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-brand-teal mb-2">
                Address
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full rounded-lg border-2 border-gray-200 px-4 py-2.5 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none"
                placeholder="123 Medical Street"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-brand-teal mb-2">
                City
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full rounded-lg border-2 border-gray-200 px-4 py-2.5 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none"
                placeholder="Mumbai"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-brand-teal mb-2">
                State
              </label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="w-full rounded-lg border-2 border-gray-200 px-4 py-2.5 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none"
                placeholder="Maharashtra"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-brand-teal mb-2">
                Pincode
              </label>
              <input
                type="text"
                name="pincode"
                value={formData.pincode}
                onChange={handleChange}
                className="w-full rounded-lg border-2 border-gray-200 px-4 py-2.5 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none"
                placeholder="400001"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-brand-teal mb-2 flex items-center">
                <Phone className="h-4 w-4 mr-1" />
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full rounded-lg border-2 border-gray-200 px-4 py-2.5 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none"
                placeholder="+91-9876543210"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-brand-teal mb-2 flex items-center">
                <Mail className="h-4 w-4 mr-1" />
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full rounded-lg border-2 px-4 py-2.5 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none ${fieldErrors.email ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
                placeholder="info@faithclinic.com"
              />
              {fieldErrors.email && <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-brand-teal mb-2">
                Website
              </label>
              <input
                type="text"
                name="website"
                value={formData.website}
                onChange={handleChange}
                className="w-full rounded-lg border-2 border-gray-200 px-4 py-2.5 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none"
                placeholder="www.faithclinic.com"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-brand-teal mb-2 flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                Working Hours
              </label>
              <input
                type="text"
                name="workingHours"
                value={formData.workingHours}
                onChange={handleChange}
                className="w-full rounded-lg border-2 border-gray-200 px-4 py-2.5 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none"
                placeholder="Mon-Sat: 9:00 AM - 8:00 PM | Sun: 10:00 AM - 2:00 PM"
              />
            </div>
          </div>
        </div>

        {/* Doctor Information */}
        <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-gray-100">
          <h3 className="text-xl font-bold text-brand-teal mb-4 flex items-center">
            <User className="h-5 w-5 mr-2" />
            Doctor Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-brand-teal mb-2">
                Doctor Name
              </label>
              <input
                type="text"
                name="doctorName"
                value={formData.doctorName}
                onChange={handleChange}
                className="w-full rounded-lg border-2 border-gray-200 px-4 py-2.5 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none"
                placeholder="Dr. John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-brand-teal mb-2">
                Qualifications
              </label>
              <input
                type="text"
                name="doctorQualification"
                value={formData.doctorQualification}
                onChange={handleChange}
                className="w-full rounded-lg border-2 border-gray-200 px-4 py-2.5 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none"
                placeholder="MBBS, MD"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-brand-teal mb-2">
                Registration Number
              </label>
              <input
                type="text"
                name="registrationNumber"
                value={formData.registrationNumber}
                onChange={handleChange}
                className="w-full rounded-lg border-2 border-gray-200 px-4 py-2.5 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none"
                placeholder="MCI-12345"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-brand-teal mb-2">
                Specialization
              </label>
              <input
                type="text"
                name="specialization"
                value={formData.specialization}
                onChange={handleChange}
                className="w-full rounded-lg border-2 border-gray-200 px-4 py-2.5 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none"
                placeholder="General Physician"
              />
            </div>
          </div>
        </div>

        {/* Invoice and Receipt Settings */}
        <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-gray-100">
          <h3 className="text-xl font-bold text-brand-teal mb-2">Invoice & Receipt Settings</h3>
          <p className="text-sm text-gray-600 mb-4">Customize the text displayed on downloaded invoices and receipts.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-brand-teal mb-2">Invoice Header</label>
              <textarea
                name="invoiceHeader"
                value={formData.invoiceHeader}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-lg border-2 border-gray-200 px-4 py-2.5 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none resize-none"
                placeholder="Optional text below the invoice heading"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-brand-teal mb-2">Invoice Footer</label>
              <textarea
                name="invoiceFooter"
                value={formData.invoiceFooter}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-lg border-2 border-gray-200 px-4 py-2.5 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none resize-none"
                placeholder="Terms, conditions, or thank-you message"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-brand-teal mb-2">Receipt Header</label>
              <textarea
                name="receiptHeader"
                value={formData.receiptHeader}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-lg border-2 border-gray-200 px-4 py-2.5 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none resize-none"
                placeholder="Optional text below the receipt heading"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-brand-teal mb-2">Receipt Footer</label>
              <textarea
                name="receiptFooter"
                value={formData.receiptFooter}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-lg border-2 border-gray-200 px-4 py-2.5 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none resize-none"
                placeholder="Thank-you message or payment terms"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2 px-6 py-3 bg-brand-teal text-white rounded-lg hover:bg-brand-teal/90 transition-colors disabled:opacity-50"
          >
            <Save className="h-5 w-5" />
            <span>{saving ? 'Saving...' : 'Save Profile'}</span>
          </button>
        </div>
      </form>

      {/* Change Password Section */}
      <ChangePasswordSection />
    </div>
  );
}

// Change Password Component
function ChangePasswordSection() {
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type });

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (passwordData.newPassword.length < 6) {
      showToast('New password must be at least 6 characters', 'error');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }

    setChangingPassword(true);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast('Password changed successfully!', 'success');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        showToast(data.error || 'Failed to change password. Check your current password.', 'error');
      }
    } catch (error) {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-gray-100">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <h3 className="text-xl font-bold text-brand-teal mb-4 flex items-center">
        <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Change Password
      </h3>

      <form onSubmit={handlePasswordSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-brand-teal mb-2">
            Current Password *
          </label>
          <input
            type="password"
            name="currentPassword"
            value={passwordData.currentPassword}
            onChange={handlePasswordChange}
            required
            className="w-full rounded-lg border-2 border-gray-200 px-4 py-2.5 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none"
            placeholder="Enter current password"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-brand-teal mb-2">
            New Password *
          </label>
          <input
            type="password"
            name="newPassword"
            value={passwordData.newPassword}
            onChange={handlePasswordChange}
            required
            className="w-full rounded-lg border-2 border-gray-200 px-4 py-2.5 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none"
            placeholder="Enter new password (min 6 characters)"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-brand-teal mb-2">
            Confirm New Password *
          </label>
          <input
            type="password"
            name="confirmPassword"
            value={passwordData.confirmPassword}
            onChange={handlePasswordChange}
            required
            className="w-full rounded-lg border-2 border-gray-200 px-4 py-2.5 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none"
            placeholder="Confirm new password"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={changingPassword}
            className="flex items-center space-x-2 px-6 py-3 bg-brand-yellow text-white rounded-lg hover:bg-brand-yellow/90 transition-colors disabled:opacity-50"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>{changingPassword ? 'Changing...' : 'Change Password'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
