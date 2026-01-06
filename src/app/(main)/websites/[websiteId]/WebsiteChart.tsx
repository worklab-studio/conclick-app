'use client';

import { useDateRange, useTimezone } from '@/components/hooks';
import { useApi } from '@/components/hooks/useApi';
import { useWebsitePageviewsQuery } from '@/components/hooks/queries/useWebsitePageviewsQuery';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Area,
  AreaChart,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Bar,
  Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StripeConnectPlaceholder } from './StripeConnectPlaceholder';

const DEMO_WEBSITE_ID = '1be0acac-4fc3-4dc1-a4d2-02e6a2aae843';

export function WebsiteChart({
  websiteId,
  chartType,
  onChartTypeChange,
}: {
  websiteId: string;
  chartType: string;
  onChartTypeChange: (type: string) => void;
}) {
  const { timezone } = useTimezone();
  const { dateRange } = useDateRange({ timezone });
  const { startDate, endDate, unit } = dateRange;
  const { get, useQuery } = useApi();

  const isDemo = websiteId === DEMO_WEBSITE_ID;

  const {
    data: pageviewsData,
    isLoading: isLoadingPageviews,
    error: errorPageviews,
  } = useWebsitePageviewsQuery({ websiteId });

  const {
    data: revenueData,
    isLoading: isLoadingRevenue,
    error: errorRevenue,
  } = useQuery({
    queryKey: ['revenue', websiteId],
    queryFn: () => get(`/websites/${websiteId}/revenue`),
    enabled: !!websiteId && chartType === 'revenue' && !isDemo,
  });

  const chartData = useMemo(() => {
    // Generate date range based on selected period with proper granularity
    const generateDateRange = () => {
      const dates: string[] = [];
      const start = new Date(startDate);
      const end = new Date(endDate);

      const current = new Date(start);

      while (current <= end) {
        // Use date-fns format to preserve local time date boundaries
        if (unit === 'hour') {
          // Format: YYYY-MM-DDTHH:00 for hourly data (in local time)
          dates.push(format(current, "yyyy-MM-dd'T'HH':00'"));
          current.setHours(current.getHours() + 1);
        } else if (unit === 'day') {
          // Format: YYYY-MM-DD for daily data (in local time)
          dates.push(format(current, 'yyyy-MM-dd'));
          current.setDate(current.getDate() + 1);
        } else if (unit === 'month') {
          // Format: YYYY-MM for monthly data
          dates.push(format(current, 'yyyy-MM'));
          current.setMonth(current.getMonth() + 1);
        } else {
          dates.push(format(current, 'yyyy-MM-dd'));
          current.setDate(current.getDate() + 1);
        }
      }
      return dates;
    };

    // Always create data map with all dates in range
    const dataMap = new Map();
    const allDates = generateDateRange();

    // Initialize all dates with zero values
    allDates.forEach(date => {
      dataMap.set(date, {
        date,
        pageviews: 0,
        pageviews_stacked: 0,
        visitors: 0,
        revenue: 0,
      });
    });

    // Helper function to normalize date keys based on unit
    // API returns UTC timestamps like "2025-12-30T00:00:00Z"
    // We parse to Date (which converts to local), then format in local time
    const normalizeKey = (x: string) => {
      try {
        const d = new Date(x);
        if (unit === 'hour') {
          return format(d, "yyyy-MM-dd'T'HH':00'");
        } else if (unit === 'month') {
          return format(d, 'yyyy-MM');
        }
        return format(d, 'yyyy-MM-dd');
      } catch {
        return x;
      }
    };

    // Fill in actual pageviews data if available
    if (pageviewsData?.pageviews) {
      pageviewsData.pageviews.forEach((item: any) => {
        const key = normalizeKey(item.x);
        if (dataMap.has(key)) {
          const existing = dataMap.get(key);
          existing.pageviews = item.y;
          existing.pageviews_stacked = item.y;
        }
      });
    }

    // Fill in actual sessions/visitors data if available
    if (pageviewsData?.sessions) {
      pageviewsData.sessions.forEach((item: any) => {
        const key = normalizeKey(item.x);
        if (dataMap.has(key)) {
          const existing = dataMap.get(key);
          existing.visitors = item.y;
          existing.pageviews_stacked = Math.max(0, existing.pageviews - item.y);
        }
      });
    }

    // For demo: generate mock revenue matching existing data points
    if (isDemo && chartType === 'revenue') {
      dataMap.forEach(value => {
        value.revenue = Math.floor(Math.random() * 100) + 20;
      });
    } else if (revenueData?.chart) {
      revenueData.chart.forEach((item: any) => {
        const key = normalizeKey(item.x);
        if (dataMap.has(key)) {
          dataMap.get(key).revenue += item.y;
        }
      });
    }

    return Array.from(dataMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }, [pageviewsData, revenueData, isDemo, chartType, startDate, endDate, unit]);

  const isLoading = isLoadingPageviews || (isLoadingRevenue && !isDemo && chartType === 'revenue');
  const error = errorPageviews || (errorRevenue && !isDemo);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return <div className="text-red-500">Error loading chart data</div>;
  }

  const showRevenueChart = isDemo || (revenueData && revenueData.total > 0);

  return (
    <Card className="dark:bg-[hsl(0,0%,8%)] dark:border-[hsl(0,0%,12%)]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Overview</CardTitle>
        <Tabs value={chartType} onValueChange={onChartTypeChange}>
          <TabsList className="grid w-full grid-cols-2 dark:bg-[hsl(0,0%,10%)]">
            <TabsTrigger value="overview">Visitors</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full [&_*]:!outline-none cursor-default">
          {chartType === 'overview' ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  interval={Math.max(0, Math.floor(chartData.length / 8) - 1)}
                  tickFormatter={str => {
                    try {
                      // Parse the date string (handles both YYYY-MM-DD and YYYY-MM-DDTHH:00 formats)
                      const date = str.includes('T') ? new Date(str) : parseISO(str);
                      if (unit === 'hour') {
                        return format(date, 'ha').toLowerCase(); // 2am, 5pm format
                      } else if (unit === 'day') {
                        return format(date, 'd MMM'); // 6 Jan
                      } else {
                        return format(date, 'MMM yy'); // Jan 26
                      }
                    } catch {
                      return str;
                    }
                  }}
                  style={{ fontSize: '12px', fill: '#71717a' }}
                />
                <YAxis yAxisId="left" tick={false} axisLine={false} width={0} />
                <Tooltip
                  cursor={{
                    strokeDasharray: '3 3',
                    stroke: '#a1a1aa',
                    strokeWidth: 1,
                    opacity: 0.5,
                  }}
                  content={({ active, payload, label }) => {
                    if (active && payload?.length) {
                      let date: Date;
                      const labelStr = label as string;
                      // Parse different date formats
                      if (labelStr.includes('T')) {
                        date = new Date(labelStr);
                      } else if (labelStr.length === 7) {
                        // YYYY-MM format for monthly data
                        date = new Date(labelStr + '-01');
                      } else {
                        date = parseISO(labelStr);
                      }

                      // Format based on unit
                      const headerText =
                        unit === 'hour'
                          ? format(date, 'ha')
                          : unit === 'month'
                            ? format(date, 'MMMM yyyy')
                            : format(date, 'EEEE');
                      const subText = unit === 'month' ? null : format(date, 'MMM d, yyyy');

                      return (
                        <div className="bg-[hsl(0,0%,8%)] border border-[hsl(0,0%,12%)] rounded-lg shadow-xl p-3 min-w-[150px]">
                          <div className="text-zinc-200 text-sm font-semibold mb-1">
                            {headerText}
                          </div>
                          {subText && <div className="text-zinc-500 text-sm mb-3">{subText}</div>}
                          <div className="border-b border-zinc-800 mb-3" />
                          {payload.map((entry: any, i: number) => (
                            <div key={i} className="flex justify-between gap-4 text-sm">
                              <span className="text-zinc-400">{entry.name}</span>
                              <span className="text-zinc-100 font-bold">
                                {entry.name === 'Pageviews' ? entry.payload.pageviews : entry.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend formatter={v => <span style={{ color: '#a1a1aa' }}>{v}</span>} />
                <Bar
                  yAxisId="left"
                  dataKey="visitors"
                  name="Visitors"
                  stackId="a"
                  fill="#5e5ba4"
                  barSize={20}
                />
                <Bar
                  yAxisId="left"
                  dataKey="pageviews_stacked"
                  name="Pageviews"
                  stackId="a"
                  fill="#43415F"
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : showRevenueChart ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ADE80" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#4ADE80" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  interval={Math.max(0, Math.floor(chartData.length / 8) - 1)}
                  tickFormatter={str => {
                    try {
                      const date = str.includes('T') ? new Date(str) : parseISO(str);
                      if (unit === 'hour') {
                        return format(date, 'ha').toLowerCase(); // 2am, 5pm format
                      } else if (unit === 'day') {
                        return format(date, 'd MMM'); // 6 Jan
                      } else {
                        return format(date, 'MMM yy'); // Jan 26
                      }
                    } catch {
                      return str;
                    }
                  }}
                  style={{ fontSize: '12px', fill: '#71717a' }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => `$${v}`}
                  style={{ fontSize: '12px', fill: '#71717a' }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload?.length) {
                      let date: Date;
                      const labelStr = label as string;
                      if (labelStr.includes('T')) {
                        date = new Date(labelStr);
                      } else if (labelStr.length === 7) {
                        date = new Date(labelStr + '-01');
                      } else {
                        date = parseISO(labelStr);
                      }

                      const headerText =
                        unit === 'hour'
                          ? format(date, 'ha')
                          : unit === 'month'
                            ? format(date, 'MMMM yyyy')
                            : format(date, 'EEEE');
                      const subText = unit === 'month' ? null : format(date, 'MMM d, yyyy');

                      return (
                        <div className="bg-[hsl(0,0%,8%)] border border-[hsl(0,0%,12%)] rounded-lg shadow-xl p-3">
                          <div className="text-zinc-200 text-sm font-semibold mb-1">
                            {headerText}
                          </div>
                          {subText && <div className="text-zinc-500 text-sm mb-3">{subText}</div>}
                          <div className="text-green-500 font-bold">${payload[0].value}</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#4ADE80"
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <StripeConnectPlaceholder websiteId={websiteId} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
