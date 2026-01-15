'use client';

import { WebsiteHeader } from './WebsiteHeader';
import { WebsiteMetricsBar } from './WebsiteMetricsBar';
import { WebsiteChart } from './WebsiteChart';
import { WebsitePanels } from './WebsitePanels';
import { useWebsiteQuery, useLoginQuery } from '@/components/hooks';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

function LoadingSkeleton() {
  return (
    <div className="mx-auto w-full px-3 md:px-6 py-8" style={{ maxWidth: '1320px' }}>
      <div className="mx-4 space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-[200px] dark:bg-[hsl(0,0%,12%)]" />
            <Skeleton className="h-10 w-[180px] dark:bg-[hsl(0,0%,12%)]" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20 dark:bg-[hsl(0,0%,12%)]" />
            <Skeleton className="h-9 w-24 dark:bg-[hsl(0,0%,12%)]" />
          </div>
        </div>

        {/* Metrics bar skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="dark:bg-[hsl(0,0%,8%)] dark:border-[hsl(0,0%,12%)]">
              <CardContent className="p-4">
                <Skeleton className="h-4 w-16 mb-2 dark:bg-[hsl(0,0%,12%)]" />
                <Skeleton className="h-8 w-20 dark:bg-[hsl(0,0%,12%)]" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Chart skeleton */}
        <Card className="dark:bg-[hsl(0,0%,8%)] dark:border-[hsl(0,0%,12%)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <Skeleton className="h-6 w-24 dark:bg-[hsl(0,0%,12%)]" />
            <Skeleton className="h-9 w-40 dark:bg-[hsl(0,0%,12%)]" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[400px] w-full dark:bg-[hsl(0,0%,12%)]" />
          </CardContent>
        </Card>

        {/* Panels skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="dark:bg-[hsl(0,0%,8%)] dark:border-[hsl(0,0%,12%)]">
              <CardHeader>
                <Skeleton className="h-6 w-32 dark:bg-[hsl(0,0%,12%)]" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...Array(5)].map((_, j) => (
                    <Skeleton key={j} className="h-8 w-full dark:bg-[hsl(0,0%,12%)]" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// Access logic helper (copied from BillingPage - safe to strictly check here, frontend side)
function checkAccess(user: any) {
  if (!user) return false;

  // Admin Override
  if (user.role === 'admin') return true;
  // Conclick Demo Bypass
  if (user.username?.toLowerCase() === 'conclick') return true;

  const now = new Date();
  const trialEndsAt = user.trialEndsAt ? new Date(user.trialEndsAt) : null;
  const subEndsAt = user.subscriptionEndsAt ? new Date(user.subscriptionEndsAt) : null;
  const periodEndsAt = user.currentPeriodEndsAt ? new Date(user.currentPeriodEndsAt) : null;
  const effectiveEndsAt = periodEndsAt && periodEndsAt > now ? periodEndsAt : subEndsAt;

  const isLifetime = user.subscriptionPlan === 'lifetime' || user.lemonOrderId;
  const isPaid = (user.subscriptionStatus === 'active' || (effectiveEndsAt && effectiveEndsAt > now)) && !isLifetime;

  // Check PAID
  if (isLifetime || isPaid) return true;

  // Check TRIAL
  const isTrial = user.subscriptionStatus === 'trial' || (trialEndsAt && trialEndsAt > now);
  if (isTrial) {
    if (trialEndsAt && trialEndsAt > now) return true;
  }

  return false;
}

export function WebsitePage({ websiteId }: { websiteId: string }) {
  const { user, isLoading: isUserLoading } = useLoginQuery();
  const { data: website, isLoading: isWebsiteLoading, error } = useWebsiteQuery(websiteId);
  const [chartType, setChartType] = useState('overview');
  const router = useRouter();

  // Access Control Redirect
  useEffect(() => {
    if (!isUserLoading && user) {
      const hasAccess = checkAccess(user);
      if (!hasAccess) {
        router.replace('/account/billing');
        toast.error('Your trial has expired. Please upgrade to continue viewing analytics.');
      }
    }
  }, [user, isUserLoading, router]);

  if (isWebsiteLoading || isUserLoading) {
    return <LoadingSkeleton />;
  }

  // Double check access to prevent flash of content before redirect
  if (user && !checkAccess(user)) {
    return null;
  }

  if (error) {
    return (
      <div className="mx-auto w-full px-3 md:px-6 py-8 text-red-500" style={{ maxWidth: '1320px' }}>
        Error loading website data
      </div>
    );
  }

  return (
    <div className="mx-auto w-full px-3 md:px-6 py-8" style={{ maxWidth: '1320px' }}>
      <div className="mx-4 space-y-6">
        <WebsiteHeader websiteId={websiteId} />
        <WebsiteMetricsBar websiteId={websiteId} chartType={chartType} />
        <WebsiteChart websiteId={websiteId} chartType={chartType} onChartTypeChange={setChartType} />
        <WebsitePanels websiteId={websiteId} />
      </div>
    </div>
  );
}
