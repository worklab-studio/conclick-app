'use client';
import { useEffect } from 'react';
import { useClerk } from '@clerk/nextjs';
import { setUser } from '@/store/app';

export function LogoutPage() {
  const { signOut } = useClerk();

  useEffect(() => {
    setUser(null);
    // Clear the Clerk session and bounce to the sign-in page.
    signOut({ redirectUrl: `${process.env.basePath || ''}/login` });
  }, [signOut]);

  return null;
}
