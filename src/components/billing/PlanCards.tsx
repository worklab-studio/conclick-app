'use client';

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { useApi } from '@/components/hooks';

// The two Conclick plans — shared by the trial-over paywall and the billing page.
// Buttons create a Dodo checkout session and redirect to the hosted checkout.

const MONTHLY_FEATURES = [
  'Unlimited websites & events',
  'Revenue, funnels, click maps',
  'Email reports & team access',
];
const LIFETIME_FEATURES = [
  'Everything in Monthly',
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
      setError('Could not start checkout — please try again.');
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
            <span className="text-[13px] text-muted-foreground/70">/ month</span>
          </div>
          <div className="text-xs text-muted-foreground/60">Cancel anytime</div>
          <FeatureList items={MONTHLY_FEATURES} />
          <button
            type="button"
            disabled={!!busy}
            onClick={() => checkout('monthly')}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[hsl(0,0%,20%)] py-2.5 text-[13.5px] font-semibold text-foreground transition-colors hover:border-[hsl(0,0%,30%)] disabled:opacity-60"
          >
            {busy === 'monthly' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Subscribe — $9/mo
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
          <div className="text-xs text-muted-foreground/60">Pay once, own it forever</div>
          <FeatureList items={LIFETIME_FEATURES} />
          <button
            type="button"
            disabled={!!busy}
            onClick={() => checkout('lifetime')}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#5e5ba4] py-2.5 text-[13.5px] font-semibold text-white shadow-[0_6px_22px_rgba(94,91,164,.4)] transition-colors hover:bg-[#5e5ba4]/90 disabled:opacity-60"
          >
            {busy === 'lifetime' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Get lifetime — $99
          </button>
        </div>
      </div>
      {error ? <div className="mt-3 text-center text-xs text-red-400">{error}</div> : null}
    </div>
  );
}
