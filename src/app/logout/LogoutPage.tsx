'use client';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authClient } from '@/lib/auth-client';
import { setUser } from '@/store/app';

export function LogoutPage() {
  const queryClient = useQueryClient();

  useEffect(() => {
    setUser(null);
    // Drop every cached query — with a 30-minute gcTime, a different account
    // signing in on this tab must never be served the previous user's data.
    queryClient.clear();
    // Clear the session and bounce to the sign-in page.
    authClient.signOut().finally(() => {
      window.location.href = `${process.env.basePath || ''}/login`;
    });
  }, [queryClient]);

  return null;
}
