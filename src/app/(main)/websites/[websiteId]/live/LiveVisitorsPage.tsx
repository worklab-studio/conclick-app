'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useWebsiteQuery, useRealtimeQuery } from '@/components/hooks';
import { computeIntentScore } from '@/lib/intent-score';
import { IntentBadge } from '@/components/metrics/IntentBadge';
import { isAutoViewEvent, isInternalEvent } from '@/lib/event-noise';
import { formatMinorCurrency } from '@/lib/format';
import {
  Activity,
  ArrowRight,
  BadgeDollarSign,
  Globe as GlobeIcon,
  ShieldCheck,
  X,
} from 'lucide-react';
import { createAvatar } from '@dicebear/core';
import { notionistsNeutral } from '@dicebear/collection';
import { Logo } from '@/components/logo';
import { COUNTRY_CENTROIDS } from '@/lib/country-centroids';
import { LiveGlobe, type GlobeVisitor } from './LiveGlobe';

/* ------------------------------- helpers -------------------------------- */

const ACTIVE_MS = 5 * 60_000;
const DEMO_WEBSITE_ID = '1be0acac-4fc3-4dc1-a4d2-02e6a2aae843';

const flagEmoji = (code?: string) =>
  code && code.length === 2
    ? String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1f1a5 + c.charCodeAt(0)))
    : '🌍';

const countryName = (code?: string) => {
  try {
    return code ? new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code : 'Unknown';
  } catch {
    return code || 'Unknown';
  }
};

const timeAgo = (ts?: number | null) => {
  if (!ts) return '—';
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  return `${Math.round(s / 3600)}h ago`;
};

const fmtDuration = (ms: number) => {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
};

const avatarCache = new Map<string, string>();
function avatarFor(seed: string): string {
  let uri = avatarCache.get(seed);
  if (!uri) {
    uri = createAvatar(notionistsNeutral, { seed, radius: 50 }).toDataUri();
    avatarCache.set(seed, uri);
  }
  return uri;
}

interface Visitor {
  id: string;
  country: string;
  city: string;
  lat: number | null;
  lng: number | null;
  referrer: string;
  entryPath: string;
  currentPath: string;
  pageCount: number;
  firstSeen: number;
  lastSeen: number;
  browser?: string;
  os?: string;
  device?: string;
}

interface FeedEvent {
  id: string;
  sessionId: string;
  country: string;
  city: string;
  urlPath: string;
  eventName?: string;
  createdAt: number;
}

/* ------------------------------ demo mode ------------------------------- */

const DEMO_SPOTS: [string, string, number, number][] = [
  ['US', 'San Francisco', 37.77, -122.42],
  ['IN', 'Bengaluru', 12.97, 77.59],
  ['DE', 'Berlin', 52.52, 13.4],
  ['BR', 'São Paulo', -23.55, -46.63],
  ['JP', 'Tokyo', 35.68, 139.69],
  ['GB', 'London', 51.5, -0.12],
  ['AU', 'Sydney', -33.87, 151.21],
  ['NG', 'Lagos', 6.52, 3.37],
];
const DEMO_PATHS = ['/', '/pricing', '/blog/launch', '/docs', '/changelog'];

function useDemoState(enabled: boolean) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const iv = setInterval(() => setTick(t => t + 1), 5000);
    return () => clearInterval(iv);
  }, [enabled]);

  return useMemo(() => {
    if (!enabled) return null;
    const now = Date.now();
    const visitors: Visitor[] = DEMO_SPOTS.map(([country, city, lat, lng], i) => ({
      id: `demo-${i}`,
      country,
      city,
      lat,
      lng,
      referrer: i % 3 === 0 ? 'google.com' : 'Direct',
      entryPath: '/',
      currentPath: DEMO_PATHS[(i + tick) % DEMO_PATHS.length],
      pageCount: 1 + ((i + tick) % 5),
      firstSeen: now - (i + 2) * 60_000,
      lastSeen: i < 4 ? now - i * 20_000 : now - (i + 4) * 60_000,
      browser: 'Chrome',
      os: 'macOS',
      device: 'laptop',
    }));
    const feed: FeedEvent[] = visitors.slice(0, 6).map((v, i) => ({
      id: `demo-feed-${tick}-${i}`,
      sessionId: v.id,
      country: v.country,
      city: v.city,
      urlPath: v.currentPath,
      createdAt: now - i * 30_000,
    }));
    return { visitors, feed };
  }, [enabled, tick]);
}

/* -------------------------------- page ---------------------------------- */

export function LiveVisitorsPage({ websiteId }: { websiteId: string }) {
  const isDemo = websiteId === DEMO_WEBSITE_ID;
  const { data: website } = useWebsiteQuery(websiteId);
  const { data: realtimeData } = useRealtimeQuery(websiteId, !isDemo);
  const demo = useDemoState(isDemo);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ lat: number; lng: number; key: string } | null>(null);

  /* ----- derive visitors from the realtime window (newest-first rows) ---- */
  const { visitors, feedEvents } = useMemo((): { visitors: Visitor[]; feedEvents: FeedEvent[] } => {
    if (isDemo && demo) return { visitors: demo.visitors, feedEvents: demo.feed };

    const rows = realtimeData?.events || [];
    const map = new Map<string, Visitor>();
    const feed: FeedEvent[] = [];

    rows.forEach((e: any) => {
      const ts = e.createdAt ? new Date(e.createdAt).getTime() : Date.now();
      let v = map.get(e.sessionId);
      if (!v) {
        const centroid = COUNTRY_CENTROIDS[e.country as keyof typeof COUNTRY_CENTROIDS] as
          | [number, number]
          | undefined;
        v = {
          id: e.sessionId,
          country: e.country || '',
          city: e.city || 'Unknown',
          lat: typeof e.latitude === 'number' ? e.latitude : centroid ? centroid[0] : null,
          lng: typeof e.longitude === 'number' ? e.longitude : centroid ? centroid[1] : null,
          referrer: e.referrerDomain || 'Direct',
          entryPath: e.urlPath || '/',
          currentPath: e.urlPath || '/',
          pageCount: 0,
          firstSeen: ts,
          lastSeen: ts,
          browser: e.browser,
          os: e.os,
          device: e.device,
        };
        map.set(e.sessionId, v);
      }
      if (e.__type === 'session') {
        v.entryPath = e.urlPath || v.entryPath;
      } else {
        v.pageCount += 1;
        // The feed shows pageviews and REAL actions — never the tracker's
        // internal noise (engagement heartbeat, Viewed:* scroll markers,
        // frustration diagnostics). That noise is what made the old rail
        // look like a wall of warnings.
        const name = e.eventName || '';
        const isNoise =
          name && (isInternalEvent(name) || isAutoViewEvent(name) || /^frustration$/i.test(name));
        if (feed.length < 24 && !isNoise) {
          feed.push({
            id: `${e.sessionId}-${e.createdAt}-${feed.length}`,
            sessionId: e.sessionId,
            country: e.country || '',
            city: e.city || 'Unknown',
            urlPath: e.urlPath || '/',
            eventName: name || undefined,
            createdAt: ts,
          });
        }
      }
      v.firstSeen = Math.min(v.firstSeen, ts);
      v.lastSeen = Math.max(v.lastSeen, ts);
    });

    return {
      visitors: Array.from(map.values()).sort((a, b) => b.lastSeen - a.lastSeen),
      feedEvents: feed,
    };
  }, [isDemo, demo, realtimeData?.events]);

  const now = Date.now();
  const activeVisitors = visitors.filter(v => now - v.lastSeen <= ACTIVE_MS);

  /* ------------------------------ revenue -------------------------------- */
  const revenueRows: { sessionId?: string; amountMinor: number; currency: string }[] =
    (!isDemo && (realtimeData as any)?.revenue) || [];
  const botsBlocked: number = isDemo ? 3 : (realtimeData as any)?.botsBlocked || 0;

  const revenueBySession = useMemo(() => {
    const m = new Map<string, { minor: number; currency: string }>();
    revenueRows.forEach(r => {
      if (!r.sessionId) return;
      const cur = m.get(r.sessionId);
      if (cur && cur.currency === r.currency) cur.minor += r.amountMinor;
      else if (!cur) m.set(r.sessionId, { minor: r.amountMinor, currency: r.currency });
    });
    return m;
  }, [revenueRows]);

  const revenueTotal = useMemo(() => {
    if (!revenueRows.length) return null;
    const byCcy: Record<string, number> = {};
    revenueRows.forEach(r => {
      byCcy[r.currency] = (byCcy[r.currency] || 0) + r.amountMinor;
    });
    const [ccy, minor] = Object.entries(byCcy).sort((a, b) => b[1] - a[1])[0];
    return { minor, currency: ccy, mixed: Object.keys(byCcy).length > 1 };
  }, [revenueRows]);

  /* --------------------------- globe + focus ----------------------------- */
  const globeVisitors: GlobeVisitor[] = useMemo(
    () =>
      visitors
        .filter(v => v.lat != null && v.lng != null)
        .map(v => ({
          id: v.id,
          lat: v.lat as number,
          lng: v.lng as number,
          active: now - v.lastSeen <= ACTIVE_MS,
          weight: Math.min(1, v.pageCount / 6),
        })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visitors],
  );

  // Auto fly-to when someone NEW shows up — the "feel-good" beat.
  const knownIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const v of activeVisitors) {
      if (!knownIds.current.has(v.id)) {
        knownIds.current.add(v.id);
        if (v.lat != null && v.lng != null) {
          setFocus({ lat: v.lat, lng: v.lng, key: `${v.id}-${v.firstSeen}` });
        }
        break;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitors.length]);

  const selected = visitors.find(v => v.id === selectedId) || null;
  const selectVisitor = (sessionId: string) => {
    const v = visitors.find(x => x.id === sessionId);
    if (!v) return;
    setSelectedId(sessionId);
    if (v.lat != null && v.lng != null) {
      setFocus({ lat: v.lat, lng: v.lng, key: `sel-${sessionId}-${Date.now()}` });
    }
  };

  /* ----------------------------- left panel ------------------------------ */
  const topPaths = useMemo(() => {
    const counts = new Map<string, number>();
    activeVisitors.forEach(v => counts.set(v.currentPath, (counts.get(v.currentPath) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [activeVisitors]);

  const sparkBars = useMemo(() => {
    // Pageviews per 5-minute bucket over the last hour.
    const buckets = new Array(12).fill(0);
    (isDemo && demo ? demo.feed : feedEvents).forEach(f => {
      const age = Date.now() - f.createdAt;
      const idx = 11 - Math.min(11, Math.floor(age / 300_000));
      if (idx >= 0) buckets[idx] += 1;
    });
    return buckets;
  }, [feedEvents, isDemo, demo]);
  const sparkMax = Math.max(1, ...sparkBars);

  const selIntent = selected
    ? computeIntentScore({
        views: selected.pageCount || 0,
        totalSeconds:
          selected.lastSeen > selected.firstSeen
            ? (selected.lastSeen - selected.firstSeen) / 1000
            : undefined,
        lastAt: selected.lastSeen,
        activeNow: now - selected.lastSeen <= ACTIVE_MS,
        referrerDomain:
          selected.referrer && selected.referrer !== 'Direct' ? selected.referrer : null,
        paths: [selected.entryPath, selected.currentPath].filter(Boolean),
        spentMinor: revenueBySession.get(selected.id)?.minor,
      })
    : null;
  const selPaid = selected ? revenueBySession.get(selected.id) : undefined;

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-[#04040a] text-foreground">
      {/* ambient background: two soft glows, no tiles, no images */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(600px 400px at 18% 12%, rgba(94,91,164,0.14), transparent 70%), radial-gradient(700px 500px at 85% 90%, rgba(60,56,140,0.10), transparent 70%)',
        }}
      />

      {/* top bar */}
      <div className="relative z-10 flex items-center gap-3 px-5 py-3.5">
        <Logo />
        <span className="text-sm font-semibold tracking-wide text-zinc-300">Live</span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800/80 bg-zinc-900/60 px-2.5 py-1 text-[11px] text-zinc-400">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          streaming
        </span>
        <a
          href={`/websites/${websiteId}`}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-zinc-800/80 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:text-white"
        >
          Dashboard <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>

      <div className="relative z-10 flex min-h-0 flex-1">
        {/* LEFT — summary panel */}
        <aside className="hidden w-[300px] shrink-0 flex-col gap-4 overflow-y-auto p-5 md:flex">
          <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/70 p-5 backdrop-blur">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <GlobeIcon className="h-3.5 w-3.5 text-[#8b88cf]" /> Website
            </div>
            <div className="mt-1.5 truncate text-lg font-semibold text-white">
              {website?.name || '—'}
            </div>
            <div className="truncate text-xs text-zinc-500">{website?.domain}</div>

            <div className="mt-5 flex items-end justify-between">
              <div>
                <div className="text-xs font-medium text-zinc-500">Active now</div>
                <div className="text-[44px] font-bold leading-none tracking-tight text-white">
                  {activeVisitors.length}
                </div>
                <div className="mt-1 text-[11px] text-zinc-600">
                  {visitors.length} in the last hour
                </div>
              </div>
              <span className="relative mb-2 flex h-3 w-3">
                <span className="absolute h-full w-full animate-ping rounded-full bg-[#8b88d8] opacity-60" />
                <span className="relative h-3 w-3 rounded-full bg-[#8b88d8]" />
              </span>
            </div>

            <div className="mt-4 flex h-9 items-end gap-1" aria-hidden>
              {sparkBars.map((b, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-[#5e5ba4]/70 transition-all"
                  style={{ height: `${Math.max(8, (b / sparkMax) * 100)}%`, opacity: b ? 1 : 0.25 }}
                />
              ))}
            </div>
            <div className="mt-1.5 text-[10px] uppercase tracking-wide text-zinc-600">
              Activity · last hour
            </div>
          </div>

          {(botsBlocked > 0 || revenueTotal) && (
            <div className="space-y-2.5 rounded-2xl border border-zinc-800/70 bg-zinc-950/70 p-4 text-sm backdrop-blur">
              {revenueTotal ? (
                <div className="flex items-center gap-2 text-emerald-300">
                  <BadgeDollarSign className="h-4 w-4" />
                  {formatMinorCurrency(revenueTotal.minor, revenueTotal.currency)}
                  {revenueTotal.mixed ? '+' : ''}
                  <span className="text-xs text-zinc-500">this hour</span>
                </div>
              ) : null}
              {botsBlocked > 0 ? (
                <div className="flex items-center gap-2 text-zinc-400">
                  <ShieldCheck className="h-4 w-4 text-emerald-400/80" />
                  {botsBlocked} bot hit{botsBlocked === 1 ? '' : 's'} blocked
                </div>
              ) : null}
            </div>
          )}

          {topPaths.length > 0 && (
            <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/70 p-4 backdrop-blur">
              <div className="mb-2.5 flex items-center gap-2 text-xs text-zinc-500">
                <Activity className="h-3.5 w-3.5 text-[#8b88cf]" /> Viewing now
              </div>
              <div className="space-y-1.5">
                {topPaths.map(([path, count]) => (
                  <div
                    key={path}
                    className="flex items-center justify-between gap-3 rounded-lg bg-zinc-900/60 px-2.5 py-1.5 text-xs"
                  >
                    <span className="truncate font-mono text-indigo-300">{path}</span>
                    <span className="shrink-0 font-semibold tabular-nums text-zinc-300">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* CENTER — the globe */}
        <main className="relative min-w-0 flex-1">
          <LiveGlobe
            visitors={globeVisitors}
            focus={focus}
            onPick={({ lat, lng }) => {
              // Nearest visitor to the clicked dot (dots are exact coords,
              // so this is effectively an id lookup with float tolerance).
              let best: { id: string; d: number } | null = null;
              for (const v of visitors) {
                if (v.lat == null || v.lng == null) continue;
                const d = Math.abs(v.lat - lat) + Math.abs(v.lng - lng);
                if (!best || d < best.d) best = { id: v.id, d };
              }
              if (best && best.d < 0.5) selectVisitor(best.id);
            }}
            className="h-full w-full"
          />
          {visitors.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="rounded-2xl border border-white/10 bg-black/50 px-8 py-7 text-center backdrop-blur-md">
                <div className="mx-auto mb-3 relative flex h-3 w-3">
                  <span className="absolute h-full w-full animate-ping rounded-full bg-indigo-500 opacity-70" />
                  <span className="relative h-3 w-3 rounded-full bg-indigo-500" />
                </div>
                <p className="text-base font-semibold text-white">It&apos;s quiet right now</p>
                <p className="mt-1 max-w-[260px] text-sm text-zinc-400">
                  No visitors in the last hour. This view updates live — leave it open and watch
                  them land.
                </p>
              </div>
            </div>
          )}
          {/* legend */}
          <div className="pointer-events-none absolute bottom-4 left-5 flex items-center gap-4 text-[11px] text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#8b88d8]" /> Active now
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#8b88d8]/40" /> Recent · 1h
            </span>
            <span className="text-zinc-700">
              drag to rotate · scroll to zoom to street level · click a dot for details
            </span>
          </div>
        </main>
      </div>

      {/* selected visitor card */}
      {selected && (
        <div className="absolute bottom-5 right-5 z-20 w-[300px] rounded-2xl border border-zinc-800 bg-zinc-950/95 p-4 shadow-2xl backdrop-blur animate-in fade-in slide-in-from-bottom-3 duration-300">
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="absolute right-2.5 top-2.5 rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="flex items-center gap-3 pr-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarFor(selected.id)}
              alt=""
              width={38}
              height={38}
              className="h-[38px] w-[38px] rounded-full border border-zinc-700 bg-zinc-900"
            />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-white">
                {flagEmoji(selected.country)}{' '}
                {selected.city !== 'Unknown' ? selected.city : countryName(selected.country)}
              </div>
              <div className="truncate text-xs text-zinc-500">{countryName(selected.country)}</div>
            </div>
          </div>
          <div className="mt-3 space-y-1.5 text-xs">
            <div className="flex items-center justify-between gap-3">
              <span className="shrink-0 text-zinc-500">Buying intent</span>
              {selIntent ? <IntentBadge result={selIntent} size="sm" /> : null}
            </div>
            {selPaid && selPaid.minor > 0 ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-zinc-500">Paid</span>
                <span className="font-semibold text-emerald-300">
                  {formatMinorCurrency(selPaid.minor, selPaid.currency)}
                </span>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <span className="shrink-0 text-zinc-500">Viewing</span>
              <span className="truncate font-mono text-indigo-300">{selected.currentPath}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-zinc-500">Source</span>
              <span className="truncate text-zinc-200">{selected.referrer || 'Direct'}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-zinc-500">Pages</span>
              <span className="tabular-nums text-zinc-200">{selected.pageCount || 1}</span>
            </div>
            {selected.lastSeen > selected.firstSeen ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-zinc-500">Time on site</span>
                <span className="tabular-nums text-zinc-200">
                  {fmtDuration(selected.lastSeen - selected.firstSeen)}
                </span>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <span className="text-zinc-500">Last active</span>
              <span className="text-zinc-200">{timeAgo(selected.lastSeen)}</span>
            </div>
          </div>
          <a
            href={`/websites/${websiteId}/sessions?session=${selected.id}`}
            className="mt-3.5 flex items-center justify-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 py-1.5 text-xs font-medium text-indigo-300 transition-colors hover:bg-indigo-500/20 hover:text-indigo-200"
          >
            View full journey <ArrowRight className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
}
