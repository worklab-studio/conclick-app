import { Metadata } from 'next';
import { AuthShell, cleanDomain } from '@/components/auth/AuthShell';
import { AuthForm } from '@/components/auth/AuthForm';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ site?: string | string[] }>;
}) {
  const { site } = await searchParams;
  return (
    <AuthShell domain={cleanDomain(site)} variant="register">
      <AuthForm
        googleEnabled={!!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET}
        mode="register"
      />
    </AuthShell>
  );
}

export const metadata: Metadata = {
  title: 'Create your account',
};
