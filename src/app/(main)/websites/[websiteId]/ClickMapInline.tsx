'use client';

import { useEffect, useMemo, useState } from 'react';
import { Crosshair, Loader2, Globe, ChevronDown, Info } from 'lucide-react';
import {
  useClickMapQuery,
  useWebsiteValuesQuery,
  useDateRange,
  type ClickMapCohort,
} from '@/components/hooks';
import { TabEmptyState } from '@/components/common/TabEmptyState';
import { formatMinorCurrency } from '@/lib/format';

const COHORTS: { id: ClickMapCohort; label: string }[] = [
  { id: 'all', label: 'All visitors' },
  { id: 'paid', label: 'Paid' },
  { id: 'trial', label: 'Trial' },
  { id: 'non_buyer', label: 'Non-buyers' },
  { id: 'refunded', label: 'Refunded' },
  { id: 'high_ltv', label: 'High-LTV' },
  { id: 'abandoner', label: 'Abandoned' },
];

const money = (minor: number, currency: string) => formatMinorCurrency(minor, currency);

// Revenue-weighted, cohort-segmented click map for one page. Privacy-first: clicks
// bucketed by coarse page-depth (the tracker's 0–100 `y`) and by element — never
// pixels or screenshots. Read-side over autocapture clicks + revenue_event.
export function ClickMapInline({
  websiteId,
  focus,
}: {
  websiteId: string;
  focus?: { urlPath?: string; cohort?: ClickMapCohort } | null;
}) {
  const {
    dateRange: { startDate, endDate },
  } = useDateRange();

  // Top pages for the picker (real url_paths, highest traffic first).
  const { data: pageData } = useWebsiteValuesQuery({ websiteId, type: 'path', startDate, endDate });
  const pages = (pageData || []) as { value: string; count: number }[];

  const [urlPath, setUrlPath] = useState('');
  const [cohort, setCohort] = useState<ClickMapCohort>('all');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'clicks' | 'revenue'>('clicks');

  useEffect(() => {
    if (!urlPath && pages.length) setUrlPath(pages[0].value);
  }, [pages, urlPath]);

  // Seed from a deep link (e.g. the funnel leak diagnosis → "abandoners on /page").
  useEffect(() => {
    if (focus?.urlPath) setUrlPath(focus.urlPath);
    if (focus?.cohort) setCohort(focus.cohort);
  }, [focus?.urlPath, focus?.cohort]);

  const comparing = cohort !== 'all';
  const { data, isLoading } = useClickMapQuery(websiteId, urlPath, cohort);
  // Faint "all visitors" reference overlay — only fetched when a cohort is selected.
  const { data: allData } = useClickMapQuery(websiteId, comparing ? urlPath : undefined, 'all');

  const currency = data?.currency || 'USD';
  const depth = data?.depth || [];
  const allDepth = allData?.depth || [];

  const depthMax = useMemo(
    () => Math.max(1, ...depth.map(d => d.clicks), ...allDepth.map(d => d.clicks)),
    [depth, allDepth],
  );
  const dotPx = (clicks: number) => (clicks > 0 ? 6 + 22 * Math.sqrt(clicks / depthMax) : 4);

  const elements = useMemo(() => {
    const list = [...(data?.elements || [])];
    list.sort((a, b) => (sortBy === 'revenue' ? b.revenue - a.revenue : b.clicks - a.clicks));
    return list;
  }, [data, sortBy]);

  const cohortLabel = COHORTS.find(c => c.id === cohort)?.label || 'All visitors';
  const hasDepth = depth.some(d => d.clicks > 0);
  const hasAnything = (data?.total.clicks || 0) > 0;

  // No pages at all → the page hasn't gathered autocapture clicks yet.
  if (!pages.length && !urlPath) {
    return (
      <TabEmptyState
        icon={Crosshair}
        title="No click data yet"
        description="Turn on Autocapture (on by default) and let visitors click around. The click map shows where each buyer cohort clicks — by page depth and by element — weighted by revenue."
      />
    );
  }

  return (
    <div className="divide-y divide-[hsl(0,0%,12%)]">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 px-7 py-3">
        {/* Page picker */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setPickerOpen(o => !o)}
            className="flex items-center gap-2 rounded-lg border border-[hsl(0,0%,16%)] bg-[#18181b] px-3 py-1.5 text-sm text-foreground transition-colors hover:border-[#5e5ba4]/50"
          >
            <Globe className="h-3.5 w-3.5 text-[#8b88cf]" />
            <span className="max-w-[240px] truncate">{urlPath || 'Select a page'}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60" />
          </button>
          {pickerOpen && (
            <>
              <button
                type="button"
                aria-hidden
                onClick={() => setPickerOpen(false)}
                className="fixed inset-0 z-10 cursor-default"
              />
              <div className="absolute left-0 z-20 mt-1 max-h-72 w-80 overflow-y-auto rounded-lg border border-[hsl(0,0%,14%)] bg-[hsl(0,0%,10%)] py-1 shadow-xl">
                {pages.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => {
                      setUrlPath(p.value);
                      setPickerOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-[hsl(0,0%,13%)] ${
                      p.value === urlPath ? 'text-foreground' : 'text-foreground/80'
                    }`}
                  >
                    <span className="min-w-0 truncate">{p.value}</span>
                    <span className="shrink-0 text-xs text-muted-foreground/70">
                      {p.count.toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Cohort switcher */}
        <div className="flex flex-wrap items-center gap-1">
          {COHORTS.map(c => {
            const active = c.id === cohort;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCohort(c.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-[#5e5ba4]/15 text-foreground ring-1 ring-inset ring-[#5e5ba4]/25'
                    : 'text-muted-foreground hover:bg-[hsl(0,0%,11%)] hover:text-foreground'
                }`}
              >
                {c.label}
                {c.id === 'trial' && active && data?.estimated ? (
                  <span className="ml-1 text-[10px] text-muted-foreground/70">est.</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="space-y-5 p-7">
          {/* Cohort summary */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
            <span className="font-semibold text-foreground">{cohortLabel}</span>
            <span className="text-muted-foreground">
              {data?.total.sessions || 0} visitors · {data?.total.clicks || 0} clicks
            </span>
            {(data?.total.revenue || 0) > 0 && (
              <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-sm font-semibold text-emerald-300">
                {money(data!.total.revenue, currency)}
              </span>
            )}
            {cohort === 'trial' && data?.estimated && (
              <span
                className="inline-flex items-center gap-1 text-xs text-muted-foreground/70"
                title="Trial blends visitors you tag via conclick.identify(id, { plan: 'trial' }) with an inferred fallback: identified visitors who haven't paid. Tag plan explicitly for exact numbers."
              >
                <Info className="h-3 w-3" /> estimated
              </span>
            )}
          </div>

          {!hasAnything ? (
            <div className="rounded-lg border border-dashed border-[hsl(0,0%,14%)] px-4 py-10 text-center text-sm text-muted-foreground">
              No clicks recorded for{' '}
              <span className="text-foreground">{cohortLabel.toLowerCase()}</span> on this page in
              this date range.
            </div>
          ) : (
            <>
              {/* Dotted page-depth distribution */}
              <div className="rounded-lg border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,9%)] p-4">
                <div className="mb-3 flex items-center gap-4 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#7e7bd0]" /> {cohortLabel}
                  </span>
                  {comparing && (
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full border border-[#8b88cf]/60" /> All
                      visitors
                    </span>
                  )}
                  <span className="ml-auto uppercase tracking-wide text-muted-foreground/50">
                    Page depth · top → bottom
                  </span>
                </div>

                <div className="space-y-0.5">
                  {depth.map((d, i) => {
                    const lo = i * 10;
                    const hi = lo + 10;
                    const ad = allDepth[i];
                    const px = dotPx(d.clicks);
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-3"
                        title={`${lo}–${hi}% down · ${d.clicks} clicks · ${d.sessions} visitors${
                          d.revenue > 0 ? ` · ${money(d.revenue, currency)}` : ''
                        }`}
                      >
                        <div className="w-12 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground/50">
                          {lo}–{hi}%
                        </div>
                        <div className="flex h-7 flex-1 items-center gap-5">
                          <span className="flex w-7 shrink-0 justify-center">
                            <span
                              className="rounded-full bg-[#7e7bd0]"
                              style={{
                                width: px,
                                height: px,
                                opacity: d.clicks > 0 ? 0.5 + 0.5 * (d.clicks / depthMax) : 0.12,
                              }}
                            />
                          </span>
                          {comparing && (
                            <span className="flex w-7 shrink-0 justify-center">
                              <span
                                className="rounded-full border border-[#8b88cf]/35"
                                style={{
                                  width: dotPx(ad?.clicks || 0),
                                  height: dotPx(ad?.clicks || 0),
                                }}
                              />
                            </span>
                          )}
                          {d.revenue > 0 && (
                            <span className="text-[11px] font-medium text-emerald-300/90">
                              {money(d.revenue, currency)}
                            </span>
                          )}
                        </div>
                        <div className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                          {d.clicks || ''}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {!hasDepth && (
                  <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground/70">
                    <Info className="mt-0.5 h-3 w-3 shrink-0" />
                    Page-depth fills in from clicks captured by the latest tracker. Earlier clicks
                    still appear in the element list below.
                  </p>
                )}
              </div>

              {/* Top elements */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                    What {cohortLabel.toLowerCase()} click
                  </div>
                  <div className="flex items-center gap-1 text-[11px]">
                    <span className="text-muted-foreground/50">Sort</span>
                    {(['clicks', 'revenue'] as const).map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSortBy(s)}
                        className={`rounded px-1.5 py-0.5 transition-colors ${
                          sortBy === s
                            ? 'bg-[#5e5ba4]/15 text-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {s === 'clicks' ? 'Clicks' : 'Revenue'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg border border-[hsl(0,0%,12%)] divide-y divide-[hsl(0,0%,12%)]">
                  {elements.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                      No element clicks yet.
                    </div>
                  ) : (
                    elements.map(e => (
                      <div key={e.selector} className="flex items-center gap-4 px-4 py-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-mono text-xs text-foreground">
                            {e.selector}
                          </div>
                          {e.label ? (
                            <div className="truncate text-xs text-muted-foreground">
                              “{e.label}”
                            </div>
                          ) : null}
                        </div>
                        <div className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
                          {e.clicks}×
                        </div>
                        <div className="w-16 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                          {e.sessions} vis
                        </div>
                        <div className="w-24 shrink-0 text-right">
                          {e.revenue > 0 ? (
                            <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-sm font-semibold text-emerald-300">
                              {money(e.revenue, currency)}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground/40">—</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
