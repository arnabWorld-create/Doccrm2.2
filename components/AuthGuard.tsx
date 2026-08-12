'use client';

import { useAuth } from '@/lib/auth-context';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { loading, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const publicPaths = ['/auth/', '/'];
  const isPublicPath = publicPaths.some(path => pathname === path || pathname.startsWith(path));

  useEffect(() => {
    if (!isPublicPath && !loading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isPublicPath, loading, isAuthenticated, router]);

  // Public pages — always render
  if (isPublicPath) return <>{children}</>;

  // CRITICAL: Always render children immediately so:
  // 1. The sidebar stays in the DOM → Next.js Link prefetching works
  // 2. loading.tsx skeletons show instantly on navigation
  // 3. The layout shell never unmounts between page navigations
  //
  // If not authenticated, the useEffect above redirects to login.
  // sessionStorage cache in auth-context means loading=false instantly
  // for returning users, so there is no flash of protected content.
  return <>{children}</>;
}
