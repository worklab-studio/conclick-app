'use client';

import { useLoginQuery } from '@/components/hooks';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Crown, ExternalLink, Clock, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { toast } from 'sonner';

const PLANS = {
  monthly: {
    name: 'Pro Monthly',
    price: '$9',
    priceDetail: '/ month',
    features: [
      'Unlimited websites',
      'Unlimited tracking',
      'Real-time analytics',
      'Custom events',
      'API access',
    ],
    trialText: '30-day free trial',
    subPrice: undefined,
  },
  annual: {
    name: 'Pro Yearly',
    price: '$7',
    priceDetail: '/ month - Billed Yearly',
    subPrice: undefined,
    features: [
      'Unlimited websites',
      'Unlimited tracking',
      'Real-time analytics',
      'Custom events',
      'API access',
    ],
    trialText: '30-day free trial',
  },
  lifetime: {
    name: 'Lifetime',
    price: '$99',
    priceDetail: 'one-time',
    features: [
      'Pay once, use forever',
      'Unlimited websites',
      'Unlimited tracking',
      'Lifetime updates',
      'VIP Support',
    ],
  },
};

export function BillingPage() {
  const { user, refetch } = useLoginQuery();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [isAnnual, setIsAnnual] = useState(false);

  // --- State Logic ---
  const now = new Date();
  const trialEndsAt = user?.trialEndsAt ? new Date(user.trialEndsAt) : null;
  const subEndsAt = user?.subscriptionEndsAt ? new Date(user.subscriptionEndsAt) : null;
  const periodEndsAt = user?.currentPeriodEndsAt ? new Date(user.currentPeriodEndsAt) : null;
  const effectiveEndsAt = periodEndsAt && periodEndsAt > now ? periodEndsAt : subEndsAt;

  const isLifetime = user?.subscriptionPlan === 'lifetime' || user?.lemonOrderId;
  const isPaid =
    (user?.subscriptionStatus === 'active' || (effectiveEndsAt && effectiveEndsAt > now)) &&
    !isLifetime;
  const hasPaidAccess = isPaid || isLifetime;

  const isTrial =
    !hasPaidAccess && (user?.subscriptionStatus === 'trial' || (trialEndsAt && trialEndsAt > now));
  const isTrialExpired = !hasPaidAccess && trialEndsAt && trialEndsAt < now;
  const isNewUser = !hasPaidAccess && !isTrial && !isTrialExpired && !user?.trialStartedAt;

  // Days remaining
  const trialDaysRemaining =
    trialEndsAt && trialEndsAt > now
      ? Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

  // Percentage for progress bar (assuming 30 days total)

  // --- Handlers ---
  const handleStartTrial = async () => {
    setIsLoading('trial');
    try {
      const res = await fetch('/api/billing/start-trial', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to start trial');
      }
      toast.success('Your 14-day free trial has started!');
      await refetch();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(null);
    }
  };

  const handleUpgrade = async (plan: 'monthly' | 'annual' | 'lifetime') => {
    setIsLoading(plan);
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });

      if (!response.ok) throw new Error('Failed to create checkout');

      const { url } = await response.json();
      window.location.href = url;
    } catch {
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setIsLoading(null);
    }
  };

  const handleManage = async () => {
    setIsLoading('manage');
    try {
      const response = await fetch('/api/billing/portal', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to get portal URL');
      const { url } = await response.json();
      window.open(url, '_blank');
    } catch {
      toast.error('Failed to open billing settings');
    } finally {
      setIsLoading(null);
    }
  };

  // --- Components ---
  const TrialProgressBar = () => {
    if (!isTrial) return null;

    return (
      <div className="relative w-full mb-8 overflow-hidden rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-6 md:p-8">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent mix-blend-overlay" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              <Zap className="h-6 w-6 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-white">Pro Trial Active</h3>
                <span className="inline-flex items-center rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs font-medium text-indigo-300 ring-1 ring-inset ring-indigo-500/30">
                  Full Access
                </span>
              </div>
              <p className="text-sm text-zinc-400 max-w-[400px]">
                You have unlimited access to all Pro features.
              </p>
            </div>
          </div>

          <div className="w-full md:w-auto min-w-[280px]">
            <div className="flex items-end justify-between mb-2">
              <span className="text-xs font-medium text-indigo-300 uppercase tracking-wider">
                Time Remaining
              </span>
              <span className="text-xl font-bold text-white tabular-nums">
                {trialDaysRemaining}{' '}
                <span className="text-xs font-normal text-zinc-500 ml-0.5">days</span>
              </span>
            </div>
            <div className="h-3 w-full bg-zinc-900/50 rounded-full overflow-hidden ring-1 ring-white/5 backdrop-blur-sm">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                style={{ width: `${(trialDaysRemaining / 30) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ExpiredBanner = () => {
    if (!isTrialExpired) return null;
    return (
      <div className="w-full bg-red-500/10 border border-red-500/20 rounded-lg p-6 mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-red-500 rounded-full text-white">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Trial Ended</h3>
            <p className="text-zinc-400 text-sm">Please upgrade to a plan that suits you.</p>
          </div>
        </div>
      </div>
    );
  };

  // Sub Plan to display
  const currentSub = isAnnual ? PLANS.annual : PLANS.monthly;
  const subPlanType = isAnnual ? 'annual' : 'monthly';

  return (
    <div className="w-full px-0 sm:px-0">
      {' '}
      {/* Max-width handled by layout usually, but ensuring nice alignment */}
      {/* Header + Toggle Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Billing</h1>
          <p className="text-zinc-400">Simple pricing. No limits.</p>
        </div>

        {/* Toggle - Outside Card */}
        {!hasPaidAccess && (
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-1">
            <button
              onClick={() => setIsAnnual(false)}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-md transition-all',
                !isAnnual
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300',
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2',
                isAnnual ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300',
              )}
            >
              Yearly
              <span className="bg-green-500/20 text-green-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                SAVE 20%
              </span>
            </button>
          </div>
        )}
      </div>
      <TrialProgressBar />
      <ExpiredBanner />
      {/* Pricing Section */}
      <div id="pricing-plans" className="space-y-6">
        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 1. Subscription Card */}
          <Card
            className={cn(
              'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 transition-all flex flex-col relative',
              isPaid && !isLifetime && 'border-indigo-500/50 ring-1 ring-indigo-500/20',
            )}
          >
            <CardContent className="p-8 flex-1 flex flex-col">
              <div className="mb-8">
                <h3 className="text-xl font-bold text-white mb-2">{currentSub.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-bold text-white tracking-tight">
                    {currentSub.price}
                  </span>
                  <span className="text-zinc-500">{currentSub.priceDetail}</span>
                </div>
                {isAnnual && currentSub.subPrice && (
                  <p className="text-green-400 text-sm mt-2 font-medium">{currentSub.subPrice}</p>
                )}
                {isTrial ? (
                  <p className="text-indigo-400 text-sm mt-1 font-medium">
                    {trialDaysRemaining} days remaining in trial
                  </p>
                ) : isNewUser ? (
                  <p className="text-indigo-400 text-sm mt-1 font-medium">30-day free trial</p>
                ) : null}
              </div>

              <Button
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium h-12 mb-8"
                disabled={isLoading === subPlanType || hasPaidAccess}
                onClick={() => {
                  if (isNewUser) handleStartTrial();
                  else handleUpgrade(subPlanType);
                }}
              >
                {isLoading === subPlanType
                  ? 'Loading...'
                  : hasPaidAccess
                    ? user?.subscriptionPlan === subPlanType
                      ? 'Current Plan'
                      : `Switch to ${isAnnual ? 'Yearly' : 'Monthly'}`
                    : 'Upgrade'}
              </Button>

              <div className="space-y-4 mt-auto border-t border-zinc-800 pt-6">
                <p className="text-sm font-medium text-white mb-2">Everything in Free, plus:</p>
                {currentSub.features.map(feature => (
                  <div key={feature} className="flex items-center gap-3 text-sm text-zinc-400">
                    <Check className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                    {feature}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 2. Lifetime Card */}
          <Card
            className={cn(
              'bg-zinc-950 border-zinc-800 hover:border-yellow-500/30 transition-all flex flex-col relative',
              isLifetime && 'border-yellow-500/50 ring-1 ring-yellow-500/20',
            )}
          >
            {/* Badge */}
            {!isLifetime && (
              <div className="absolute top-6 right-6">
                <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                  <Crown className="h-3 w-3 fill-current" />
                  BEST VALUE
                </span>
              </div>
            )}

            <CardContent className="p-8 flex-1 flex flex-col">
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xl font-bold text-white">{PLANS.lifetime.name}</h3>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-bold text-white tracking-tight">
                    {PLANS.lifetime.price}
                  </span>
                  <span className="text-zinc-500">{PLANS.lifetime.priceDetail}</span>
                </div>
                <p className="text-yellow-500 text-sm mt-2 font-medium">Pay once, use forever</p>
              </div>

              <Button
                variant="outline"
                className={cn(
                  'w-full border-zinc-700 bg-transparent hover:bg-zinc-800 text-white font-medium h-12 mb-8',
                  isLifetime &&
                    'bg-yellow-500/10 border-yellow-500 text-yellow-500 hover:bg-yellow-500/20 hover:text-yellow-500',
                )}
                disabled={isLoading === 'lifetime' || isLifetime}
                onClick={() => handleUpgrade('lifetime')}
              >
                {isLoading === 'lifetime'
                  ? 'Loading...'
                  : isLifetime
                    ? 'Lifetime Active'
                    : 'Upgrade'}
              </Button>

              <div className="space-y-4 mt-auto border-t border-zinc-800 pt-6">
                <p className="text-sm font-medium text-white mb-2">Everything in Pro, plus:</p>
                {PLANS.lifetime.features.map(feature => (
                  <div key={feature} className="flex items-center gap-3 text-sm text-zinc-400">
                    <Check className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                    {feature}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {hasPaidAccess && (
          <div className="flex justify-center mt-8">
            <Button variant="outline" onClick={handleManage}>
              All Billing Settings <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
