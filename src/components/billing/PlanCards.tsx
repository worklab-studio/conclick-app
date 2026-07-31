'use client';

import { useState } from 'react';
import { Check, Loader2, ShieldCheck } from 'lucide-react';
import { useApi } from '@/components/hooks';

// The two Conclick plans, shared by the trial-over paywall and the billing page.
// Buttons create a Polar checkout session and redirect to the hosted checkout.

const MONTHLY_FEATURES = [
  'Unlimited websites and events',
  'Revenue, funnels, click maps',
  'Email reports and team access',
];
const LIFETIME_FEATURES = [
  'Everything in Monthly, forever',
  'All future features included',
  'Never think about billing again',
];

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="my-3.5 grid gap-1.5">
      {items.map(f => (
        <li key={f} className="flex items-center gap-2 text-[12.5px] text-foreground/80">
          <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
          {f}
        </li>
      ))}
    </ul>
  );
}

export function PlanCards({ compact = false }: { compact?: boolean }) {
  const { post } = useApi();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkout = async (plan: 'monthly' | 'lifetime') => {
    setBusy(plan);
    setError(null);
    try {
      const res = await post('/billing/checkout', { plan });
      if (res?.url) {
        window.location.href = res.url;
        return;
      }
      throw new Error('no url');
    } catch {
      setError('checkout');
      setBusy(null);
    }
  };

  return (
    <div>
      <div className={`grid gap-3.5 text-left ${compact ? '' : 'sm:grid-cols-2'}`}>
        {/* Monthly */}
        <div className="rounded-xl border border-[hsl(0,0%,16%)] bg-[hsl(0,0%,9.5%)] p-5">
          <div className="text-[13px] font-semibold text-muted-foreground">Monthly</div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-3xl font-bold tracking-tight">$9</span>
            <span className="text-[13px] text-muted-foreground/70">per month</span>
          </div>
          <div className="text-xs text-muted-foreground/60">Cancel anytime, keep your data</div>
          <FeatureList items={MONTHLY_FEATURES} />
          <button
            type="button"
            disabled={!!busy}
            onClick={() => checkout('monthly')}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[hsl(0,0%,20%)] py-2.5 text-[13.5px] font-semibold text-foreground transition-colors hover:border-[hsl(0,0%,30%)] disabled:opacity-60"
          >
            {busy === 'monthly' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Continue for $9 a month
          </button>
        </div>

        {/* Lifetime */}
        <div className="relative rounded-xl border border-[#7c79c4]/60 bg-gradient-to-b from-[#5e5ba4]/[.13] to-[#5e5ba4]/[.04] p-5">
          <span className="absolute -top-2.5 right-3.5 rounded-full bg-[#5e5ba4] px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-white">
            BEST VALUE
          </span>
          <div className="text-[13px] font-semibold text-muted-foreground">Lifetime</div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-3xl font-bold tracking-tight">$99</span>
            <span className="text-[13px] text-muted-foreground/70">once</span>
          </div>
          {/* Anchoring the one-time price against the monthly run rate is what
              makes the bigger number feel like the cheaper decision. */}
          <div className="text-xs text-emerald-300/90">
            Pays for itself in 11 months, then free forever
          </div>
          <FeatureList items={LIFETIME_FEATURES} />
          <button
            type="button"
            disabled={!!busy}
            onClick={() => checkout('lifetime')}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#5e5ba4] py-2.5 text-[13.5px] font-semibold text-white shadow-[0_6px_22px_rgba(94,91,164,.4)] transition-colors hover:bg-[#5e5ba4]/90 disabled:opacity-60"
          >
            {busy === 'lifetime' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Own it forever for $99
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-3.5 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3.5 py-2.5 text-center text-xs text-amber-200">
          We could not open checkout just now. Please try again, or email{' '}
          <a
            href="mailto:hello@conclick.io?subject=Checkout%20problem"
            className="font-semibold underline underline-offset-2"
          >
            hello@conclick.io
          </a>{' '}
          and we will sort it out for you.
        </div>
      ) : null}

      <div className="mt-3.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground/60">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="h-3 w-3 text-emerald-400/70" /> Secure checkout by Polar
        </span>
        <span>Instant activation</span>
        <span>Cancel in one click</span>
      </div>
    </div>
  );
}
