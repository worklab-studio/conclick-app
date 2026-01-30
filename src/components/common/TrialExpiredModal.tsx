'use client';

import { useLoginQuery } from '@/components/hooks';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Crown, Lock } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

export function TrialExpiredModal() {
  const { user } = useLoginQuery();
  const router = useRouter();

  if (!user) return null;

  const now = new Date();
  const trialEndsAt = user.trialEndsAt ? new Date(user.trialEndsAt) : null;
  const subEndsAt = user.subscriptionEndsAt ? new Date(user.subscriptionEndsAt) : null;
  const periodEndsAt = user.currentPeriodEndsAt ? new Date(user.currentPeriodEndsAt) : null;
  const effectiveEndsAt = periodEndsAt && periodEndsAt > now ? periodEndsAt : subEndsAt;

  const isLifetime = user.subscriptionPlan === 'lifetime' || user.lemonOrderId;
  const isPaid =
    (user.subscriptionStatus === 'active' || (effectiveEndsAt && effectiveEndsAt > now)) &&
    !isLifetime;
  const hasPaidAccess = isPaid || isLifetime;

  // Trial logic
  const isTrialExpired = !hasPaidAccess && trialEndsAt && trialEndsAt < now;

  const pathname = usePathname();

  // Ensure admins or specific roles aren't blocked if not intended, but requirement implies strict blocking
  if (!isTrialExpired) return null;

  // Don't show modal if already on billing page
  if (pathname === '/account/billing') return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md">
      <div className="absolute inset-0 bg-background/20" />

      <Card className="relative z-10 w-full max-w-md border-zinc-800 bg-zinc-950/90 shadow-2xl">
        <CardContent className="flex flex-col items-center p-8 text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 ring-1 ring-red-500/20">
            <Lock className="h-8 w-8 text-red-500" />
          </div>

          <h2 className="mb-2 text-2xl font-bold text-white">Trial Expired</h2>
          <p className="mb-8 text-zinc-400">
            Your free trial has ended. To continue using unlimited features and accessing your data,
            please upgrade to a Pro plan.
          </p>

          <Button
            className="w-full bg-indigo-600 hover:bg-indigo-500"
            size="lg"
            onClick={() => router.push('/account/billing')}
          >
            <Crown className="mr-2 h-4 w-4" />
            Upgrade Now
          </Button>

          <p className="mt-4 text-xs text-zinc-500">Need help? Contact support.</p>
        </CardContent>
      </Card>
    </div>
  );
}
