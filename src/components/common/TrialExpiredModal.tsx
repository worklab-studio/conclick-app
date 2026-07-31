'use client';

import { useEffect } from 'react';
import { Zap, Lock, Database } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useApi, useLoginQuery } from '@/components/hooks';
import { getBillingState } from '@/lib/billing-state';
import { PlanCards } from '@/components/billing/PlanCards';

/**
 * Hard paywall: covers the entire app behind a blurred backdrop once access
 * lapses (trial over, subscription expired or refunded). Deliberately NOT
 * dismissable: no close button, no outside-click, no Esc. Payment happens right
 * here; the webhook unlocks the app the moment the gateway confirms. The only
 * way out is paying or signing out.
 *
 * Conversion note: this is the single highest-intent moment in the lifecycle,
 * and the strongest lever at it is concrete loss. So instead of a generic
 * reassurance we name what is actually sitting in the account (sites, visitors,
 * days of history) and promise it back intact the second they pay.
 */
export function TrialExpiredModal() {
  const { user } = useLoginQuery();
  const { get, useQuery } = useApi();
  const router = useRouter();
  const pathname = usePathname();

  const billing = getBillingState(user);
  const blocked = !!user && !billing.hasAccess;
  // The billing page stays reachable (success-return + portal links live there).
  const show = blocked && pathname !== '/account/billing';

  // What the customer has riding on this decision. Never blocks the paywall:
  // if it fails or is empty we simply fall back to the generic line.
  const { data: summary } = useQuery<{
    websites: number | null;
    visitors: number | null;
    days: number | null;
  }>({
    queryKey: ['billing-summary'],
    queryFn: () => get('/billing/summary'),
    enabled: show,
    staleTime: 300_000,
    retry: false,
  });

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

  const nf = new Intl.NumberFormat('en');
  const stats = [
    summary?.websites
      ? `${nf.format(summary.websites)} site${summary.websites === 1 ? '' : 's'}`
      : null,
    summary?.visitors
      ? `${nf.format(summary.visitors)} visitor${summary.visitors === 1 ? '' : 's'} tracked`
      : null,
    summary?.days ? `${nf.format(summary.days)} days of history` : null,
  ].filter(Boolean) as string[];

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
        <p className="mx-auto mb-5 mt-2 max-w-[450px] text-sm leading-relaxed text-muted-foreground">
          Pick a plan to unlock your dashboard again.{' '}
          <span className="font-semibold text-[#d8d6f3]">Your tracking never stopped</span>, so
          everything will be exactly where you left it.
        </p>

        {stats.length > 0 ? (
          <div className="mx-auto mb-6 flex max-w-[450px] items-center justify-center gap-3 rounded-xl border border-[hsl(0,0%,14%)] bg-[hsl(0,0%,9%)] px-4 py-3">
            <Database className="h-4 w-4 shrink-0 text-[#8b88cf]" />
            <div className="text-left text-[12.5px] leading-snug text-muted-foreground">
              <span className="font-semibold text-foreground">Waiting for you: </span>
              {stats.join(' · ')}
            </div>
          </div>
        ) : null}

        <PlanCards />

        <div className="mt-6 flex items-center justify-between border-t border-[hsl(0,0%,12%)] pt-4 text-[11.5px] text-muted-foreground/60">
          <span className="inline-flex items-center gap-1.5">
            <Lock className="h-3 w-3" />
            Nothing is deleted while you decide
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
