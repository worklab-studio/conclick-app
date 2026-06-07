'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@umami/react-zen';
import { Settings, MoreHorizontal, LayoutDashboard, Code, Trash2, Globe } from 'lucide-react';
import Link from 'next/link';
import { useNavigation } from '@/components/hooks';
import { useApi } from '@/components/hooks/useApi';
import { useDateParameters } from '@/components/hooks/useDateParameters';
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { WebsiteDeleteForm } from './[websiteId]/settings/WebsiteDeleteForm';
import { DeltaPill } from './WebsitesOverview';
import { SiteIcon } from './SiteIcon';

const DAY_MS = 24 * 60 * 60 * 1000;

export function WebsiteCard({ website }: { website: any }) {
  const { renderUrl, router } = useNavigation();
  const { toast } = useToast();
  const { get, useQuery } = useApi();
  const { timezone } = useDateParameters();
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  // Fetch an explicit, self-contained rolling 24h window so the card's numbers,
  // its "Last 24h" label and the sparkline window always agree — independent of
  // any shared/global date selection elsewhere in the app.
  const { data: stats } = useQuery({
    queryKey: ['card:stats:24h', website.id, timezone],
    queryFn: () =>
      get(`/websites/${website.id}/stats`, {
        startAt: Date.now() - DAY_MS,
        endAt: Date.now(),
        unit: 'hour',
        timezone,
      }),
    enabled: !!website.id,
  });

  const { data: pv } = useQuery({
    queryKey: ['card:pageviews:24h', website.id, timezone],
    queryFn: () =>
      get(`/websites/${website.id}/pageviews`, {
        startAt: Date.now() - DAY_MS,
        endAt: Date.now(),
        unit: 'hour',
        timezone,
      }),
    enabled: !!website.id,
  });

  // "Connected" = has the site ever received data? The all-time check is the
  // expensive query, so only run it for sites that look idle in the last 24h.
  // Active sites are obviously connected and skip the extra round-trip.
  const idle = !!stats && (stats.visitors || 0) === 0 && (stats.pageviews || 0) === 0;
  const { data: lifetime } = useQuery({
    queryKey: ['website:lifetime', website.id, timezone],
    queryFn: () =>
      get(`/websites/${website.id}/stats`, {
        startAt: new Date('2020-01-01').getTime(),
        endAt: Date.now(),
        unit: 'month',
        timezone,
      }),
    enabled: !!website.id && idle,
    staleTime: 60_000,
  });
  const connected = !stats ? null : !idle ? true : lifetime ? (lifetime.pageviews || 0) > 0 : null;

  // The pageviews series is sparse (only hours that had activity). Zero-fill it
  // into a complete 24-bucket timeline so a single visit reads as one clean
  // spike instead of an odd centered hump, and "no data" is a flat baseline.
  const series = React.useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, i) => ({ t: i, visitors: 0 }));
    const start = Date.now() - DAY_MS;
    for (const point of pv?.sessions || []) {
      const ts = Date.parse(String(point.x).replace(' ', 'T'));
      if (Number.isNaN(ts)) continue;
      let idx = Math.floor((ts - start) / (60 * 60 * 1000));
      if (idx < 0) idx = 0;
      if (idx > 23) idx = 23;
      buckets[idx].visitors += point.y || 0;
    }
    return buckets;
  }, [pv]);

  const maxVisitors = Math.max(...series.map(b => b.visitors), 0);
  const hasData = maxVisitors > 0;

  const visitors = stats?.visitors || 0;
  const pageviews = stats?.pageviews || 0;
  const previousVisitors = stats?.comparison?.visitors || 0;
  const growth = previousVisitors
    ? Math.round(((visitors - previousVisitors) / previousVisitors) * 100)
    : 0;

  const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 });
  const cardRef = React.useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      setMousePosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };

  const handleCopyScript = (e: React.MouseEvent) => {
    e.stopPropagation();
    const host = typeof window !== 'undefined' ? window.location.origin : 'https://app.conclick.io';
    const script = `<script defer src="${host}/script.js" data-website-id="${website.id}"></script>`;
    navigator.clipboard.writeText(script);
    toast('Tracking script copied to clipboard.');
  };

  const dashboardUrl = renderUrl(`/websites/${website.id}`, false);

  return (
    <Card
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onClick={() => router.push(dashboardUrl)}
      onKeyDown={e => {
        if (e.key === 'Enter') router.push(dashboardUrl);
      }}
      role="link"
      tabIndex={0}
      className="group relative cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:outline-none dark:hover:shadow-[0_20px_40px_-15px_rgba(255,255,255,0.05)] dark:bg-[hsl(0,0%,8%)] dark:border-[hsl(0,0%,12%)] dark:hover:border-[hsl(0,0%,15%)]"
    >
      <div
        className="pointer-events-none absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, hsla(243, 29%, 50%, 0.15), transparent 40%)`,
        }}
      />
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-0">
        <div className="flex min-w-0 items-center gap-3">
          <SiteIcon domain={website.domain} name={website.name} size={24} />
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href={dashboardUrl}
              className="truncate text-base font-semibold text-foreground hover:underline"
            >
              {website.domain}
            </Link>
            {connected === false ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400 ring-1 ring-inset ring-amber-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                Not connected
              </span>
            ) : (
              <span className="shrink-0 rounded-full bg-zinc-800/70 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                Last 24h
              </span>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={e => e.stopPropagation()}
              className="h-8 w-8 -mt-1 -mr-2 text-muted-foreground hover:text-foreground"
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">More actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-[200px] p-2 dark:bg-[hsl(0,0%,8%)] dark:border-[hsl(0,0%,12%)]"
          >
            <DropdownMenuItem
              onClick={() => router.push(dashboardUrl)}
              className="cursor-pointer focus:bg-[hsl(0,0%,12%)]"
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              <span>View dashboard</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push(renderUrl(`/websites/${website.id}/settings`))}
              className="cursor-pointer focus:bg-[hsl(0,0%,12%)]"
            >
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleCopyScript}
              className="cursor-pointer focus:bg-[hsl(0,0%,12%)]"
            >
              <Code className="mr-2 h-4 w-4" />
              <span>Copy tracking script</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-[hsl(0,0%,12%)] my-1" />

            <DropdownMenuItem
              onClick={e => {
                e.stopPropagation();
                setDeleteOpen(true);
              }}
              className="text-red-600 dark:text-red-600 focus:text-red-600 dark:focus:text-red-600 cursor-pointer focus:bg-[hsl(0,0%,12%)]"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent className="pt-5">
        <div className="flex flex-col gap-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-foreground">
                  {visitors.toLocaleString()}
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  {visitors === 1 ? 'Visitor' : 'Visitors'}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-sm">
                <DeltaPill delta={growth} goodWhenUp />
                <span className="text-muted-foreground">vs previous 24h</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-semibold text-foreground">
                {pageviews.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">Pageviews</div>
            </div>
          </div>

          {hasData ? (
            <div className="h-[60px] w-full [&_*]:!box-shadow-none [&_*]:!outline-none">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series}>
                  <defs>
                    <linearGradient id={`gradient-${website.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(243, 29%, 50%)" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="hsl(243, 29%, 50%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <YAxis hide domain={[0, Math.max(maxVisitors, 1)]} />
                  <Area
                    type="monotone"
                    dataKey="visitors"
                    stroke="hsl(243, 29%, 50%)"
                    strokeWidth={2}
                    fill={`url(#gradient-${website.id})`}
                    isAnimationActive={false}
                    className="transition-all duration-300 group-hover:drop-shadow-[0_0_10px_hsla(243,29%,50%,0.5)]"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="relative h-[60px] w-full">
              <div className="absolute inset-x-0 bottom-4 border-t border-dashed border-zinc-700/50" />
              <div className="absolute inset-0 flex items-center justify-center gap-1.5 text-muted-foreground">
                <Globe className="h-3.5 w-3.5 opacity-60" />
                <span className="text-xs">
                  {connected === false
                    ? 'Add your tracking code to start'
                    : 'No visits in the last 24h'}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-[hsl(0,0%,8%)] dark:border-[hsl(0,0%,12%)]">
          <DialogHeader>
            <DialogTitle className="text-foreground">Delete Website</DialogTitle>
          </DialogHeader>
          <WebsiteDeleteForm
            websiteId={website.id}
            onSave={() => setDeleteOpen(false)}
            onClose={() => setDeleteOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}
