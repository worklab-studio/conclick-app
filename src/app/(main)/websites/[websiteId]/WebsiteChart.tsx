'use client';

import { useDateRange, useTimezone } from '@/components/hooks';
import { useApi } from '@/components/hooks/useApi';
import { useWebsitePageviewsQuery } from '@/components/hooks/queries/useWebsitePageviewsQuery';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Area, AreaChart, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Bar, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  const { data: pageviewsData, isLoading: isLoadingPageviews, error: errorPageviews } = useWebsitePageviewsQuery({ websiteId });

  const { data: revenueData, isLoading: isLoadingRevenue, error: errorRevenue } = useQuery({
    queryKey: ['revenue', websiteId],
    queryFn: () => get(`/websites/${websiteId}/revenue`),
    enabled: !!websiteId && chartType === 'revenue' && !isDemo,
  });

  const chartData = useMemo(() => {
    if (!pageviewsData) return [];

    const dataMap = new Map();

    pageviewsData.pageviews?.forEach((item: any) => {
      dataMap.set(item.x, {
        date: item.x,
        pageviews: item.y,
        pageviews_stacked: item.y,
        visitors: 0,
        revenue: 0,
      });
    });

    pageviewsData.sessions?.forEach((item: any) => {
      if (dataMap.has(item.x)) {
        const existing = dataMap.get(item.x);
        existing.visitors = item.y;
        existing.pageviews_stacked = Math.max(0, existing.pageviews - item.y);
      } else {
        dataMap.set(item.x, {
          date: item.x,
          pageviews: 0,
          pageviews_stacked: 0,
          visitors: item.y,
          revenue: 0,
        });
      }
    });

    // For demo: generate mock revenue matching existing data points
    if (isDemo && chartType === 'revenue') {
      dataMap.forEach((value, key) => {
        value.revenue = Math.floor(Math.random() * 100) + 20;
      });
    } else if (revenueData?.chart) {
      revenueData.chart.forEach((item: any) => {
        if (dataMap.has(item.x)) {
          dataMap.get(item.x).revenue += item.y;
        }
      });
    }

    return Array.from(dataMap.values()).sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [pageviewsData, revenueData, isDemo, chartType]);

  const isLoading = isLoadingPageviews || (isLoadingRevenue && !isDemo && chartType === 'revenue');
  const error = errorPageviews || (errorRevenue && !isDemo);

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-[300px] w-full" /></CardContent>
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
                  minTickGap={30}
                  tickFormatter={(str) => {
                    try {
                      return format(parseISO(str), unit === 'hour' ? 'HH:mm' : 'MMM d');
                    } catch { return str; }
                  }}
                  style={{ fontSize: '12px', fill: '#71717a' }}
                />
                <YAxis yAxisId="left" tick={false} axisLine={false} width={0} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3', stroke: '#a1a1aa', strokeWidth: 1, opacity: 0.5 }}
                  content={({ active, payload, label }) => {
                    if (active && payload?.length) {
                      const date = parseISO(label as string);
                      return (
                        <div className="bg-[hsl(0,0%,8%)] border border-[hsl(0,0%,12%)] rounded-lg shadow-xl p-3 min-w-[150px]">
                          <div className="text-zinc-500 text-sm mb-1">{format(date, unit === 'hour' ? 'HH:mm' : 'EEEE')}</div>
                          <div className="text-zinc-200 text-sm font-semibold mb-3">{format(date, 'MMM d, yyyy')}</div>
                          <div className="border-b border-zinc-800 mb-3" />
                          {payload.map((entry: any, i: number) => (
                            <div key={i} className="flex justify-between gap-4 text-sm">
                              <span className="text-zinc-400">{entry.name}</span>
                              <span className="text-zinc-100 font-bold">{entry.name === 'Pageviews' ? entry.payload.pageviews : entry.value}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend formatter={(v) => <span style={{ color: '#a1a1aa' }}>{v}</span>} />
                <Bar yAxisId="left" dataKey="visitors" name="Visitors" stackId="a" fill="#5e5ba4" barSize={20} />
                <Bar yAxisId="left" dataKey="pageviews_stacked" name="Pageviews" stackId="a" fill="#43415F" radius={[4, 4, 0, 0]} barSize={20} />
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
                  minTickGap={30}
                  tickFormatter={(str) => {
                    try { return format(parseISO(str), unit === 'hour' ? 'HH:mm' : 'MMM d'); }
                    catch { return str; }
                  }}
                  style={{ fontSize: '12px', fill: '#71717a' }}
                />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} style={{ fontSize: '12px', fill: '#71717a' }} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload?.length) {
                      const date = parseISO(label as string);
                      return (
                        <div className="bg-[hsl(0,0%,8%)] border border-[hsl(0,0%,12%)] rounded-lg shadow-xl p-3">
                          <div className="text-zinc-500 text-sm mb-1">{format(date, unit === 'hour' ? 'HH:mm' : 'EEEE')}</div>
                          <div className="text-zinc-200 text-sm font-semibold mb-3">{format(date, 'MMM d, yyyy')}</div>
                          <div className="text-green-500 font-bold">${payload[0].value}</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#4ADE80" fillOpacity={1} fill="url(#colorRevenue)" />
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
