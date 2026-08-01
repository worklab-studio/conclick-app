'use client';

import { useRouter } from 'next/navigation';
import { useModified } from '@/components/hooks';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { OnboardingFlow } from '@/app/onboarding/OnboardingFlow';

/**
 * Hosts the setup wizard as a dialog over the websites page.
 *
 * It used to be its own route, which threw people onto a blank page and made
 * a two minute task feel like leaving the product. In a modal the app stays
 * visible behind it, closing is obvious, and finishing drops them straight
 * onto the dashboard they just created.
 */
export function OnboardingModal({
  open,
  onOpenChange,
  appUrl,
  initialDomain,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appUrl: string;
  initialDomain?: string;
}) {
  const router = useRouter();
  const { touch } = useModified();

  const handleFinished = (websiteId: string | null) => {
    onOpenChange(false);
    // Refresh the list behind the modal so the new site is there either way.
    touch('websites');
    if (websiteId) {
      router.push(`/websites/${websiteId}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        // focus:outline-none: the dialog itself takes focus on open, and its
        // default ring drew a bright blue border around the whole panel that
        // read as an error state.
        className="max-h-[92vh] w-[calc(100vw-2rem)] max-w-[940px] overflow-y-auto border-white/[0.08] bg-[hsl(0,0%,6.5%)] p-5 focus:outline-none sm:p-6"
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
        <OnboardingFlow appUrl={appUrl} initialDomain={initialDomain} onFinished={handleFinished} />
      </DialogContent>
    </Dialog>
  );
}
