'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useModified, useUserWebsitesQuery, useLoginQuery } from '@/components/hooks';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { OnboardingFlow } from '@/app/onboarding/OnboardingFlow';

/**
 * Hosts the setup wizard as a dialog over the websites page.
 *
 * Mounted once at the page level and driven entirely by the `setup` query
 * param, so every entry point opens the same wizard:
 *   ?setup=1            start fresh
 *   ?setup=<websiteId>  resume the install step for a site already created
 *
 * That param is also what makes an abandoned run recoverable: closing the
 * dialog just clears it, and the card left behind can link straight back in.
 */
export function OnboardingModal() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.conclick.io';
  const router = useRouter();
  const params = useSearchParams();
  const { touch } = useModified();
  const { user } = useLoginQuery();

  const setup = params.get('setup');
  const open = !!setup;
  const resumeId = setup && setup !== '1' ? setup : null;

  const [step, setStep] = useState<'domain' | 'analysis' | 'install' | 'done'>('domain');

  // Any site created during this run, so the list behind the modal is
  // refreshed even when the wizard is abandoned rather than completed. This
  // was the bug: closing mid-setup left the new card invisible until a hard
  // reload.
  const createdRef = useRef<string | null>(null);

  const { data: websites } = useUserWebsitesQuery(
    { userId: user?.id },
    { pageSize: 100 },
    { enabled: !!resumeId && !!user?.id },
  );
  const resumeWebsite = resumeId
    ? (websites?.data || []).find((w: any) => w.id === resumeId) || null
    : null;

  const close = useCallback(() => {
    const next = new URLSearchParams(Array.from(params.entries()));
    next.delete('setup');
    next.delete('site');
    const qs = next.toString();
    router.replace(qs ? `/websites?${qs}` : '/websites', { scroll: false });
  }, [params, router]);

  // Refresh the list whenever the dialog closes after a site was created.
  useEffect(() => {
    if (!open && createdRef.current) {
      touch('websites');
      createdRef.current = null;
    }
  }, [open, touch]);

  const handleFinished = (websiteId: string | null) => {
    touch('websites');
    createdRef.current = null;
    close();
    if (websiteId) {
      router.push(`/websites/${websiteId}`);
    }
  };

  // Wait for the website record before rendering a resume, otherwise the flow
  // mounts with no domain and starts from scratch.
  if (open && resumeId && !resumeWebsite) return null;

  const width =
    step === 'analysis'
      ? 'sm:max-w-[920px]'
      : step === 'install'
        ? 'sm:max-w-[680px]'
        : 'sm:max-w-[520px]';

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (!next) {
          setStep('domain');
          close();
        }
      }}
    >
      <DialogContent
        // focus:outline-none: the dialog itself takes focus on open, and its
        // default ring drew a bright blue border around the whole panel that
        // read as an error state.
        className={`max-h-[92vh] w-[calc(100vw-2rem)] max-w-none overflow-y-auto border-white/[0.08] bg-[hsl(0,0%,6.5%)] p-5 transition-[max-width] duration-300 ease-out focus:outline-none sm:p-6 ${width}`}
        // The wizard owns focus: send it to the domain field rather than the
        // close button, since typing a domain is the only thing to do here.
        onOpenAutoFocus={e => {
          e.preventDefault();
          requestAnimationFrame(() => {
            document.querySelector<HTMLInputElement>('#site-domain')?.focus();
          });
        }}
      >
        <DialogTitle className="sr-only">Set up your website</DialogTitle>
        <OnboardingFlow
          key={resumeId || 'new'}
          appUrl={appUrl}
          initialDomain={params.get('site') || undefined}
          resumeWebsite={
            resumeWebsite ? { id: resumeWebsite.id, domain: resumeWebsite.domain } : null
          }
          onFinished={handleFinished}
          onStepChange={setStep}
          onWebsiteCreated={id => {
            createdRef.current = id;
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
