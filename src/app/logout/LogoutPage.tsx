'use client';
import { useEffect } from 'react';
import { useClerk } from '@clerk/nextjs';
import { useQueryClient } from '@tanstack/react-query';
import { setUser } from '@/store/app';

export function LogoutPage() {
  const { signOut } = useClerk();
  const queryClient = useQueryClient();

  useEffect(() => {
    setUser(null);
    // Drop every cached query — with a 30-minute gcTime, a different account
    // signing in on this tab must never be served the previous user's data.
    queryClient.clear();
    // Clear the Clerk session and bounce to the sign-in page.
    signOut({ redirectUrl: `${process.env.basePath || ''}/login` });
  }, [signOut, queryClient]);

  return null;
}
