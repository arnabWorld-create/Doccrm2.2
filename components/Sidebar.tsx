'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Stethoscope,
  Users,
  Activity,
  Calendar,
  Settings,
  CalendarCheck,
  LogOut,
  CreditCard,
  ChevronRight,
  Menu,
  X,
  Building2,
  Upload,
  Download,
  DollarSign,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  children?: { label: string; href: string; icon: React.ReactNode }[];
}

const navItems: NavItem[] = [
  {
    label: 'Patients',
    href: '/patients',
    icon: <Users className="h-5 w-5" />,
  },
  {
    label: 'Appointments',
    href: '/appointments',
    icon: <CalendarCheck className="h-5 w-5" />,
  },
  {
    label: 'Calendar',
    href: '/calendar',
    icon: <Calendar className="h-5 w-5" />,
  },
  {
    label: 'Analytics',
    href: '/analytics',
    icon: <Activity className="h-5 w-5" />,
  },
  {
    label: 'FinX',
    href: '/payments',
    icon: <CreditCard className="h-5 w-5" />,
  },
  {
    label: 'Settings',
    href: '/settings/profile',
    icon: <Settings className="h-5 w-5" />,
    children: [
      { label: 'Clinic Profile', href: '/settings/profile', icon: <Building2 className="h-4 w-4" /> },
      { label: 'Fee Management', href: '/settings/fees', icon: <DollarSign className="h-4 w-4" /> },
      { label: 'Import Data', href: '/settings/import', icon: <Upload className="h-4 w-4" /> },
      { label: 'Export Data', href: '/settings/export', icon: <Download className="h-4 w-4" /> },
    ],
  },
];

// Collapsed sidebar width
const SIDEBAR_COLLAPSED = 'w-16';
const SIDEBAR_EXPANDED = 'w-60';

export function Sidebar() {
  const { user, logout, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [doctorName, setDoctorName] = useState('');

  // Sync collapsed state to a data attribute on <body> so CSS can offset main content
  useEffect(() => {
    document.body.setAttribute('data-sidebar', collapsed ? 'collapsed' : 'expanded');
  }, [collapsed]);

  // Auto-open settings section if on a settings page
  useEffect(() => {
    if (pathname.startsWith('/settings')) {
      setSettingsOpen(true);
    }
  }, [pathname]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Fetch doctor name — cached in sessionStorage to avoid a DB hit on every navigation
  useEffect(() => {
    if (!isAuthenticated) return;

    const CACHE_KEY = 'clinic_profile_cache';
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const p = JSON.parse(cached);
        setDoctorName(p?.doctorName || user?.name || 'Doctor');
        return;
      } catch {
        sessionStorage.removeItem(CACHE_KEY);
      }
    }

    fetch('/api/clinic-profile')
      .then((r) => r.ok ? r.json() : null)
      .then((p) => {
        if (p) {
          try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(p)); } catch {}
        }
        if (p?.doctorName) setDoctorName(p.doctorName);
        else setDoctorName(user?.name || 'Doctor');
      })
      .catch(() => setDoctorName(user?.name || 'Doctor'));
  }, [isAuthenticated, user]);

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  const isActive = (href: string) => {
    if (href === '/settings/profile') {
      return pathname.startsWith('/settings');
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  const settingsActive = pathname.startsWith('/settings');

  // ── Shared nav link renderer ──────────────────────────────────────────────
  function NavLink({
    item,
    mobile = false,
  }: {
    item: NavItem;
    mobile?: boolean;
  }) {
    const active = isActive(item.href);
    const hasChildren = !!item.children?.length;

    if (hasChildren) {
      return (
        <>
          <button
            onClick={() => setSettingsOpen((o) => !o)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
              settingsActive
                ? 'bg-brand-teal text-white'
                : 'text-gray-600 hover:bg-brand-teal/8 hover:text-brand-teal',
              collapsed && !mobile && 'justify-center px-0'
            )}
          >
            <span className={cn('flex-shrink-0', settingsActive ? 'text-white' : 'text-gray-500 group-hover:text-brand-teal')}>
              {item.icon}
            </span>
            {(!collapsed || mobile) && (
              <>
                <span className="flex-1 text-left">{item.label}</span>
                <ChevronRight
                  className={cn(
                    'h-4 w-4 transition-transform flex-shrink-0',
                    settingsOpen && 'rotate-90'
                  )}
                />
              </>
            )}
          </button>

          {/* Sub-items */}
          {settingsOpen && (!collapsed || mobile) && (
            <div className="ml-3 pl-3 border-l-2 border-brand-teal/20 space-y-1 mt-1">
              {item.children!.map((child) => {
                const childActive = pathname === child.href;
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                      childActive
                        ? 'bg-brand-teal/10 text-brand-teal'
                        : 'text-gray-500 hover:text-brand-teal hover:bg-brand-teal/5'
                    )}
                  >
                    {child.icon}
                    {child.label}
                  </Link>
                );
              })}
            </div>
          )}
        </>
      );
    }

    return (
      <Link
        href={item.href}
        title={collapsed && !mobile ? item.label : undefined}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
          active
            ? 'bg-brand-teal text-white shadow-sm'
            : 'text-gray-600 hover:bg-brand-teal/8 hover:text-brand-teal',
          collapsed && !mobile && 'justify-center px-0'
        )}
      >
        <span className={cn('flex-shrink-0', active ? 'text-white' : 'text-gray-400')}>
          {item.icon}
        </span>
        {(!collapsed || mobile) && <span>{item.label}</span>}
      </Link>
    );
  }

  // ── Sidebar inner content ─────────────────────────────────────────────────
  function SidebarContent({ mobile = false }: { mobile?: boolean }) {
    return (
      <div className="flex flex-col h-full">
        {/* Logo / Brand */}
        <div
          className={cn(
            'flex items-center gap-2.5 px-4 py-4 border-b border-gray-100',
            collapsed && !mobile && 'flex-col justify-center items-center px-2 py-3 gap-2'
          )}
        >
          <div className="bg-brand-red p-1.5 rounded-lg flex-shrink-0">
            <Stethoscope className="h-5 w-5 text-white" />
          </div>
          {(!collapsed || mobile) && (
            <span className="text-xl font-extrabold text-brand-teal tracking-tight">Faith Clinic</span>
          )}
          {!mobile && (
            <button
              onClick={() => setCollapsed((c) => !c)}
              className={cn(
                'ml-auto p-1 rounded-md text-gray-400 hover:text-brand-teal hover:bg-brand-teal/8 transition-all',
                collapsed && 'ml-0'
              )}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <Menu className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} mobile={mobile} />
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-gray-100 p-2">
          {(!collapsed || mobile) ? (
            <div className="px-2 py-2 mb-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-brand-teal rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {doctorName?.charAt(0).toUpperCase() || 'D'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{doctorName || 'Doctor'}</p>
                  <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center mb-1">
              <div className="w-8 h-8 bg-brand-teal rounded-full flex items-center justify-center text-white font-bold text-sm">
                {doctorName?.charAt(0).toUpperCase() || 'D'}
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            title={collapsed && !mobile ? 'Logout' : undefined}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-600 transition-all',
              collapsed && !mobile && 'justify-center px-0'
            )}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {(!collapsed || mobile) && <span>Logout</span>}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── Desktop sidebar ──────────────────────────────────────────────── */}
      <aside
        className={cn(
          'hidden md:flex flex-col fixed left-0 top-0 h-screen bg-white border-r border-gray-100 shadow-sm z-30 transition-all duration-300',
          collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED
        )}
      >
        <SidebarContent />
      </aside>

      {/* ── Mobile top bar ───────────────────────────────────────────────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-100 shadow-sm h-14 flex items-center px-4">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg text-brand-teal hover:bg-brand-teal/10 transition"
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className="flex items-center gap-2 ml-3">
          <div className="bg-brand-red p-1 rounded-md">
            <Stethoscope className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-extrabold text-brand-teal">Faith Clinic</span>
        </div>
      </div>

      {/* ── Mobile drawer overlay ────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile drawer ────────────────────────────────────────────────── */}
      <aside
        className={cn(
          'md:hidden fixed left-0 top-0 h-screen w-72 bg-white z-50 shadow-2xl transform transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="absolute top-3 right-3">
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <SidebarContent mobile />
      </aside>
    </>
  );
}
