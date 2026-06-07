'use client';

import {
  Users,
  Eye,
  Undo2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  type LucideIcon,
} from 'lucide-react';
import { formatLongNumber } from '@/lib/format';

export type OverviewSums = {
  pageviews: number;
  visitors: number;
  visits: number;
  bounces: number;
  totaltime: number;
  prev: {
    pageviews: number;
    visitors: number;
    visits: number;
    bounces: number;
    totaltime: number;
  };
};

function pctChange(cur: number, prev: number): number | null {
  if (!prev) return null;
  return Math.round(((cur - prev) / prev) * 100);
}

function fmtDuration(sec: number): string {
  const s = Math.round(sec);
  if (s <= 0) return '0s';
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}m ${r}s` : `${m}m`;
}

export function DeltaPill({ delta, goodWhenUp }: { delta: number | null; goodWhenUp: boolean }) {
  if (delta === null || delta === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-500/10 px-2 py-0.5 text-xs font-semibold text-zinc-400">
        <Minus className="h-3 w-3" />
        0%
      </span>
    );
  }

  const up = delta > 0;
  const good = up === goodWhenUp;
  const Icon = up ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
        good ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
      }`}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(delta)}%
    </span>
  );
}

function Tile({
  icon: Icon,
  label,
  value,
  delta,
  goodWhenUp,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  delta: number | null;
  goodWhenUp: boolean;
}) {
  return (
    <div className="rounded-xl bg-white/[0.03] p-5 transition-colors hover:bg-white/[0.05]">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 ring-1 ring-inset ring-indigo-500/15">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-4 flex items-end justify-between gap-2">
        <span className="text-2xl font-bold leading-none tracking-tight text-foreground lg:text-3xl">
          {value}
        </span>
        <DeltaPill delta={delta} goodWhenUp={goodWhenUp} />
      </div>
    </div>
  );
}

function SkeletonTile() {
  return (
    <div className="rounded-xl bg-white/[0.03] p-5">
      <div className="flex items-center justify-between">
        <div className="h-4 w-20 animate-pulse rounded bg-zinc-800" />
        <div className="h-8 w-8 animate-pulse rounded-lg bg-zinc-800" />
      </div>
      <div className="mt-5 h-7 w-24 animate-pulse rounded bg-zinc-800" />
    </div>
  );
}

export function WebsitesOverview({
  overview,
  loading,
}: {
  overview: OverviewSums | null;
  loading?: boolean;
}) {
  if (loading || !overview) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonTile key={i} />
        ))}
      </div>
    );
  }

  const { pageviews, visitors, visits, bounces, totaltime, prev } = overview;
  const bounceRate = visits ? (bounces / visits) * 100 : 0;
  const prevBounceRate = prev.visits ? (prev.bounces / prev.visits) * 100 : 0;
  const avgTime = visits ? totaltime / visits : 0;
  const prevAvgTime = prev.visits ? prev.totaltime / prev.visits : 0;

  const tiles: {
    icon: LucideIcon;
    label: string;
    value: string;
    delta: number | null;
    goodWhenUp: boolean;
  }[] = [
    {
      icon: Users,
      label: 'Visitors',
      value: formatLongNumber(visitors),
      delta: pctChange(visitors, prev.visitors),
      goodWhenUp: true,
    },
    {
      icon: Eye,
      label: 'Pageviews',
      value: formatLongNumber(pageviews),
      delta: pctChange(pageviews, prev.pageviews),
      goodWhenUp: true,
    },
    {
      icon: Undo2,
      label: 'Bounce rate',
      value: `${Math.round(bounceRate)}%`,
      delta: pctChange(bounceRate, prevBounceRate),
      goodWhenUp: false,
    },
    {
      icon: Clock,
      label: 'Avg. visit time',
      value: fmtDuration(avgTime),
      delta: pctChange(avgTime, prevAvgTime),
      goodWhenUp: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {tiles.map(t => (
        <Tile key={t.label} {...t} />
      ))}
    </div>
  );
}
