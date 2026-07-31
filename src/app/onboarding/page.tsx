import { Metadata } from 'next';
import { Suspense } from 'react';
import { OnboardingFlow } from './OnboardingFlow';

export default function Page() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.conclick.io';
  return (
    <Suspense>
      <OnboardingFlow appUrl={appUrl} />
    </Suspense>
  );
}

export const metadata: Metadata = {
  title: 'Set up your website',
};
