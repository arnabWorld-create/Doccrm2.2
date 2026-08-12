'use client';

import { useAuth } from '@/lib/auth-context';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { loading, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Public pages that don't require authentication
  const publicPaths = ['/auth/', '/'];
  const isPublicPath = publicPaths.some(path => pathname === path || pathname.startsWith(path));

  useEffect(() => {
    if (!isPublicPath && !loading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isPublicPath, loading, isAuthenticated, router]);

  // Public pages — always render immediately
  if (isPublicPath) {
    return <>{children}</>;
  }

  // While the /api/auth/me request is in flight, show a lightweight bar
  // instead of blocking the entire page with a spinner.
  // Once auth resolves, content renders immediately with no extra round-trip.
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Thin progress bar at top — much less jarring than a full-screen spinner */}
        <div className="fixed top-0 left-0 right-0 h-0.5 bg-brand-teal/20 z-50">
          <div className="h-full bg-brand-teal animate-pulse w-1/3" />
        </div>
      </div>
    );
  }

  // Not authenticated — redirect is in progress, show nothing
  if (!isAuthenticated) {
    return null;
  }

  // User is authenticated, show content
  return <>{children}</>;
}
