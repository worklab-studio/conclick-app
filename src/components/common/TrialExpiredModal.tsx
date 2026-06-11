'use client';

import { useEffect } from 'react';
import { Zap, Lock } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useLoginQuery } from '@/components/hooks';
import { getBillingState } from '@/lib/billing-state';
import { PlanCards } from '@/components/billing/PlanCards';

/**
 * Hard paywall — covers the entire app behind a blurred backdrop once access
 * lapses (trial over, subscription expired/refunded). Deliberately NOT
 * dismissable: no close button, no outside-click, no Esc. Payment happens right
 * here; the webhook unlocks the app the moment Dodo confirms. The only way out
 * is paying or signing out.
 */
export function TrialExpiredModal() {
  const { user } = useLoginQuery();
  const router = useRouter();
  const pathname = usePathname();

  const billing = getBillingState(user);
  const blocked = !!user && !billing.hasAccess;
  // The billing page stays reachable (success-return + portal links live there).
  const show = blocked && pathname !== '/account/billing';

  useEffect(() => {
    if (!show) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [show]);

  if (!show) return null;

  const wasTrial = billing.trialExpired || billing.plan === 'trial';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={wasTrial ? 'Your free trial has ended' : 'Your subscription has ended'}
    >
      <div className="w-full max-w-[660px] rounded-[20px] border border-[hsl(0,0%,15%)] bg-[hsl(0,0%,7.5%)] px-7 py-9 text-center shadow-[0_30px_90px_rgba(0,0,0,.65),0_0_0_1px_rgba(94,91,164,.12)] sm:px-9">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-[13px] bg-gradient-to-br from-[#5e5ba4] to-[#7c79c4] shadow-[0_8px_30px_rgba(94,91,164,.45)]">
          {wasTrial ? (
            <Zap className="h-5 w-5 text-white" />
          ) : (
            <Lock className="h-5 w-5 text-white" />
          )}
        </div>

        <h1 className="text-[22px] font-bold tracking-tight text-foreground">
          {wasTrial ? 'Your free trial has ended' : 'Your subscription has ended'}
        </h1>
        <p className="mx-auto mb-6 mt-2 max-w-[440px] text-sm leading-relaxed text-muted-foreground">
          Pick a plan to keep your analytics flowing.{' '}
          <span className="font-semibold text-[#d8d6f3]">Your data never stopped collecting</span> —
          everything will be right where you left it.
        </p>

        <PlanCards />

        <div className="mt-6 flex items-center justify-between border-t border-[hsl(0,0%,12%)] pt-4 text-[11.5px] text-muted-foreground/60">
          <span className="inline-flex items-center gap-1.5">
            <Lock className="h-3 w-3" />
            Secure checkout by Dodo Payments · instant activation
          </span>
          <button
            type="button"
            onClick={() => router.push('/logout')}
            className="underline underline-offset-2 transition-colors hover:text-foreground"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
