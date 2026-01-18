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
import {
  Settings,
  TrendingUp,
  TrendingDown,
  Minus,
  MoreHorizontal,
  LayoutDashboard,
  Code,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useNavigation, useWebsiteStatsQuery, useWebsitePageviewsQuery } from '@/components/hooks';
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { WebsiteDeleteForm } from './[websiteId]/settings/WebsiteDeleteForm';

export function WebsiteCard({ website }: { website: any }) {
  const { renderUrl, router } = useNavigation();
  const { toast } = useToast();
  const { data: stats } = useWebsiteStatsQuery(website.id);
  const { data: pageviews } = useWebsitePageviewsQuery({ websiteId: website.id });
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  let data =
    pageviews?.sessions?.map((item: any) => ({
      day: item.x,
      visitors: item.y,
    })) || [];

  const maxVisitors = Math.max(...data.map((d: any) => d.visitors), 0);
  const isNoData = data.length === 0 || maxVisitors === 0;

  if (isNoData) {
    data = Array.from({ length: 24 }, (_, i) => ({
      day: i,
      visitors: 0,
    }));
  } else if (data.length === 1) {
    // Pad single data point to make a line
    const point = data[0];
    data = [
      { ...point, day: 'start-2', visitors: 0 },
      { ...point, day: 'start', visitors: 0 },
      point,
      { ...point, day: 'end', visitors: 0 },
      { ...point, day: 'end-2', visitors: 0 },
    ];
  }

  const domainMax = Math.max(10, maxVisitors);

  const totalVisitors = stats?.visitors || 0;
  const previousVisitors = stats?.comparison?.visitors || 0;
  const growth = previousVisitors
    ? Math.round(((totalVisitors - previousVisitors) / previousVisitors) * 100)
    : 0;
  const isPositive = growth > 0;
  const isNegative = growth < 0;
  const growthColor = isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-zinc-500';
  const GrowthIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 });
  const cardRef = React.useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleCopyScript = (e: React.MouseEvent) => {
    e.stopPropagation();
    const script = `<script defer src="https://analytics.conclick.com/script.js" data-website-id="${website.id}"></script>`;
    navigator.clipboard.writeText(script);
    toast('Tracking script copied to clipboard.');
  };

  return (
    <Card
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg dark:hover:shadow-[0_20px_40px_-15px_rgba(255,255,255,0.05)] dark:bg-[hsl(0,0%,8%)] dark:border-[hsl(0,0%,12%)] dark:hover:border-[hsl(0,0%,15%)]"
    >
      <div
        className="pointer-events-none absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, hsla(243, 29%, 50%, 0.15), transparent 40%)`,
        }}
      />
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-0">
        <div className="flex items-center gap-3">
          <img
            src={`https://www.google.com/s2/favicons?domain=${website.domain}&sz=64`}
            alt={`${website.name} favicon`}
            className="h-6 w-6 rounded-sm"
          />
          <Link
            href={renderUrl(`/websites/${website.id}`, false)}
            className="text-base font-semibold hover:underline text-foreground"
          >
            {website.domain}
          </Link>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
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
              onClick={() => router.push(renderUrl(`/websites/${website.id}`, false))}
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

      <CardContent className="pt-6">
        <div className="flex flex-col space-y-6">
          <div>
            <div className="flex items-baseline">
              <span className="text-3xl font-bold tracking-tight text-foreground mr-2">
                {totalVisitors.toLocaleString()}
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                {totalVisitors === 1 ? 'Visitor' : 'Visitors'}
              </span>
            </div>
            <div className={`flex items-center text-sm font-medium mt-1`}>
              <span className={`flex items-center ${growthColor} mr-2`}>
                <GrowthIcon className={`mr-1 h-4 w-4 ${growthColor}`} />
                {Math.abs(growth)}%
              </span>
              <span className="text-muted-foreground">vs previous 24h</span>
            </div>
          </div>
          <div className="h-[60px] w-full [&_*]:!outline-none [&_*]:!box-shadow-none cursor-default">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id={`gradient-${website.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(243, 29%, 50%)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="hsl(243, 29%, 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis hide domain={[0, domainMax]} />
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
