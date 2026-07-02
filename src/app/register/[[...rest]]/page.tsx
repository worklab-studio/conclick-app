import { Metadata } from 'next';
import { SignUp } from '@clerk/nextjs';
import { AuthShell, cleanDomain } from '@/components/auth/AuthShell';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ site?: string | string[] }>;
}) {
  const { site } = await searchParams;
  return (
    <AuthShell domain={cleanDomain(site)}>
      <SignUp />
    </AuthShell>
  );
}

export const metadata: Metadata = {
  title: 'Sign up',
};
