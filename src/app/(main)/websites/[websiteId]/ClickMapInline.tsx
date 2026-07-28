'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Crosshair,
  Loader2,
  Globe,
  ChevronDown,
  Info,
  Lock,
  RefreshCw,
  Filter,
} from 'lucide-react';
import {
  useClickMapQuery,
  useWebsiteQuery,
  useWebsiteValuesQuery,
  useDateRange,
  useApi,
  type ClickMapCohort,
  type ClickMapElement,
} from '@/components/hooks';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { FunnelBuilder } from './(reports)/funnels/FunnelBuilder';
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

const friendly = (e: ClickMapElement) => (e.label?.trim() ? e.label.trim() : e.selector);

function depthBand(m?: number | null) {
  if (m == null) return null;
  if (m < 20) return 'Top';
  if (m < 40) return 'Upper';
  if (m < 60) return 'Middle';
  if (m < 80) return 'Lower';
  return 'Bottom';
}

// Heat gradient by intensity tier (t = clicks / max).
function heatGradient(t: number, hasRevenue: boolean) {
  if (hasRevenue && t >= 0.5)
    return 'radial-gradient(circle, rgba(255,60,30,.78) 0%, rgba(255,140,40,.5) 38%, rgba(255,170,40,.22) 62%, transparent 78%)';
  if (t >= 0.66)
    return 'radial-gradient(circle, rgba(255,60,30,.72) 0%, rgba(255,140,40,.46) 40%, transparent 76%)';
  if (t >= 0.33)
    return 'radial-gradient(circle, rgba(255,150,45,.6) 0%, rgba(255,185,60,.3) 48%, transparent 76%)';
  return 'radial-gradient(circle, rgba(180,150,210,.5) 0%, rgba(150,130,210,.24) 50%, transparent 78%)';
}

function relativeTime(iso?: string) {
  if (!iso) return '';
  const mins = Math.max(0, Math.round((Date.now() - +new Date(iso)) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`;
  return new Date(iso).toLocaleDateString();
}

interface SnapshotBox {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface Snapshot {
  ok: boolean;
  reason?: string;
  width: number;
  height: number;
  image: string;
  boxes: Record<string, SnapshotBox>;
  capturedAt: string;
}

// Revenue-weighted, cohort-segmented click map for one page — your real page as the
// canvas. The server snapshots the page (day-cached) and measures each clicked
// element's exact box from the tracker's stored selector, so heat sits on the real
// buttons. Click a hotspot for the numbers. Privacy-first: only the OWNER's public
// page is rendered — never visitor screens.
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
  const { post, useQuery } = useApi();

  // Top pages for the picker (real url_paths, highest traffic first).
  const { data: pageData } = useWebsiteValuesQuery({ websiteId, type: 'path', startDate, endDate });
  const pages = (pageData || []) as { value: string; count: number }[];

  const [urlPath, setUrlPath] = useState('');
  const [cohort, setCohort] = useState<ClickMapCohort>('all');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'clicks' | 'revenue'>('clicks');
  const [selected, setSelected] = useState<string | null>(null);
  const [funnelFor, setFunnelFor] = useState<ClickMapElement | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!urlPath && pages.length) setUrlPath(pages[0].value);
  }, [pages, urlPath]);

  // Seed from a deep link (e.g. the funnel leak diagnosis → "abandoners on /page").
  useEffect(() => {
    if (focus?.urlPath) setUrlPath(focus.urlPath);
    if (focus?.cohort) setCohort(focus.cohort);
  }, [focus?.urlPath, focus?.cohort]);

  useEffect(() => {
    setSelected(null);
  }, [urlPath, cohort]);

  const { data, isLoading, error } = useClickMapQuery(websiteId, urlPath, cohort);

  const currency = data?.currency || 'USD';
  const depth = data?.depth || [];
  const total = data?.total.clicks || 0;
  const cohortLabel = COHORTS.find(c => c.id === cohort)?.label || 'All visitors';
  const hasAnything = total > 0;
  const revLocked = !!data && !data.hasRevenueData;

  // List order follows the sort toggle; the heatmap is always clicks-ranked.
  const elements = useMemo(() => {
    const list = [...(data?.elements || [])];
    list.sort((a, b) => (sortBy === 'revenue' ? b.revenue - a.revenue : b.clicks - a.clicks));
    return list;
  }, [data, sortBy]);
  const listMax = Math.max(1, ...elements.map(e => e.clicks));

  const byClicks = useMemo(
    () => [...(data?.elements || [])].sort((a, b) => b.clicks - a.clicks),
    [data],
  );
  const topByClicks = byClicks[0];

  const targets = useMemo(
    () => byClicks.slice(0, 40).map(e => ({ selector: e.selector, text: e.label })),
    [byClicks],
  );

  // ---- LIVE mode: the real page in an iframe, heat overlaid on top ---------
  // Our tracker runs inside the customer's page. Loaded with ?conclick_hm=1
  // it records nothing and instead streams element boxes + scroll offsets via
  // postMessage — zero capture latency, always-current pixels, scrollable.
  // If the handshake doesn't arrive (site blocks framing / old cached
  // tracker), we fall back to the server screenshot automatically.
  const { data: website } = useWebsiteQuery(websiteId);
  const domain = (website?.domain || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [liveStatus, setLiveStatus] = useState<'connecting' | 'on' | 'off'>('connecting');
  const [liveDoc, setLiveDoc] = useState<{
    boxes: Record<string, SnapshotBox>;
    width: number;
    height: number;
  }>({ boxes: {}, width: 0, height: 0 });
  const [liveScrollY, setLiveScrollY] = useState(0);

  const liveUrl =
    domain && urlPath
      ? `https://${domain}${urlPath}${urlPath.includes('?') ? '&' : '?'}conclick_hm=1`
      : null;

  // New page → new handshake.
  useEffect(() => {
    setLiveStatus('connecting');
    setLiveDoc({ boxes: {}, width: 0, height: 0 });
    setLiveScrollY(0);
  }, [liveUrl]);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d: any = e.data;
      if (!d || !d.__conclick) return;
      if (d.type === 'ready') {
        iframeRef.current?.contentWindow?.postMessage(
          { __conclick: 1, type: 'hello', targets },
          '*',
        );
      } else if (d.type === 'boxes') {
        setLiveStatus('on');
        setLiveDoc({ boxes: d.boxes || {}, width: d.width || 0, height: d.height || 0 });
        if (typeof d.scrollY === 'number') setLiveScrollY(d.scrollY);
      } else if (d.type === 'scroll') {
        setLiveScrollY(Number(d.y) || 0);
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [targets]);

  // Re-request boxes when the cohort's target list changes mid-session.
  useEffect(() => {
    if (liveStatus === 'on') {
      iframeRef.current?.contentWindow?.postMessage({ __conclick: 1, type: 'hello', targets }, '*');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targets, liveStatus]);

  // No handshake within 12s → screenshot fallback. (The tracker announces as
  // soon as it executes, but a slow origin still needs headroom.)
  useEffect(() => {
    if (!liveUrl || liveStatus !== 'connecting') return;
    const t = setTimeout(() => setLiveStatus(s => (s === 'connecting' ? 'off' : s)), 12000);
    return () => clearTimeout(t);
  }, [liveUrl, liveStatus]);

  const liveOn = liveStatus === 'on' && liveDoc.width > 0 && liveDoc.height > 0;

  // ---- Screenshot fallback (server-captured, day-cached, cohort-free key) --
  const snapQuery = useQuery<Snapshot>({
    queryKey: ['click-map-snapshot', { websiteId, urlPath, refreshKey }],
    queryFn: () =>
      post(`/websites/${websiteId}/page-snapshot`, {
        path: urlPath,
        targets,
        refresh: refreshKey > 0,
      }),
    enabled: !!websiteId && !!urlPath && targets.length > 0 && liveStatus === 'off',
    staleTime: Infinity,
    retry: false,
  });
  const snap = snapQuery.data?.ok ? snapQuery.data : null;
  const snapLoading = liveStatus === 'off' && (snapQuery.isLoading || snapQuery.isFetching);
  const snapFailed =
    liveStatus === 'off' && !snapLoading && (snapQuery.isError || snapQuery.data?.ok === false);

  // One geometry source for the heat math, whichever mode is active.
  const activeDoc = liveOn
    ? { width: liveDoc.width, height: liveDoc.height, boxes: liveDoc.boxes }
    : snap
      ? { width: snap.width, height: snap.height, boxes: snap.boxes }
      : null;

  // Heat markers: only elements actually located (measured, not guessed) —
  // by the live bridge or the snapshot, whichever is active.
  const heat = useMemo(() => {
    if (!activeDoc) return [];
    const max = Math.max(1, ...byClicks.map(e => e.clicks));
    return byClicks
      .map(e => ({ e, box: activeDoc.boxes[e.selector] }))
      .filter(({ box }) => box && box.y < activeDoc.height)
      .map(({ e, box }) => {
        const t = e.clicks / max;
        return {
          e,
          t,
          cx: ((box.x + box.w / 2) / activeDoc.width) * 100,
          cy: ((box.y + box.h / 2) / activeDoc.height) * 100,
          bottom: (Math.min(box.y + box.h, activeDoc.height) / activeDoc.height) * 100,
          top: (box.y / activeDoc.height) * 100,
          d: ((56 + 70 * Math.sqrt(t)) / activeDoc.width) * 100, // blob diameter, % of width
        };
      });
  }, [activeDoc, byClicks]);
  const unplaced = activeDoc ? byClicks.filter(e => !activeDoc.boxes[e.selector]).length : 0;
  const selectedHeat = heat.find(h => h.e.selector === selected) || null;

  // Headline: median click depth from the depth buckets (only clicks with a tracked
  // position) — so the words always agree with where the heat actually sits.
  const depthTotal = depth.reduce((s, d) => s + d.clicks, 0);
  let region: string | null = null;
  if (depthTotal > 0) {
    let acc = 0;
    let medianDepth = 95;
    for (const d of depth) {
      acc += d.clicks;
      if (acc >= depthTotal / 2) {
        medianDepth = d.bucket * 10 + 5;
        break;
      }
    }
    region =
      medianDepth <= 30
        ? 'top of the page'
        : medianDepth <= 65
          ? 'middle of the page'
          : 'bottom of the page';
  }

  // Heat overlay nodes — identical in live and snapshot mode (positions are
  // percentages of the active document geometry). pointer-events-auto on the
  // interactive bits because the live overlay container is pointer-events-none
  // (the iframe underneath must stay scrollable).
  const overlay = (
    <>
      {heat.map(h => (
        <div
          key={`blob-${h.e.selector}`}
          className="pointer-events-none absolute aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            left: `${h.cx}%`,
            top: `${h.cy}%`,
            width: `${h.d}%`,
            background: heatGradient(h.t, h.e.revenue > 0),
          }}
        />
      ))}
      {heat.map(h => (
        <button
          key={`badge-${h.e.selector}`}
          type="button"
          onClick={ev => {
            ev.stopPropagation();
            setSelected(s => (s === h.e.selector ? null : h.e.selector));
          }}
          className={`pointer-events-auto absolute -translate-x-1/2 rounded-full border px-2 py-0.5 text-[11px] font-bold tabular-nums text-white shadow-lg transition-transform hover:scale-110 ${
            h.e.revenue > 0 ? 'border-emerald-500/50' : 'border-[hsl(0,0%,26%)]'
          } bg-[hsl(0,0%,7%)]/95`}
          style={{ left: `${h.cx}%`, top: `${h.bottom}%`, marginTop: 6 }}
        >
          {h.e.clicks}×
          {h.e.revenue > 0 ? (
            <span className="ml-1.5 font-semibold text-emerald-300">
              {money(h.e.revenue, currency)}
            </span>
          ) : null}
        </button>
      ))}
      {selectedHeat ? (
        <div
          className="pointer-events-auto absolute z-10 w-[260px] rounded-xl border border-[hsl(0,0%,22%)] bg-[hsl(0,0%,9%)]/[.98] p-3.5 shadow-2xl"
          style={{
            left: `${Math.min(Math.max(selectedHeat.cx, 14), 86)}%`,
            top: selectedHeat.bottom < 72 ? `${selectedHeat.bottom}%` : `${selectedHeat.top}%`,
            transform:
              selectedHeat.bottom < 72
                ? 'translate(-50%, 34px)'
                : 'translate(-50%, calc(-100% - 14px))',
          }}
          onClick={ev => ev.stopPropagation()}
        >
          <div className="text-[13px] font-semibold text-foreground">
            {friendly(selectedHeat.e)}
          </div>
          <div className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground/50">
            {selectedHeat.e.selector}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground/50">
                Clicks
              </div>
              <div className="text-[15px] font-bold tabular-nums">{selectedHeat.e.clicks}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground/50">
                Visitors
              </div>
              <div className="text-[15px] font-bold tabular-nums">{selectedHeat.e.sessions}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground/50">
                Revenue
              </div>
              <div
                className={`text-[15px] font-bold tabular-nums ${
                  selectedHeat.e.revenue > 0 ? 'text-emerald-300' : 'text-muted-foreground/40'
                }`}
              >
                {selectedHeat.e.revenue > 0 ? money(selectedHeat.e.revenue, currency) : '—'}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground/50">
                Share of clicks
              </div>
              <div className="text-[15px] font-bold tabular-nums">
                {total ? Math.round((selectedHeat.e.clicks / total) * 100) : 0}%
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-[hsl(0,0%,13%)] pt-2.5 text-[11px] text-muted-foreground/60">
            <span>{depthBand(selectedHeat.e.medianY) || '—'} of page</span>
            {selectedHeat.e.label?.trim() ? (
              <button
                type="button"
                onClick={() => setFunnelFor(selectedHeat.e)}
                className="inline-flex items-center gap-1 text-[#b7b4e4] transition-colors hover:text-foreground"
              >
                <Filter className="h-3 w-3" /> Funnel to this →
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );

  // No pages at all → the site hasn't gathered autocapture clicks yet.
  if (!pages.length && !urlPath) {
    return (
      <TabEmptyState
        icon={Crosshair}
        title="No click data yet"
        description="Turn on Autocapture (on by default) and let visitors click around. The click map paints real click data onto a snapshot of your page — by element and buyer cohort, weighted by revenue."
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

        {/* Cohort switcher — buyer cohorts lock until payment data exists */}
        <div className="flex flex-wrap items-center gap-1">
          {COHORTS.map(c => {
            const active = c.id === cohort;
            const locked = revLocked && c.id !== 'all';
            return (
              <button
                key={c.id}
                type="button"
                disabled={locked && !active}
                onClick={() => setCohort(c.id)}
                title={locked ? 'Unlocks when payments are connected' : undefined}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-[#5e5ba4]/15 text-foreground ring-1 ring-inset ring-[#5e5ba4]/25'
                    : locked
                      ? 'cursor-not-allowed text-muted-foreground/40'
                      : 'text-muted-foreground hover:bg-[hsl(0,0%,11%)] hover:text-foreground'
                }`}
              >
                {locked ? <Lock className="h-2.5 w-2.5" /> : null}
                {c.label}
                {c.id === 'trial' && active && data?.estimated ? (
                  <span className="text-[10px] text-muted-foreground/70">est.</span>
                ) : null}
              </button>
            );
          })}
          {revLocked ? (
            <span className="ml-1 text-[11px] text-muted-foreground/50">
              Buyer cohorts unlock when payments are connected
            </span>
          ) : null}
        </div>
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : error ? (
        <div className="p-7 text-sm text-muted-foreground">
          Couldn&apos;t load click data — try refreshing the page.
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
          {/* Headline + cohort context + summary */}
          <div>
            <div className="text-sm leading-relaxed text-foreground">
              {region ? (
                <>
                  Most clicks land near the{' '}
                  <span className="font-semibold text-[#b7b4e4]">{region}</span>
                </>
              ) : (
                'Click activity on this page'
              )}
              {topByClicks ? (
                <>
                  {' '}
                  · Hottest element: <span className="font-semibold">
                    {friendly(topByClicks)}
                  </span>{' '}
                  ({topByClicks.clicks} click{topByClicks.clicks === 1 ? '' : 's'})
                </>
              ) : null}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{COHORT_CONTEXT[cohort]}</div>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
              <span className="text-muted-foreground">
                <span className="font-semibold text-foreground">{total.toLocaleString()}</span>{' '}
                clicks ·{' '}
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
              {total < 20 && (
                <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
                  <Info className="h-3 w-3" /> Early data — only {total} click
                  {total === 1 ? '' : 's'} so far
                </span>
              )}
            </div>
          </div>

          {/* Heatmap on the real page */}
          <div className="overflow-hidden rounded-xl border border-[hsl(0,0%,16%)] bg-[#0a0a0c]">
            {/* frame bar */}
            <div className="flex flex-wrap items-center gap-3 border-b border-[hsl(0,0%,12%)] bg-[hsl(0,0%,10%)] px-3.5 py-2">
              <span className="flex gap-1.5">
                <i className="h-2.5 w-2.5 rounded-full bg-[hsl(0,0%,20%)]" />
                <i className="h-2.5 w-2.5 rounded-full bg-[hsl(0,0%,20%)]" />
                <i className="h-2.5 w-2.5 rounded-full bg-[hsl(0,0%,20%)]" />
              </span>
              <span className="flex max-w-[340px] items-center gap-2 truncate rounded-md border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,7%)] px-3 py-1 text-xs text-muted-foreground">
                <Globe className="h-3 w-3 shrink-0 text-[#8b88cf]" />
                <span className="truncate">{urlPath}</span>
              </span>
              <span className="ml-auto flex items-center gap-3 text-[11px] text-muted-foreground/60">
                <span className="hidden items-center gap-1.5 sm:flex">
                  fewer
                  <span className="h-1.5 w-16 rounded bg-gradient-to-r from-[#7c79c4]/40 via-[rgba(255,170,40,.7)] to-[rgba(255,70,40,.95)]" />
                  more clicks
                </span>
                {liveOn ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-300/90">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                      <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    </span>
                    Live · your real page
                  </span>
                ) : snap ? (
                  <span>Snapshot · {relativeTime(snap.capturedAt)}</span>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    if (liveOn) {
                      iframeRef.current?.contentWindow?.postMessage(
                        { __conclick: 1, type: 'hello', targets },
                        '*',
                      );
                    } else {
                      setRefreshKey(k => k + 1);
                    }
                  }}
                  disabled={snapLoading}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[hsl(0,0%,16%)] px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                >
                  <RefreshCw className={`h-3 w-3 ${snapLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </span>
            </div>

            {liveStatus !== 'off' ? (
              // LIVE MODE: the real page in a sandboxed iframe (no capture, no
              // staleness), heat overlaid and counter-scrolled via the tracker's
              // postMessage bridge. Scroll the page like a real browser window.
              <div
                className="relative"
                style={{ height: 'min(72vh, 740px)' }}
                onClick={() => setSelected(null)}
              >
                <iframe
                  ref={iframeRef}
                  src={liveUrl || undefined}
                  title={`Live view of ${urlPath}`}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  className="h-full w-full border-0 bg-white"
                />
                {liveOn ? (
                  <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div
                      className="relative w-full will-change-transform"
                      style={{
                        height: liveDoc.height,
                        transform: `translate3d(0, -${liveScrollY}px, 0)`,
                      }}
                    >
                      <div className="absolute inset-0 bg-[rgba(5,5,8,.18)]" />
                      {overlay}
                    </div>
                  </div>
                ) : (
                  <div className="absolute bottom-3 left-3 z-10 inline-flex items-center gap-2 rounded-full border border-[hsl(0,0%,18%)] bg-[hsl(0,0%,8%)]/90 px-3 py-1.5 text-xs text-muted-foreground shadow-lg">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#8b88cf]" />
                    Connecting live view…
                  </div>
                )}
              </div>
            ) : snapLoading ? (
              <div className="flex h-[360px] flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin text-[#8b88cf]" />
                Capturing your page… the first snapshot takes a few seconds.
              </div>
            ) : snapFailed || !snap ? (
              <div className="flex h-[200px] flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
                Couldn&apos;t capture your page — it may block bots or be unreachable right now.
                <span className="text-xs text-muted-foreground/60">
                  Every click is still in the list below.
                </span>
              </div>
            ) : (
              // SNAPSHOT FALLBACK: the full page scrolls INSIDE the frame so a
              // 10k-px landing page doesn't dwarf the dashboard.
              <div className="max-h-[75vh] overflow-y-auto">
                <div className="relative" onClick={() => setSelected(null)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={snap.image} alt={`Snapshot of ${urlPath}`} className="block w-full" />
                  <div className="absolute inset-0 bg-[rgba(5,5,8,.30)]" />
                  {overlay}
                </div>
              </div>
            )}
          </div>

          {activeDoc && unplaced > 0 ? (
            <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground/55">
              <Info className="mt-0.5 h-3 w-3 shrink-0" />
              {unplaced} element{unplaced === 1 ? ' isn’t' : 's aren’t'} on the current snapshot
              (changed or removed since the clicks happened) — still counted in the list below.
            </p>
          ) : null}

          {/* All elements — ranked, label-first */}
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

      {/* Funnel-to-this-element dialog */}
      <Dialog open={!!funnelFor} onOpenChange={o => !o && setFunnelFor(null)}>
        <DialogContent className="max-h-[88vh] max-w-2xl gap-0 overflow-y-auto border-[hsl(0,0%,13%)] bg-[hsl(0,0%,8%)]">
          <DialogHeader className="mb-4">
            <DialogTitle>Funnel to this element</DialogTitle>
            <DialogDescription>
              See where visitors drop off on the way to clicking “{funnelFor?.label?.trim()}”.
            </DialogDescription>
          </DialogHeader>
          {funnelFor ? (
            <FunnelBuilder
              websiteId={websiteId}
              onClose={() => setFunnelFor(null)}
              initialSteps={[
                { type: 'path', value: urlPath },
                { type: 'event', value: `Clicked: ${funnelFor.label?.trim()}` },
              ]}
              initialWindow={60}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
