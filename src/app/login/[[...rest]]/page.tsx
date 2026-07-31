import { Metadata } from 'next';
import { AuthShell, cleanDomain } from '@/components/auth/AuthShell';
import { AuthForm } from '@/components/auth/AuthForm';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ site?: string | string[]; next?: string }>;
}) {
  const { site, next } = await searchParams;
  return (
    <AuthShell domain={cleanDomain(site)} variant="login">
      <AuthForm
        googleEnabled={!!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET}
        mode="login"
        next={typeof next === 'string' ? next : undefined}
      />
    </AuthShell>
  );
}

export const metadata: Metadata = {
  title: 'Sign in',
};
