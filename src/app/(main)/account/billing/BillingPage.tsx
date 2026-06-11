'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, Clock, Crown, Loader2, AlertTriangle } from 'lucide-react';
import { useApi, useLoginQuery } from '@/components/hooks';
import { getBillingState, TRIAL_DAYS } from '@/lib/billing-state';
import { PlanCards } from '@/components/billing/PlanCards';

const fmt = (d?: Date | null) =>
  d ? d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—';

function Pill({ tone, children }: { tone: 'violet' | 'green' | 'red'; children: React.ReactNode }) {
  const cls =
    tone === 'green'
      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
      : tone === 'red'
        ? 'bg-red-500/10 border-red-500/30 text-red-300'
        : 'bg-[#5e5ba4]/[.13] border-[#5e5ba4]/30 text-[#c7c4f0]';
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold ${cls}`}
    >
      {children}
    </span>
  );
}

export function BillingPage() {
  const { user, refetch } = useLoginQuery();
  const { post } = useApi();
  const params = useSearchParams();
  const [portalBusy, setPortalBusy] = useState(false);
  const [activating, setActivating] = useState(params.get('status') === 'success');
  const polls = useRef(0);

  const billing = getBillingState(user);
  const paid = billing.isLifetime || billing.isActivePaid;

  // Back from Dodo checkout: the webhook lands within seconds — poll the login
  // query until access flips (max ~40s), then the page re-renders as paid.
  useEffect(() => {
    if (!activating) return;
    if (paid) {
      setActivating(false);
      return;
    }
    if (polls.current >= 20) {
      setActivating(false);
      return;
    }
    const t = setTimeout(() => {
      polls.current += 1;
      refetch();
    }, 2000);
    return () => clearTimeout(t);
  }, [activating, paid, user, refetch]);

  const openPortal = async () => {
    setPortalBusy(true);
    try {
      const res = await post('/billing/portal', {});
      if (res?.url) window.open(res.url, '_blank', 'noopener');
    } finally {
      setPortalBusy(false);
    }
  };

  if (!user) return null;

  const trialUsedDays = billing.isTrial ? TRIAL_DAYS - billing.trialDaysLeft : TRIAL_DAYS;

  return (
    <div className="mx-auto w-full max-w-[1000px] px-6 py-8">
      <div className="rounded-2xl border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,8%)] p-6 sm:p-7">
        {/* Header */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">Billing</h2>
          {billing.isLifetime ? (
            <Pill tone="green">
              <Crown className="h-3.5 w-3.5" /> Lifetime — yours forever
            </Pill>
          ) : billing.isActivePaid ? (
            <Pill tone="green">
              <Check className="h-3.5 w-3.5" /> Monthly plan — active
            </Pill>
          ) : billing.inGrace ? (
            <Pill tone="violet">
              <Clock className="h-3.5 w-3.5" /> Access until {fmt(billing.periodEndsAt)}
            </Pill>
          ) : billing.isTrial ? (
            <Pill tone="violet">
              <Clock className="h-3.5 w-3.5" /> Free trial — {billing.trialDaysLeft} of {TRIAL_DAYS}{' '}
              days left
            </Pill>
          ) : (
            <Pill tone="red">
              <AlertTriangle className="h-3.5 w-3.5" /> Trial ended
            </Pill>
          )}
        </div>

        {/* Activating banner (return from checkout) */}
        {activating && !paid ? (
          <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-[#5e5ba4]/30 bg-[#5e5ba4]/10 px-4 py-3 text-sm text-[#c7c4f0]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Payment received — activating your plan… this takes a few seconds.
          </div>
        ) : null}

        {/* Lifetime: nothing else to do */}
        {billing.isLifetime ? (
          <div className="rounded-xl border border-[hsl(0,0%,16%)] px-5 py-5">
            <div className="font-semibold text-foreground">Conclick Lifetime — $99, paid once</div>
            <div className="mt-1 text-[12.5px] text-muted-foreground/70">
              Every current and future feature, forever. No renewals, no invoices, no surprises.
              Thank you for backing Conclick. 💜
            </div>
          </div>
        ) : billing.isActivePaid ? (
          /* Monthly active: manage + upgrade */
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[hsl(0,0%,16%)] px-5 py-4.5">
            <div>
              <div className="font-semibold text-foreground">Conclick Monthly — $9/mo</div>
              <div className="mt-1 text-[12.5px] text-muted-foreground/70">
                Renews {fmt(billing.periodEndsAt)} · card on file with Dodo Payments
              </div>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={openPortal}
                disabled={portalBusy}
                className="flex items-center gap-2 rounded-lg border border-[hsl(0,0%,20%)] px-4 py-2.5 text-[13px] font-semibold text-foreground transition-colors hover:border-[hsl(0,0%,30%)] disabled:opacity-60"
              >
                {portalBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Manage subscription
              </button>
              <UpgradeToLifetime />
            </div>
          </div>
        ) : (
          /* Trial (running or ended) and grace: show the plans */
          <>
            {billing.isTrial ? (
              <div className="mb-6">
                <div className="h-1.5 overflow-hidden rounded bg-[hsl(0,0%,13%)]">
                  <div
                    className="h-full rounded bg-gradient-to-r from-[#5e5ba4] to-[#7c79c4]"
                    style={{ width: `${Math.min(100, (trialUsedDays / TRIAL_DAYS) * 100)}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[11.5px] text-muted-foreground/60">
                  <span>No credit card needed during the trial</span>
                  <span>Ends {fmt(billing.trialEndsAt)}</span>
                </div>
              </div>
            ) : null}
            <PlanCards />
          </>
        )}
      </div>
    </div>
  );
}

function UpgradeToLifetime() {
  const { post } = useApi();
  const [busy, setBusy] = useState(false);

  const go = async () => {
    setBusy(true);
    try {
      const res = await post('/billing/checkout', { plan: 'lifetime' });
      if (res?.url) {
        window.location.href = res.url;
        return;
      }
    } catch {
      /* surfaced by staying on page */
    }
    setBusy(false);
  };

  return (
    <button
      type="button"
      onClick={go}
      disabled={busy}
      className="flex items-center gap-2 rounded-lg bg-[#5e5ba4] px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#5e5ba4]/90 disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crown className="h-3.5 w-3.5" />}
      Upgrade to lifetime — $99
    </button>
  );
}
