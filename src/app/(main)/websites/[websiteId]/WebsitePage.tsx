'use client';

import { WebsiteHeader } from './WebsiteHeader';
import { WebsiteMetricsBar } from './WebsiteMetricsBar';
import { WebsiteChart } from './WebsiteChart';
import { WebsitePanels } from './WebsitePanels';
import { useWebsiteQuery } from '@/components/hooks';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

import { useState } from 'react';

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

export function WebsitePage({ websiteId }: { websiteId: string }) {
  const { data: website, isLoading, error } = useWebsiteQuery(websiteId);
  const [chartType, setChartType] = useState('overview');

  if (isLoading) {
    return <LoadingSkeleton />;
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
