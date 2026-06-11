'use client';

import { useEffect, useMemo, useState } from 'react';
import { Crosshair, Loader2, Globe, ChevronDown, Info } from 'lucide-react';
import {
  useClickMapQuery,
  useWebsiteValuesQuery,
  useDateRange,
  type ClickMapCohort,
  type ClickMapElement,
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

// One plain-English line explaining what each cohort's clicks tell you.
const COHORT_CONTEXT: Record<ClickMapCohort, string> = {
  all: 'Clicks from everyone who visited this page.',
  paid: 'Where your paying customers clicked on this page.',
  trial: 'Where trial users clicked — compare with Paid to see what converts.',
  non_buyer: 'Where visitors who never paid clicked — look for distractions or dead ends.',
  refunded: 'Where refunded customers clicked before churning.',
  high_ltv: 'Where your highest-value customers focused their attention.',
  abandoner: 'Where checkout abandoners clicked before dropping off.',
};

const money = (minor: number, currency: string) => formatMinorCurrency(minor, currency);

// Page-silhouette geometry: median page-depth (0=top..100=bottom) → px in a fixed strip.
const STRIP_H = 256;
const PAD = 8;
const USABLE = STRIP_H - PAD * 2;
const LABEL_H = 24; // min vertical gap between de-collided side labels
const yToPx = (m: number) => PAD + (Math.min(100, Math.max(0, m)) / 100) * USABLE;

const friendly = (e: ClickMapElement) => (e.label?.trim() ? e.label.trim() : e.selector);

function depthBand(m?: number | null) {
  if (m == null) return null;
  if (m < 20) return 'Top';
  if (m < 40) return 'Upper';
  if (m < 60) return 'Middle';
  if (m < 80) return 'Lower';
  return 'Bottom';
}

// Revenue-weighted, cohort-segmented click map for one page. Privacy-first: clicks
// placed by coarse page-depth (the tracker's 0–100 `y`) and by element — never pixels
// or screenshots. The page silhouette shows WHERE on the page people click; the list
// shows WHAT they click, label-first.
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

  const { data, isLoading } = useClickMapQuery(websiteId, urlPath, cohort);

  const currency = data?.currency || 'USD';
  const depth = data?.depth || [];
  const total = data?.total.clicks || 0;
  const cohortLabel = COHORTS.find(c => c.id === cohort)?.label || 'All visitors';
  const hasAnything = total > 0;

  // List order follows the sort toggle.
  const elements = useMemo(() => {
    const list = [...(data?.elements || [])];
    list.sort((a, b) => (sortBy === 'revenue' ? b.revenue - a.revenue : b.clicks - a.clicks));
    return list;
  }, [data, sortBy]);
  const listMax = Math.max(1, ...elements.map(e => e.clicks));

  // The strip is always clicks-ranked (stable regardless of the list's sort toggle),
  // and only includes elements with a known page position.
  const strip = useMemo(
    () =>
      [...(data?.elements || [])]
        .filter(e => e.medianY != null)
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 8),
    [data],
  );
  const stripMax = Math.max(1, ...strip.map(e => e.clicks));

  // Place dots at true depth; nudge the SIDE LABELS downward so they don't overlap.
  const placed = useMemo(() => {
    const items = strip.map((e, i) => ({ e, i, dotY: yToPx(e.medianY as number), labelY: 0 }));
    let last = -Infinity;
    for (const it of [...items].sort((a, b) => a.dotY - b.dotY)) {
      let y = it.dotY;
      if (y < last + LABEL_H) y = last + LABEL_H;
      y = Math.min(y, STRIP_H - 10);
      last = y;
      items[it.i].labelY = y;
    }
    return items;
  }, [strip]);

  const topByClicks = useMemo(
    () => [...(data?.elements || [])].sort((a, b) => b.clicks - a.clicks)[0],
    [data],
  );

  // Headline region from the depth buckets (top third / middle / lower half).
  const topThird = depth.slice(0, 3).reduce((s, d) => s + d.clicks, 0);
  const midThird = depth.slice(3, 7).reduce((s, d) => s + d.clicks, 0);
  const lowPart = total - topThird - midThird;
  const region =
    total === 0
      ? null
      : topThird >= midThird && topThird >= lowPart
        ? 'top third of the page'
        : lowPart >= midThird
          ? 'lower half of the page'
          : 'middle of the page';

  // No pages at all → the site hasn't gathered autocapture clicks yet.
  if (!pages.length && !urlPath) {
    return (
      <TabEmptyState
        icon={Crosshair}
        title="No click data yet"
        description="Turn on Autocapture (on by default) and let visitors click around. The click map shows where each buyer cohort clicks — by page position and by element — weighted by revenue."
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
      ) : !hasAnything ? (
        <div className="space-y-4 p-7">
          <div className="text-xs text-muted-foreground">{COHORT_CONTEXT[cohort]}</div>
          <div className="rounded-lg border border-dashed border-[hsl(0,0%,14%)] px-4 py-10 text-center text-sm text-muted-foreground">
            No clicks recorded for{' '}
            <span className="text-foreground">{cohortLabel.toLowerCase()}</span> on this page in
            this date range.
            <div className="mt-1 text-muted-foreground/70">
              Try “All visitors”, a different page, or a wider date range.
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-5 p-7">
          {/* Headline + cohort context */}
          <div>
            <div className="text-sm leading-relaxed text-foreground">
              Most clicks land in the <span className="font-semibold text-[#b7b4e4]">{region}</span>
              {topByClicks ? (
                <>
                  {' '}
                  · Top element: <span className="font-semibold">{friendly(topByClicks)}</span> (
                  {topByClicks.clicks} click{topByClicks.clicks === 1 ? '' : 's'})
                </>
              ) : null}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{COHORT_CONTEXT[cohort]}</div>
          </div>

          {/* Summary */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
            <span className="text-muted-foreground">
              <span className="font-semibold text-foreground">{total.toLocaleString()}</span> clicks
              ·{' '}
              <span className="font-semibold text-foreground">
                {(data?.total.sessions || 0).toLocaleString()}
              </span>{' '}
              visitors
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

          {total < 20 && (
            <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground/70">
              <Info className="mt-0.5 h-3 w-3 shrink-0" />
              Early data — only {total} click{total === 1 ? '' : 's'} so far. Depths and shares may
              shift as more come in.
            </p>
          )}

          {/* Where people click — page silhouette */}
          {strip.length > 0 ? (
            <div>
              <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/60">
                Where people click
              </div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground/40">
                Top of page
              </div>
              <div className="flex gap-1">
                <div
                  className="relative w-[150px] shrink-0 rounded-2xl border border-[hsl(0,0%,16%)] bg-gradient-to-b from-[hsl(0,0%,10%)] to-[hsl(0,0%,8.5%)]"
                  style={{ height: STRIP_H }}
                >
                  <div className="absolute inset-x-3 top-1/2 h-px bg-white/5" />
                  {placed.map(({ e, i, dotY }) => {
                    const size = 8 + 20 * Math.sqrt(e.clicks / stripMax);
                    const rev = e.revenue > 0;
                    const off = ((i % 3) - 1) * 16;
                    return (
                      <div
                        key={e.selector}
                        className="absolute rounded-full"
                        title={`${friendly(e)} · ${e.clicks} clicks${
                          rev ? ` · ${money(e.revenue, currency)}` : ''
                        }`}
                        style={{
                          left: `calc(50% + ${off}px)`,
                          top: dotY,
                          width: size,
                          height: size,
                          transform: 'translate(-50%, -50%)',
                          background: rev ? '#34d399' : '#7e7bd0',
                          opacity: 0.5 + 0.5 * (e.clicks / stripMax),
                          boxShadow: rev ? '0 0 0 4px rgba(16,185,129,.18)' : undefined,
                        }}
                      />
                    );
                  })}
                </div>
                <div className="relative flex-1" style={{ height: STRIP_H }}>
                  {placed.map(({ e, labelY }) => {
                    const rev = e.revenue > 0;
                    return (
                      <div
                        key={e.selector}
                        className="absolute left-0 right-0 flex items-center gap-2"
                        style={{ top: labelY, transform: 'translateY(-50%)' }}
                      >
                        <span className="h-px w-3 shrink-0 bg-white/10" />
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: rev ? '#34d399' : '#7e7bd0' }}
                        />
                        <span
                          className="max-w-[200px] truncate text-[13px] text-foreground"
                          title={friendly(e)}
                        >
                          {friendly(e)}
                        </span>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {e.clicks}×
                        </span>
                        {rev && (
                          <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                            {money(e.revenue, currency)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground/40">
                Bottom
              </div>
            </div>
          ) : (
            <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground/55">
              <Info className="mt-0.5 h-3 w-3 shrink-0" />
              Page positions appear once the latest tracker captures click depth. Every click still
              shows in the list below.
            </p>
          )}

          {/* What they click — ranked, label-first */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/60">
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

            <div className="divide-y divide-[hsl(0,0%,12%)] overflow-hidden rounded-lg border border-[hsl(0,0%,12%)]">
              {elements.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No element clicks yet.
                </div>
              ) : (
                elements.map(e => {
                  const band = depthBand(e.medianY);
                  const nm = friendly(e);
                  const showSel = !!e.label?.trim() && e.label.trim() !== e.selector;
                  return (
                    <div key={e.selector} className="flex items-center gap-4 px-4 py-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-foreground">{nm}</span>
                          {band ? (
                            <span className="inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/70 ring-1 ring-inset ring-[hsl(0,0%,16%)]">
                              {band}
                            </span>
                          ) : null}
                        </div>
                        {showSel ? (
                          <div className="truncate font-mono text-[11px] text-muted-foreground/50">
                            {e.selector}
                          </div>
                        ) : null}
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded bg-[hsl(0,0%,11%)]">
                          <div
                            className="h-full rounded bg-[#5e5ba4]/40"
                            style={{ width: `${Math.max(4, (e.clicks / listMax) * 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="w-14 shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
                        {e.clicks}×
                      </div>
                      <div className="w-14 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
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
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
