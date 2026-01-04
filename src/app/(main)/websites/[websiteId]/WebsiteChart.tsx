'use client';

import { useDateRange, useTimezone, useResultQuery } from '@/components/hooks';
import { useWebsitePageviewsQuery } from '@/components/hooks/queries/useWebsitePageviewsQuery';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Area, AreaChart, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Bar, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  const { data: pageviewsData, isLoading: isLoadingPageviews, error: errorPageviews } = useWebsitePageviewsQuery({ websiteId });

  const { data: revenueData, isLoading: isLoadingRevenue, error: errorRevenue } = useResultQuery<any>('revenue', {
    websiteId,
    startDate,
    endDate,
    unit,
    currency: 'USD', // Defaulting to USD for now, could be made dynamic later
  });

  const finalPageviewsData = pageviewsData;
  const finalRevenueData = revenueData;

  const chartData = useMemo(() => {
    if (!finalPageviewsData) return [];

    const dataMap = new Map();

    // Process Pageviews and Sessions (Visitors)
    finalPageviewsData.pageviews?.forEach((item: any) => {
      dataMap.set(item.x, {
        date: item.x,
        pageviews: item.y,
        pageviews_stacked: item.y, // Initial value, will subtract visitors later
        visitors: 0,
        revenue: 0,
      });
    });

    finalPageviewsData.sessions?.forEach((item: any) => {
      if (dataMap.has(item.x)) {
        const existing = dataMap.get(item.x);
        existing.visitors = item.y;
        existing.pageviews_stacked = existing.pageviews - item.y; // Calculate diff for stacking
        if (existing.pageviews_stacked < 0) existing.pageviews_stacked = 0; // Safety check
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

    // Process Revenue
    if (finalRevenueData && finalRevenueData.chart) {
      finalRevenueData.chart.forEach((item: any) => {
        const dateKey = item.t; // Revenue data uses 't' for timestamp
        if (dataMap.has(dateKey)) {
          const existing = dataMap.get(dateKey);
          existing.revenue += item.y;
        } else {
          // If revenue exists for a time slot with no pageviews (unlikely but possible)
          dataMap.set(dateKey, {
            date: dateKey,
            pageviews: 0,
            pageviews_stacked: 0,
            visitors: 0,
            revenue: item.y
          });
        }
      });
    }

    return Array.from(dataMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [finalPageviewsData, finalRevenueData]);

  const isLoading = isLoadingPageviews || isLoadingRevenue;
  const error = errorPageviews || errorRevenue;

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

  if (error) {
    return <div className="text-red-500">Error loading chart data</div>;
  }

  return (
    <Card className="dark:bg-[hsl(0,0%,8%)] dark:border-[hsl(0,0%,12%)]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Overview</CardTitle>
        <div className="flex items-center space-x-2">
          <Tabs value={chartType} onValueChange={onChartTypeChange}>
            <TabsList className="grid w-full grid-cols-2 dark:bg-[hsl(0,0%,10%)]">
              <TabsTrigger value="overview">Visitors</TabsTrigger>
              <TabsTrigger value="revenue">Revenue</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full [&_*]:!outline-none [&_*]:!box-shadow-none cursor-default">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'overview' ? (
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
                    } catch (e) {
                      return str;
                    }
                  }}
                  style={{ fontSize: '12px', fill: '#71717a' }}
                />
                <YAxis yAxisId="left" tick={false} axisLine={false} width={0} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3', stroke: '#a1a1aa', strokeWidth: 1, opacity: 0.5 }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const date = parseISO(label as string);
                      return (
                        <div className="bg-[hsl(0,0%,8%)] border border-[hsl(0,0%,12%)] rounded-lg shadow-xl p-3 min-w-[150px]">
                          <div className="mb-4">
                            <div className="text-zinc-500 text-sm font-medium uppercase tracking-wide mb-2">
                              {format(date, unit === 'hour' ? 'HH:mm' : 'EEEE')}
                            </div>
                            <div className="text-zinc-200 text-sm font-semibold">
                              {format(date, 'MMM d, yyyy')}
                            </div>
                          </div>
                          <div className="border-b border-zinc-800 mb-4" />
                          <div className="flex flex-col gap-2">
                            {payload.map((entry: any, index: number) => {
                              const isRevenue = entry.name === 'Revenue';
                              // Use total pageviews from payload if available, otherwise entry value
                              const value = entry.name === 'Pageviews' && entry.payload.pageviews !== undefined
                                ? entry.payload.pageviews
                                : entry.value;

                              return (
                                <div key={index} className="flex items-center justify-between gap-6">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-2 h-2 rounded-full"
                                      style={{ backgroundColor: entry.color }}
                                    />
                                    <span className="text-zinc-400 text-xs font-medium">{entry.name}</span>
                                  </div>
                                  <span className={`text-lg font-bold ${isRevenue ? 'text-green-500' : 'text-zinc-100'}`}>
                                    {isRevenue ? `$${value}` : value}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend formatter={(value) => <span style={{ color: '#a1a1aa' }}>{value}</span>} />
                <Bar
                  yAxisId="left"
                  dataKey="visitors"
                  name="Visitors"
                  stackId="a"
                  fill="#5e5ba4"
                  radius={[0, 0, 0, 0]}
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
            ) : (
              <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
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
                    try {
                      return format(parseISO(str), unit === 'hour' ? 'HH:mm' : 'MMM d');
                    } catch (e) {
                      return str;
                    }
                  }}
                  style={{ fontSize: '12px', fill: '#71717a' }}
                />
                <YAxis tick={false} axisLine={false} width={0} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3', stroke: '#a1a1aa', strokeWidth: 1, opacity: 0.5 }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const date = parseISO(label as string);
                      return (
                        <div className="bg-[hsl(0,0%,8%)] border border-[hsl(0,0%,12%)] rounded-lg shadow-xl p-3 min-w-[150px]">
                          <div className="mb-4">
                            <div className="text-zinc-500 text-sm font-medium uppercase tracking-wide mb-2">
                              {format(date, unit === 'hour' ? 'HH:mm' : 'EEEE')}
                            </div>
                            <div className="text-zinc-200 text-sm font-semibold">
                              {format(date, 'MMM d, yyyy')}
                            </div>
                          </div>
                          <div className="border-b border-zinc-800 mb-4" />
                          <div className="flex flex-col gap-2">
                            {payload.map((entry: any, index: number) => {
                              const isRevenue = entry.name === 'Revenue';
                              const value = entry.value;

                              return (
                                <div key={index} className="flex items-center justify-between gap-6">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-2 h-2 rounded-full"
                                      style={{ backgroundColor: entry.color }}
                                    />
                                    <span className="text-zinc-400 text-xs font-medium">{entry.name}</span>
                                  </div>
                                  <span className={`text-lg font-bold ${isRevenue ? 'text-green-500' : 'text-zinc-100'}`}>
                                    {isRevenue ? `$${value}` : value}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend formatter={(value) => <span style={{ color: '#a1a1aa' }}>{value}</span>} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="#22c55e"
                  fillOpacity={1}
                  fill="url(#revenueGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
