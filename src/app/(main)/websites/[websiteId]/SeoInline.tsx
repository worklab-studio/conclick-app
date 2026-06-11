'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Search, TrendingUp, TrendingDown, ArrowUp, Lightbulb, Loader2, Info } from 'lucide-react';
import { useApi, useDateParameters, useNavigation } from '@/components/hooks';
import { TabEmptyState } from '@/components/common/TabEmptyState';

// SEO tab — live Google Search Console data for the dashboard date range:
// summary chips (clicks/impressions/CTR/position with deltas), top queries,
// top pages, and an "opportunity" callout (high impressions stuck on page 2).

interface SeoRow {
  query?: string;
  page?: string;
  clicks: number;
  impressions: number;
  ctr?: number;
  position: number;
}

interface SeoData {
  connected: boolean;
  siteUrl?: string;
  totals?: SeoRow;
  prevTotals?: SeoRow;
  queries?: SeoRow[];
  pages?: SeoRow[];
}

const fmt = (n: number) =>
  n >= 10000 ? `${(n / 1000).toFixed(1)}K` : Math.round(n).toLocaleString();

function Chip({
  label,
  value,
  delta,
  betterWhenDown = false,
}: {
  label: string;
  value: string;
  delta: number | null;
  betterWhenDown?: boolean;
}) {
  const good = delta != null && (betterWhenDown ? delta < 0 : delta > 0);
  return (
    <div className="rounded-xl border border-[hsl(0,0%,16%)] bg-[hsl(0,0%,9%)] px-4 py-3.5">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground/60">{label}</div>
      <div className="mt-1 text-2xl font-bold tracking-tight">{value}</div>
      {delta != null && delta !== 0 ? (
        <div
          className={`mt-0.5 inline-flex items-center gap-1 text-[11.5px] ${
            good ? 'text-emerald-400' : 'text-red-400'
          }`}
        >
          {delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {delta > 0 ? '+' : ''}
          {delta}%
        </div>
      ) : null}
    </div>
  );
}

export function SeoInline({ websiteId }: { websiteId: string }) {
  const { get, useQuery } = useApi();
  const { startAt, endAt } = useDateParameters();
  // The tab is hidden on public shares, but never render an owner-settings CTA
  // there even if this component is reached some other way.
  const isShare = useNavigation().pathname?.includes('/share/');

  const { data, isLoading, error } = useQuery<SeoData>({
    queryKey: ['websites:seo', { websiteId, startAt, endAt }],
    queryFn: () => get(`/websites/${websiteId}/seo`, { startAt, endAt }),
    enabled: !!websiteId,
    retry: false,
  });

  const queries = data?.queries || [];
  const pages = data?.pages || [];
  const maxQ = Math.max(1, ...queries.map(q => q.clicks));
  const maxP = Math.max(1, ...pages.map(p => p.clicks));

  // Opportunity: most impressions among queries stranded just off page 1.
  const opportunity = useMemo(
    () =>
      [...queries]
        .filter(q => q.position > 10 && q.position <= 20 && q.impressions >= 100)
        .sort((a, b) => b.impressions - a.impressions)[0] || null,
    [queries],
  );

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading Search Console…
      </div>
    );
  }

  if (error || !data || !data.connected) {
    return (
      <TabEmptyState
        icon={Search}
        title="Connect Google Search Console"
        description="See the queries that bring you Google traffic — clicks, impressions, CTR and position — right next to your analytics. Connect Google in this website's settings and pick your Search Console property."
        action={
          isShare ? undefined : (
            <Link
              href={`/websites/${websiteId}/settings#google`}
              className="inline-flex items-center gap-2 rounded-lg bg-[#5e5ba4] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#5e5ba4]/90"
            >
              <Search className="h-4 w-4" /> Open settings
            </Link>
          )
        }
      />
    );
  }

  const t = data.totals!;
  const p = data.prevTotals!;
  const pct = (cur: number, prev: number) =>
    prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null;

  return (
    <div className="space-y-5 p-7">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Chip label="Clicks" value={fmt(t.clicks)} delta={pct(t.clicks, p.clicks)} />
        <Chip
          label="Impressions"
          value={fmt(t.impressions)}
          delta={pct(t.impressions, p.impressions)}
        />
        <Chip
          label="CTR"
          value={`${((t.ctr || 0) * 100).toFixed(1)}%`}
          delta={p.ctr ? Math.round(((t.ctr || 0) - p.ctr) * 1000) / 10 : null}
        />
        <Chip
          label="Avg position"
          value={(t.position || 0).toFixed(1)}
          delta={p.position ? Math.round((t.position - p.position) * 10) / 10 : null}
          betterWhenDown
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr,1fr]">
        {/* Top queries */}
        <div>
          <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/60">
            Top queries
          </div>
          <div className="divide-y divide-[hsl(0,0%,12%)] overflow-hidden rounded-lg border border-[hsl(0,0%,12%)]">
            <div className="flex items-center gap-3 bg-[hsl(0,0%,9.5%)] px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">
              <span className="flex-1">Query</span>
              <span className="w-14 text-right">Clicks</span>
              <span className="w-14 text-right">Impr.</span>
              <span className="w-12 text-right">CTR</span>
              <span className="w-11 text-right">Pos</span>
            </div>
            {queries.slice(0, 12).map(q => (
              <div key={q.query} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-foreground">{q.query}</span>
                  <span className="mt-1 block h-1 overflow-hidden rounded bg-[hsl(0,0%,11%)]">
                    <span
                      className="block h-full rounded bg-[#5e5ba4]/55"
                      style={{ width: `${Math.max(3, (q.clicks / maxQ) * 100)}%` }}
                    />
                  </span>
                </span>
                <span className="w-14 text-right font-semibold tabular-nums">{fmt(q.clicks)}</span>
                <span className="w-14 text-right text-xs tabular-nums text-muted-foreground">
                  {fmt(q.impressions)}
                </span>
                <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">
                  {((q.ctr || 0) * 100).toFixed(1)}%
                </span>
                <span className="w-11 text-right text-xs font-semibold tabular-nums text-[#b7b4e4]">
                  {q.position.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 flex items-start gap-1.5 text-[11px] text-muted-foreground/55">
            <Info className="mt-0.5 h-3 w-3 shrink-0" />
            Live from Google Search Console · {data.siteUrl} · matches the dashboard date range.
          </p>
        </div>

        {/* Top pages + opportunity */}
        <div>
          <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/60">
            Top pages in search
          </div>
          <div className="divide-y divide-[hsl(0,0%,12%)] overflow-hidden rounded-lg border border-[hsl(0,0%,12%)]">
            {pages.slice(0, 8).map(pg => (
              <div key={pg.page} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-foreground">{pg.page}</span>
                  <span className="mt-1 block h-1 overflow-hidden rounded bg-[hsl(0,0%,11%)]">
                    <span
                      className="block h-full rounded bg-[#5e5ba4]/55"
                      style={{ width: `${Math.max(3, (pg.clicks / maxP) * 100)}%` }}
                    />
                  </span>
                </span>
                <span className="w-14 text-right font-semibold tabular-nums">{fmt(pg.clicks)}</span>
                <span className="w-11 text-right text-xs font-semibold tabular-nums text-[#b7b4e4]">
                  {pg.position.toFixed(1)}
                </span>
              </div>
            ))}
          </div>

          {opportunity ? (
            <div className="mt-4 flex gap-2.5 rounded-xl border border-amber-500/35 bg-amber-500/[0.07] px-4 py-3 text-[12.5px] leading-relaxed text-amber-200">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <span>
                <span className="font-semibold text-amber-100">Opportunity:</span> “
                {opportunity.query}” gets{' '}
                <span className="font-semibold text-amber-100">
                  {fmt(opportunity.impressions)} impressions
                </span>{' '}
                at position {opportunity.position.toFixed(1)} —{' '}
                <ArrowUp className="inline h-3 w-3" /> one spot onto page 1 could multiply those{' '}
                {fmt(opportunity.clicks)} clicks.
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
