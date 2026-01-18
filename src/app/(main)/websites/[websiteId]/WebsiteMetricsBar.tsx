'use client';

import { useDateRange, useMessages, useNavigation, useTimezone } from '@/components/hooks';
import { formatShortTime, formatLongNumber } from '@/lib/format';
import { useWebsiteStatsQuery } from '@/components/hooks/queries/useWebsiteStatsQuery';
import { useRealtimeQuery } from '@/components/hooks/queries/useRealtimeQuery';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

import { useResultQuery } from '@/components/hooks';

const DEMO_WEBSITE_ID = '1be0acac-4fc3-4dc1-a4d2-02e6a2aae843';

export function WebsiteMetricsBar({
  websiteId,
  chartType = 'overview',
}: {
  websiteId: string;
  chartType?: string;
  showChange?: boolean;
  compareMode?: boolean;
}) {
  const isDemo = websiteId === DEMO_WEBSITE_ID;
  const { isAllTime } = useDateRange();
  const { formatMessage, labels } = useMessages();
  const { data, isLoading, error } = useWebsiteStatsQuery(websiteId);
  const { data: realtime } = useRealtimeQuery(websiteId);
  const { renderUrl } = useNavigation();

  // Revenue Data Fetching
  const { timezone } = useTimezone();
  const { dateRange } = useDateRange({ timezone });
  const { startDate, endDate, unit } = dateRange;

  const { data: revenueStats } = useResultQuery<any>('revenue', {
    websiteId,
    startDate,
    endDate,
    unit,
    currency: 'USD',
  });

  const finalData = data;

  // Calculate Total Revenue - use mock data for demo
  const realTotalRevenue =
    revenueStats?.chart?.reduce((acc: number, curr: any) => acc + curr.y, 0) || 0;
  const finalTotalRevenue = isDemo ? 2847 : realTotalRevenue;
  const finalRevenueChange = isDemo ? 342 : 0;

  const { pageviews, visitors, visits, bounces, totaltime, comparison } = finalData || {};

  // Live Visitors - use mock data for demo
  const realLiveVisitors = realtime?.totals?.activeUsers || 0;
  const liveVisitors = isDemo ? 42 : realLiveVisitors;

  // Determine 5th Card Metric
  const lastCardMetric =
    chartType === 'revenue'
      ? {
          label: 'Total Revenue',
          value: finalTotalRevenue,
          change: finalRevenueChange,
          formatValue: (n: number) => `$${formatLongNumber(n)}`,
          isLive: false,
          isRevenue: true,
          reverseColors: false,
        }
      : {
          label: 'Live Visitors',
          value: liveVisitors,
          change: 0,
          formatValue: formatLongNumber,
          isLive: true,
          isRevenue: false,
          reverseColors: false,
        };

  const metrics = [
    {
      value: visitors,
      label: formatMessage(labels.visitors),
      change: visitors - comparison?.visitors,
      formatValue: formatLongNumber,
      isLive: false,
      isRevenue: false,
      reverseColors: false,
    },
    {
      value: pageviews,
      label: 'Pageviews',
      change: pageviews - comparison?.pageviews,
      formatValue: formatLongNumber,
      isLive: false,
      isRevenue: false,
      reverseColors: false,
    },
    {
      label: formatMessage(labels.bounceRate),
      value: (Math.min(visits, bounces) / visits) * 100,
      change:
        (Math.min(visits, bounces) / visits) * 100 -
        (Math.min(comparison?.visits, comparison?.bounces) / comparison?.visits) * 100,
      formatValue: (n: number) => Math.round(+n) + '%',
      reverseColors: true,
      isLive: false,
      isRevenue: false,
    },
    {
      label: 'Session time',
      value: totaltime / visits,
      change: totaltime / visits - comparison?.totaltime / comparison?.visits,
      formatValue: (n: number) =>
        `${+n < 0 ? '-' : ''}${formatShortTime(Math.abs(~~n), ['m', 's'], ' ')}`,
      isLive: false,
      isRevenue: false,
      reverseColors: false,
    },
    lastCardMetric,
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <Skeleton className="h-4 w-[100px]" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[60px] mb-2" />
              <Skeleton className="h-4 w-[80px]" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">Error loading metrics</div>;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {metrics.map(({ label, value, change, formatValue, reverseColors, isLive }) => {
        const isPositive = change > 0;
        const isNeutral = change === 0;
        const isNegative = change < 0;

        let changeColor = isPositive
          ? 'text-green-600'
          : isNegative
            ? 'text-red-600'
            : 'text-muted-foreground';
        if (reverseColors) {
          changeColor = isPositive
            ? 'text-red-600'
            : isNegative
              ? 'text-green-600'
              : 'text-muted-foreground';
        }

        return (
          <Card
            key={label}
            className={cn(
              'transition-all duration-300 hover:shadow-lg dark:bg-[hsl(0,0%,8%)] dark:border-[hsl(0,0%,12%)] dark:hover:border-[hsl(0,0%,15%)] overflow-hidden relative',
              isLive && 'cursor-pointer hover:bg-accent/50',
            )}
            onClick={() =>
              isLive && window.open(renderUrl(`/websites/${websiteId}/live`), '_blank')
            }
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                {label}
                {isLive && (
                  <span className="relative flex h-4 w-4 items-center justify-center">
                    <span className="absolute inset-0 rounded-full bg-[conic-gradient(from_90deg_at_50%_50%,#4ade80_0%,transparent_60%)] animate-[spin_3s_linear_infinite] opacity-100"></span>
                    <span className="absolute inset-[2px] rounded-full bg-zinc-950"></span>
                    <span className="relative h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(74,222,128,0.8)]"></span>
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl font-bold text-foreground">{formatValue(value || 0)}</div>
              {!isAllTime && !isLive && (
                <div className={cn('text-xs flex items-center mt-1 font-medium', changeColor)}>
                  {isPositive && <ArrowUp className="h-3 w-3 mr-1" />}
                  {isNegative && <ArrowDown className="h-3 w-3 mr-1" />}
                  {isNeutral && <Minus className="h-3 w-3 mr-1" />}
                  {formatValue(Math.abs(change) || 0)}
                  <span className="text-muted-foreground ml-1 font-normal">vs previous 24h</span>
                </div>
              )}
              {isLive && (
                <>
                  <div className="text-xs flex items-center mt-1 font-medium text-muted-foreground">
                    <span className="text-muted-foreground font-normal">current active users</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
