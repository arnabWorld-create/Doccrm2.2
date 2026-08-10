'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  Stethoscope, Mail, Lock, AlertCircle, Eye, EyeOff,
  ArrowRight, Users, CalendarCheck, TrendingUp, Shield,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      router.push('/patients');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/patients');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setLoading(false);
    }
  };

  const features = [
    { icon: Users,         label: 'Patient Records',     desc: 'Complete patient history at a glance' },
    { icon: CalendarCheck, label: 'Appointments',         desc: 'Manage daily schedules effortlessly' },
    { icon: TrendingUp,    label: 'Analytics',            desc: 'Insights to grow your practice' },
    { icon: Shield,        label: 'Secure & Private',     desc: 'Encrypted data, always protected' },
  ];

  return (
    <div className="min-h-screen flex">

      {/* ── Left Panel ── */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative flex-col justify-between p-12 overflow-hidden bg-gradient-to-br from-[#005f5a] via-[#007c74] to-[#009d93]">

        {/* decorative blobs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-black/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl pointer-events-none" />

        {/* top — logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-white/15 backdrop-blur-sm p-3 rounded-2xl border border-white/20">
              <Stethoscope className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">Faith Clinic</h1>
              <p className="text-teal-200 text-xs font-medium">Patient Management System</p>
            </div>
          </div>
        </div>

        {/* center — headline + features */}
        <div className="relative z-10 space-y-10">
          <div>
            <h2 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight mb-4">
              Smarter Care,<br />
              <span className="text-teal-200">Better Outcomes</span>
            </h2>
            <p className="text-teal-100 text-lg leading-relaxed max-w-md">
              Everything your clinic needs — patient records, appointments,
              prescriptions and analytics — all in one place.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 max-w-md">
            {features.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center gap-4 bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl px-5 py-4 hover:bg-white/15 transition-colors">
                <div className="bg-white/20 p-2.5 rounded-xl flex-shrink-0">
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{label}</p>
                  <p className="text-teal-200 text-xs">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* bottom — doctor quote */}
        <div className="relative z-10">
          <blockquote className="border-l-2 border-teal-300 pl-4">
            <p className="text-teal-100 italic text-sm leading-relaxed">
              "Treat patients with humanity alongside providing the best medical care possible."
            </p>
            <footer className="mt-2 text-teal-300 text-xs font-semibold">
              — Dr. Aishwarya Radia, Faith Clinic
            </footer>
          </blockquote>
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div className="w-full lg:w-1/2 xl:w-2/5 flex flex-col min-h-screen bg-gray-50">

        {/* mobile logo */}
        <div className="lg:hidden flex items-center justify-center gap-3 pt-10 pb-6 bg-gradient-to-br from-[#007c74] to-[#009d93]">
          <div className="bg-white/20 p-2.5 rounded-xl">
            <Stethoscope className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white">Faith Clinic</h1>
            <p className="text-teal-200 text-xs">Patient Management System</p>
          </div>
        </div>

        {/* form area */}
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm">

            {/* heading */}
            <div className="mb-8">
              <h2 className="text-3xl font-extrabold text-gray-900 mb-1">Welcome back</h2>
              <p className="text-gray-500 text-sm">Sign in to access your dashboard</p>
            </div>

            {/* error */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            )}

            {/* form */}
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-[#007c74] transition-colors" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@faithclinic.com"
                    autoComplete="email"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#007c74] focus:ring-4 focus:ring-[#007c74]/10 transition-all placeholder:text-gray-400"
                  />
                </div>
              </div>

              {/* password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-[#007c74] transition-colors" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    className="w-full pl-11 pr-12 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#007c74] focus:ring-4 focus:ring-[#007c74]/10 transition-all placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#007c74] transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 flex items-center justify-center gap-2 bg-[#007c74] hover:bg-[#005f5a] active:scale-[0.98] text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-[#007c74]/30 hover:shadow-[#007c74]/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#007c74] disabled:active:scale-100"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* secure note */}
            <div className="mt-8 flex items-center justify-center gap-2 text-gray-400 text-xs">
              <Lock className="h-3.5 w-3.5" />
              <span>Secure login with encrypted credentials</span>
            </div>
          </div>
        </div>

        {/* footer */}
        <div className="px-6 pb-6 text-center">
          <p className="text-gray-400 text-xs">
            © {new Date().getFullYear()} Faith Clinic. All rights reserved.
          </p>
        </div>
      </div>

    </div>
  );
}
