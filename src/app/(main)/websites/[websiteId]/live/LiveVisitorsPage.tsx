'use client';

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useWebsiteQuery, useRealtimeQuery } from '@/components/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import {
  Globe as GlobeIcon,
  MapPin,
  Activity,
  ExternalLink,
  X,
  ChevronDown,
  ChevronUp,
  RotateCw,
  Share2,
  Check,
  Maximize2,
  Crosshair,
  Flame,
  Smartphone,
  Tablet,
  Laptop,
  Monitor,
  MousePointerClick,
  ArrowRight,
  ShieldCheck,
  BadgeDollarSign,
} from 'lucide-react';
import { formatMinorCurrency } from '@/lib/format';
import MapGL, { Popup, Marker, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { createAvatar } from '@dicebear/core';
import { notionistsNeutral } from '@dicebear/collection';
import { Logo } from '@/components/logo';
import { COUNTRY_CENTROIDS } from '@/lib/country-centroids';

/* ------------------------------- helpers -------------------------------- */

// Sessions seen in the last 5 minutes are "active now"; the rest of the 60-min
// realtime window renders as dimmed "recent" dots.
const ACTIVE_MS = 5 * 60_000;

const flagEmoji = (code?: string) =>
  code && /^[A-Za-z]{2}$/.test(code)
    ? String.fromCodePoint(...code.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0)))
    : '🌐';

const countryName = (code?: string) => {
  if (!code) return 'Unknown';
  if (!/^[A-Za-z]{2}$/.test(code)) return code; // already a display name
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code.toUpperCase()) || code;
  } catch {
    return code;
  }
};

const timeAgo = (ts?: number | null) => {
  if (!ts) return '—';
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 8) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
};

const fmtDuration = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};

const DeviceIcon = ({ device, className }: { device?: string; className?: string }) => {
  const d = (device || '').toLowerCase();
  if (d === 'mobile') return <Smartphone className={className} />;
  if (d === 'tablet') return <Tablet className={className} />;
  if (d === 'desktop') return <Monitor className={className} />;
  return <Laptop className={className} />;
};

// Generate visitor avatars locally (cached per seed) instead of calling
// api.dicebear.com — keeps session ids off a third-party host, matching the
// privacy-first positioning, and removes an external request/failure mode.
const avatarCache = new Map<string, string>();
const AVATAR_CACHE_MAX = 500; // FIFO cap so a 24/7 wall-display tab can't grow it unbounded
function avatarFor(seed: string): string {
  let uri = avatarCache.get(seed);
  if (!uri) {
    uri = createAvatar(notionistsNeutral, { seed, size: 64 }).toDataUri();
    avatarCache.set(seed, uri);
    if (avatarCache.size > AVATAR_CACHE_MAX) {
      const oldest = avatarCache.keys().next().value;
      if (oldest !== undefined) avatarCache.delete(oldest);
    }
  }
  return uri;
}

const toRad = (d: number) => (d * Math.PI) / 180;

// Great-circle angle (degrees) between two lng/lat points — used to tell which
// visitors sit on the hemisphere facing away from the camera (>90° = hidden).
function angularDistDeg(aLng: number, aLat: number, bLng: number, bLat: number): number {
  const p1 = toRad(aLat);
  const p2 = toRad(bLat);
  const dl = toRad(bLng - aLng);
  const c = Math.sin(p1) * Math.sin(p2) + Math.cos(p1) * Math.cos(p2) * Math.cos(dl);
  return (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
}

// Averaging lng/lat directly breaks across the antimeridian, so average the 3D
// unit vectors and convert back — the "center of mass" of the visitor cloud.
function sphericalCentroid(coords: [number, number][]): [number, number] | null {
  if (!coords.length) return null;
  let x = 0;
  let y = 0;
  let z = 0;
  for (const [lng, lat] of coords) {
    const p = toRad(lat);
    const l = toRad(lng);
    x += Math.cos(p) * Math.cos(l);
    y += Math.cos(p) * Math.sin(l);
    z += Math.sin(p);
  }
  const lng = (Math.atan2(y, x) * 180) / Math.PI;
  const lat = (Math.atan2(z, Math.sqrt(x * x + y * y)) * 180) / Math.PI;
  return [lng, lat];
}

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
  isNewSession?: boolean;
}

interface Ripple {
  id: string;
  lng: number;
  lat: number;
  big: boolean;
  gold?: boolean; // revenue landed here
}

interface RevenueRow {
  id: string;
  sessionId: string | null;
  type: string; // payment | refund
  amountMinor: number; // refunds negative
  currency: string;
  gateway: string;
  occurredAt: number;
  country: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
}

/* ----------------------------- demo simulation --------------------------- */

const DEMO_WEBSITE_ID = '1be0acac-4fc3-4dc1-a4d2-02e6a2aae843';

const DEMO_PATHS = [
  '/',
  '/pricing',
  '/features',
  '/blog/launch-week',
  '/docs/getting-started',
  '/integrations',
  '/about',
  '/changelog',
];
const DEMO_REFERRERS = ['google.com', 'x.com', 'producthunt.com', 'Direct', 'linkedin.com', 'news.ycombinator.com'];
const DEMO_BASES: Array<[string, string, number, number, string, string, string]> = [
  // country, city, lat, lng, browser, os, device
  ['US', 'New York', 40.7128, -74.006, 'chrome', 'Mac OS', 'laptop'],
  ['GB', 'London', 51.5074, -0.1278, 'safari', 'Mac OS', 'laptop'],
  ['DE', 'Berlin', 52.52, 13.405, 'firefox', 'Windows 10', 'desktop'],
  ['FR', 'Paris', 48.8566, 2.3522, 'chrome', 'Windows 10', 'laptop'],
  ['IN', 'Mumbai', 19.076, 72.8777, 'chrome', 'Android OS', 'mobile'],
  ['CA', 'Toronto', 43.6532, -79.3832, 'edge-chromium', 'Windows 10', 'laptop'],
  ['AU', 'Sydney', -33.8688, 151.2093, 'safari', 'iOS', 'mobile'],
  ['JP', 'Tokyo', 35.6762, 139.6503, 'chrome', 'Mac OS', 'laptop'],
  ['BR', 'São Paulo', -23.5505, -46.6333, 'chrome', 'Android OS', 'mobile'],
  ['NL', 'Amsterdam', 52.3676, 4.9041, 'firefox', 'Linux', 'desktop'],
  ['US', 'San Francisco', 37.7749, -122.4194, 'chrome', 'Mac OS', 'laptop'],
  ['ES', 'Madrid', 40.4168, -3.7038, 'chrome', 'Windows 10', 'laptop'],
  ['SG', 'Singapore', 1.3521, 103.8198, 'safari', 'iOS', 'mobile'],
  ['KR', 'Seoul', 37.5665, 126.978, 'chrome', 'Windows 10', 'desktop'],
  ['AE', 'Dubai', 25.2048, 55.2708, 'safari', 'iOS', 'mobile'],
  ['SE', 'Stockholm', 59.3293, 18.0686, 'chrome', 'Mac OS', 'laptop'],
  ['MX', 'Mexico City', 19.4326, -99.1332, 'chrome', 'Android OS', 'mobile'],
  ['ZA', 'Cape Town', -33.9249, 18.4241, 'firefox', 'Windows 10', 'laptop'],
];

const DEMO_AMOUNTS = [4900, 990, 2900, 14900, 1900];

function demoRevenueFrom(v: Visitor, counter: number, at: number): RevenueRow {
  return {
    id: `demo-rev-${counter}-${at}`,
    sessionId: v.id,
    type: 'payment',
    amountMinor: DEMO_AMOUNTS[counter % DEMO_AMOUNTS.length],
    currency: 'USD',
    gateway: 'stripe',
    occurredAt: at,
    country: v.country,
    city: v.city,
    latitude: v.lat,
    longitude: v.lng,
  };
}

function seedDemo(): { visitors: Visitor[]; feed: FeedEvent[]; counter: number; revenue: RevenueRow[] } {
  const now = Date.now();
  const visitors: Visitor[] = DEMO_BASES.slice(0, 12).map((b, i) => {
    const [country, city, lat, lng, browser, os, device] = b;
    const firstSeen = now - (i + 2) * 3 * 60_000 - i * 7000;
    const lastSeen = now - i * 40_000;
    return {
      id: `demo-${i}`,
      country,
      city,
      lat,
      lng,
      referrer: DEMO_REFERRERS[i % DEMO_REFERRERS.length],
      entryPath: DEMO_PATHS[i % DEMO_PATHS.length],
      currentPath: DEMO_PATHS[(i + 2) % DEMO_PATHS.length],
      pageCount: 1 + (i % 4),
      firstSeen,
      lastSeen,
      browser,
      os,
      device,
    };
  });
  const feed: FeedEvent[] = visitors.slice(0, 6).map((v, i) => ({
    id: `demo-feed-${i}`,
    sessionId: v.id,
    country: v.country,
    city: v.city,
    urlPath: v.currentPath,
    createdAt: v.lastSeen,
  }));
  // One sale already on the board so the revenue lane shows immediately.
  const revenue = [demoRevenueFrom(visitors[3], 1, now - 4 * 60_000)];
  return { visitors, feed, counter: 0, revenue };
}

function advanceDemo(s: { visitors: Visitor[]; feed: FeedEvent[]; counter: number; revenue: RevenueRow[] }) {
  const now = Date.now();
  const counter = s.counter + 1;
  let visitors = [...s.visitors];
  let revenue = s.revenue;
  let feedEvent: FeedEvent;

  // Every ~6th tick an active visitor converts (drives the gold ripple + row).
  if (counter % 6 === 3 && visitors.length) {
    const payer = visitors[counter % Math.min(visitors.length, 6)];
    revenue = [demoRevenueFrom(payer, counter, now), ...revenue].slice(0, 10);
  }

  if (counter % 4 === 0) {
    // A brand-new visitor lands (drives the arrival ripple + feed).
    const base = DEMO_BASES[(12 + counter / 4) % DEMO_BASES.length];
    const [country, city, lat, lng, browser, os, device] = base;
    const path = DEMO_PATHS[counter % DEMO_PATHS.length];
    const v: Visitor = {
      id: `demo-live-${counter}`,
      country,
      city,
      lat: lat + ((counter % 5) - 2) * 0.12,
      lng: lng + ((counter % 7) - 3) * 0.12,
      referrer: DEMO_REFERRERS[counter % DEMO_REFERRERS.length],
      entryPath: path,
      currentPath: path,
      pageCount: 1,
      firstSeen: now,
      lastSeen: now,
      browser,
      os,
      device,
    };
    visitors = [v, ...visitors].slice(0, 18);
    feedEvent = {
      id: `demo-feed-${now}`,
      sessionId: v.id,
      country: v.country,
      city: v.city,
      urlPath: v.currentPath,
      createdAt: now,
      isNewSession: true,
    };
  } else {
    // An existing visitor navigates to another page.
    const idx = counter % visitors.length;
    const v = { ...visitors[idx] };
    v.currentPath = DEMO_PATHS[(counter + idx) % DEMO_PATHS.length];
    v.pageCount += 1;
    v.lastSeen = now;
    visitors[idx] = v;
    feedEvent = {
      id: `demo-feed-${now}`,
      sessionId: v.id,
      country: v.country,
      city: v.city,
      urlPath: v.currentPath,
      createdAt: now,
    };
  }

  return { visitors, feed: [feedEvent, ...s.feed].slice(0, 18), counter, revenue };
}

/* -------------------------------- component ------------------------------ */

export function LiveVisitorsPage({ websiteId }: { websiteId: string }) {
  const [isClient, setIsClient] = useState(false);
  const { data: website } = useWebsiteQuery(websiteId);
  const { data: realtimeData, isLoading } = useRealtimeQuery(websiteId, isClient);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<any | null>(null);
  const [hoveredVisitor, setHoveredVisitor] = useState<any | null>(null);
  const [isPopupOccluded, setIsPopupOccluded] = useState(false);
  const [isAutoPanning, setIsAutoPanning] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [hidden, setHidden] = useState<{ count: number; centroid: [number, number] | null }>({
    count: 0,
    centroid: null,
  });
  const [copied, setCopied] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [, setClockTick] = useState(0);

  const mapRef = useRef<any>(null);
  const isInteracting = useRef(false);
  const followRef = useRef(false);
  const pinnedRef = useRef(false);
  const hoverRef = useRef(false);
  const didInitialFrame = useRef(false);
  const seenSessions = useRef<Set<string> | null>(null);
  const seenFeed = useRef<Set<string> | null>(null);
  const seenRevenue = useRef<Set<string> | null>(null);

  const isDemo = websiteId === DEMO_WEBSITE_ID;
  const [demoState, setDemoState] = useState<ReturnType<typeof seedDemo> | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Relative-time labels re-render on a slow clock.
  useEffect(() => {
    const t = setInterval(() => setClockTick(n => n + 1), 5000);
    return () => clearInterval(t);
  }, []);

  // Heartbeat: the API returns a fresh timestamp on every poll.
  useEffect(() => {
    if (realtimeData?.timestamp) setLastSync(Date.now());
  }, [realtimeData?.timestamp]);

  // Demo simulation: seed once, then simulate navigation + arrivals.
  useEffect(() => {
    if (!isDemo || !isClient) return;
    setDemoState(seedDemo());
    const t = setInterval(() => setDemoState(s => (s ? advanceDemo(s) : s)), 6000);
    return () => clearInterval(t);
  }, [isDemo, isClient]);

  useEffect(() => {
    followRef.current = isFollowing;
  }, [isFollowing]);

  useEffect(() => {
    pinnedRef.current = !!selectedVisitor;
  }, [selectedVisitor]);

  useEffect(() => {
    hoverRef.current = !!hoveredVisitor;
  }, [hoveredVisitor]);

  // Respect the OS reduced-motion setting: don't auto-spin the globe.
  useEffect(() => {
    if (reducedMotion()) setIsAutoPanning(false);
  }, []);

  /* ------------------------- derive visitors + feed ----------------------- */

  const { visitors, feedEvents } = useMemo((): { visitors: Visitor[]; feedEvents: FeedEvent[] } => {
    if (isDemo) {
      return { visitors: demoState?.visitors || [], feedEvents: demoState?.feed || [] };
    }

    const rows = realtimeData?.events || [];
    const map = new Map<string, Visitor>();
    const feed: FeedEvent[] = [];

    // rows are newest-first; the `session` row sits at each session's OLDEST
    // event in the window (that's the entry), the first row we meet is the newest.
    rows.forEach((e: any) => {
      const ts = e.createdAt ? new Date(e.createdAt).getTime() : Date.now();
      let v = map.get(e.sessionId);
      if (!v) {
        v = {
          id: e.sessionId,
          country: e.country || '',
          city: e.city || 'Unknown',
          lat: typeof e.latitude === 'number' ? e.latitude : null,
          lng: typeof e.longitude === 'number' ? e.longitude : null,
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
        // oldest row for this session → entry point in the window
        v.entryPath = e.urlPath || v.entryPath;
        v.firstSeen = Math.min(v.firstSeen, ts);
      } else {
        v.pageCount += 1;
        if (feed.length < 18) {
          feed.push({
            id: `${e.sessionId}-${e.createdAt}-${feed.length}`,
            sessionId: e.sessionId,
            country: e.country || '',
            city: e.city || 'Unknown',
            urlPath: e.urlPath || '/',
            eventName: e.eventName || undefined,
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
  }, [isDemo, demoState, realtimeData?.events]);

  const now = Date.now();
  const activeVisitors = visitors.filter(v => now - v.lastSeen <= ACTIVE_MS);
  const activeCount = activeVisitors.length;
  const windowCount = visitors.length;

  /* ------------------------------- revenue -------------------------------- */

  const revenueRows: RevenueRow[] = isDemo
    ? demoState?.revenue || []
    : realtimeData?.revenue || [];
  const botsBlocked: number = isDemo ? 7 : realtimeData?.botsBlocked || 0;

  // Net revenue in the window, headline in the dominant currency ("+" when mixed).
  // Sort by MAJOR units (minor / 10^exponent) — raw minor units would let ¥1,500
  // outrank $14.90 and handicap 3-decimal currencies.
  const revenueSummary = useMemo(() => {
    if (!revenueRows.length) return null;
    const digitsFor = (ccy: string) => {
      try {
        return (
          new Intl.NumberFormat('en', { style: 'currency', currency: ccy }).resolvedOptions()
            .maximumFractionDigits ?? 2
        );
      } catch {
        return 2;
      }
    };
    const byCcy: Record<string, number> = {};
    revenueRows.forEach(r => {
      byCcy[r.currency] = (byCcy[r.currency] || 0) + r.amountMinor;
    });
    const entries = Object.entries(byCcy).sort(
      ([ca, a], [cb, b]) => b / 10 ** digitsFor(cb) - a / 10 ** digitsFor(ca),
    );
    return { minor: entries[0][1], currency: entries[0][0], mixed: entries.length > 1 };
  }, [revenueRows]);

  // Per-session paid total for the "customer" badge on visitor cards.
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

  /* ------------------------------ coordinates ----------------------------- */

  const jitter = (seed: string): [number, number] => {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
    const a = (Math.abs(h) % 1000) / 1000 - 0.5;
    const b = (Math.abs(h >> 7) % 1000) / 1000 - 0.5;
    return [a * 1.4, b * 1.4];
  };

  const getCoordinates = useCallback((v: Visitor): [number, number] => {
    if (typeof v.lat === 'number' && typeof v.lng === 'number') return [v.lng, v.lat];
    const code = v.country ? String(v.country).toUpperCase() : '';
    const centroid = COUNTRY_CENTROIDS[code];
    if (centroid) {
      const [jLat, jLng] = jitter(v.id || code);
      return [centroid[1] + jLng, centroid[0] + jLat];
    }
    return [0, 0];
  }, []);

  const visitorData = useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: visitors.map(v => {
        const coords = getCoordinates(v);
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: coords },
          properties: {
            ...v,
            active: now - v.lastSeen <= ACTIVE_MS,
          },
        };
      }),
    };
  }, [visitors, getCoordinates, now]);

  /* --------------------------- ripples + follow --------------------------- */

  // Ripple "seen" sets must seed from the FIRST REAL PAYLOAD, not the first
  // effect run — the effect fires once with empty data before the poll lands,
  // and seeding an empty set would make every pre-existing session/sale in the
  // window ripple (and fly the camera) as if it just happened.
  const hasData = isDemo ? !!demoState : !!realtimeData;

  useEffect(() => {
    if (!hasData) return;
    // Big ripple for brand-new sessions (skip the very first hydration).
    const ids = new Set(visitors.map(v => v.id));
    if (!seenSessions.current) {
      seenSessions.current = ids;
      return;
    }
    const fresh = visitors.filter(v => !seenSessions.current!.has(v.id));
    seenSessions.current = ids;
    if (!fresh.length) return;

    const newRipples: Ripple[] = fresh.slice(0, 4).map(v => {
      const [lng, lat] = getCoordinates(v);
      return { id: `r-${v.id}-${Date.now()}`, lng, lat, big: true };
    });
    setRipples(r => [...r, ...newRipples].slice(-8));
    newRipples.forEach(r =>
      setTimeout(() => setRipples(list => list.filter(x => x.id !== r.id)), 4000),
    );

    if (followRef.current && mapRef.current && newRipples[0]) {
      const map = mapRef.current.getMap();
      map.flyTo({
        center: [newRipples[0].lng, newRipples[0].lat],
        zoom: Math.max(map.getZoom(), 2.8),
        duration: 1400,
      });
    }
  }, [visitors, getCoordinates, hasData]);

  useEffect(() => {
    if (!hasData) return;
    // Small ripple for each new pageview/event in the feed.
    const ids = new Set(feedEvents.map(f => f.id));
    if (!seenFeed.current) {
      seenFeed.current = ids;
      return;
    }
    const fresh = feedEvents.filter(f => !seenFeed.current!.has(f.id) && !f.isNewSession);
    seenFeed.current = ids;
    if (!fresh.length) return;
    const byId = new Map(visitors.map(v => [v.id, v]));
    const newRipples: Ripple[] = fresh
      .slice(0, 3)
      .map(f => byId.get(f.sessionId))
      .filter(Boolean)
      .map((v: any) => {
        const [lng, lat] = getCoordinates(v);
        return { id: `r-${v.id}-${Date.now()}-s`, lng, lat, big: false };
      });
    if (!newRipples.length) return;
    setRipples(r => [...r, ...newRipples].slice(-8));
    newRipples.forEach(r =>
      setTimeout(() => setRipples(list => list.filter(x => x.id !== r.id)), 2600),
    );
  }, [feedEvents, visitors, getCoordinates, hasData]);

  // Gold ripple where money just landed. Coordinates: exact payer lat/lng →
  // the payer's live dot → country centroid, in that order.
  useEffect(() => {
    if (!hasData) return;
    const ids = new Set(revenueRows.map(r => r.id));
    if (!seenRevenue.current) {
      seenRevenue.current = ids;
      return;
    }
    const fresh = revenueRows.filter(r => !seenRevenue.current!.has(r.id) && r.amountMinor > 0);
    seenRevenue.current = ids;
    if (!fresh.length) return;

    const coordsFor = (r: RevenueRow): [number, number] | null => {
      if (typeof r.latitude === 'number' && typeof r.longitude === 'number')
        return [r.longitude, r.latitude];
      const v = r.sessionId ? visitors.find(x => x.id === r.sessionId) : null;
      if (v) return getCoordinates(v);
      const centroid = COUNTRY_CENTROIDS[(r.country || '').toUpperCase()];
      return centroid ? [centroid[1], centroid[0]] : null;
    };

    const newRipples: Ripple[] = fresh
      .slice(0, 3)
      .map(r => ({ r, c: coordsFor(r) }))
      .filter(x => x.c)
      .map(({ r, c }) => ({ id: `r-gold-${r.id}`, lng: c![0], lat: c![1], big: true, gold: true }));
    if (!newRipples.length) return;
    setRipples(list => [...list, ...newRipples].slice(-8));
    newRipples.forEach(r =>
      setTimeout(() => setRipples(list => list.filter(x => x.id !== r.id)), 5200),
    );

    // A sale is always worth flying to when follow mode is on.
    if (followRef.current && mapRef.current && newRipples[0]) {
      const map = mapRef.current.getMap();
      map.flyTo({
        center: [newRipples[0].lng, newRipples[0].lat],
        zoom: Math.max(map.getZoom(), 2.8),
        duration: 1400,
      });
    }
  }, [revenueRows, visitors, getCoordinates, hasData]);

  /* ---------------------- initial framing + back-side --------------------- */

  // Rotate the crowd to the front once on first data so the globe never opens on
  // an empty ocean. Instant jumpTo (not flyTo) so it doesn't fight the spin.
  useEffect(() => {
    if (didInitialFrame.current || !mapRef.current) return;
    const active = visitors.filter(v => Date.now() - v.lastSeen <= ACTIVE_MS);
    const pts = (active.length ? active : visitors)
      .map(getCoordinates)
      .filter(([lng, lat]) => lng || lat) as [number, number][];
    const c = sphericalCentroid(pts);
    if (!c) return;
    didInitialFrame.current = true;
    mapRef.current.getMap().jumpTo({ center: c });
  }, [visitors, getCoordinates]);

  // Count active visitors on the far side of the globe so we can offer a jump.
  // Cheap enough to recompute on a 1s tick (reads the live camera center).
  useEffect(() => {
    const id = setInterval(() => {
      const map = mapRef.current?.getMap?.();
      if (!map) return;
      const center = map.getCenter();
      const behind = visitors
        .filter(v => Date.now() - v.lastSeen <= ACTIVE_MS)
        .map(getCoordinates)
        .filter(
          ([lng, lat]) => (lng || lat) && angularDistDeg(center.lng, center.lat, lng, lat) > 90,
        ) as [number, number][];
      setHidden({ count: behind.length, centroid: behind.length ? sphericalCentroid(behind) : null });
    }, 1000);
    return () => clearInterval(id);
  }, [visitors, getCoordinates]);

  /* ------------------------------ auto-rotate ----------------------------- */

  useEffect(() => {
    if (!isAutoPanning || !mapRef.current) return;
    const map = mapRef.current.getMap();
    let raf = 0;
    let last = performance.now();
    const spin = (t: number) => {
      const dt = Math.min(t - last, 64); // clamp so a backgrounded tab doesn't lurch
      last = t;
      // Pause while the user is reading (hover/pinned card), dragging, following a
      // new arrival, or when the tab is hidden — steady to inspect, easy on battery.
      if (
        !isInteracting.current &&
        !hoverRef.current &&
        !pinnedRef.current &&
        !followRef.current &&
        !document.hidden
      ) {
        const center = map.getCenter();
        center.lng += (6 * dt) / 1000; // ~6°/s, frame-rate independent
        map.jumpTo({ center });
      }
      raf = requestAnimationFrame(spin);
    };
    raf = requestAnimationFrame(spin);
    return () => cancelAnimationFrame(raf);
  }, [isAutoPanning]);

  /* -------------------------------- actions ------------------------------- */

  const handleShare = async () => {
    const url = window.location.pathname.includes('/share/')
      ? window.location.href
      : `${window.location.origin}/share/${website?.shareId || websiteId}/live`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to copy:', err);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const handleInteractionStart = () => {
    isInteracting.current = true;
  };
  const handleInteractionEnd = () => {
    isInteracting.current = false;
  };

  // Fly to a visitor's dot and pin their card — used by the activity-feed rows.
  const focusVisitor = useCallback(
    (sessionId: string) => {
      const v = visitors.find(x => x.id === sessionId);
      if (!v || !mapRef.current) return;
      const [lng, lat] = getCoordinates(v);
      setHoveredVisitor(null);
      setSelectedVisitor({ ...v, lng, lat });
      setIsAutoPanning(false);
      const map = mapRef.current.getMap();
      map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 2.8), duration: 1200 });
    },
    [visitors, getCoordinates],
  );

  // Spin the far-side visitors into view.
  const revealHidden = () => {
    if (!hidden.centroid || !mapRef.current) return;
    setIsAutoPanning(false);
    mapRef.current.getMap().flyTo({ center: hidden.centroid, zoom: 2.2, duration: 1400 });
  };

  /* ------------------------------- map wiring ----------------------------- */

  const handleMapLoad = (event: any) => {
    const map = event.target;
    if (!map.getSource('visitors')) {
      map.addSource('visitors', { type: 'geojson', data: visitorData as any });

      map.addLayer({
        id: 'visitor-glow',
        type: 'circle',
        source: 'visitors',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0,
            ['case', ['get', 'active'], 34, 14],
            4,
            ['case', ['get', 'active'], 22, 10],
          ],
          'circle-color': ['case', ['get', 'active'], '#6366f1', '#64748b'],
          'circle-opacity': ['case', ['get', 'active'], 0.35, 0.12],
          'circle-blur': 0.5,
          'circle-pitch-alignment': 'map',
          'circle-pitch-scale': 'map',
        },
      });

      map.addLayer({
        id: 'visitor-dots',
        type: 'circle',
        source: 'visitors',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0,
            ['case', ['get', 'active'], 7, 4],
            4,
            ['case', ['get', 'active'], 8, 5],
          ],
          'circle-color': ['case', ['get', 'active'], '#818cf8', '#52525b'],
          'circle-stroke-width': ['case', ['get', 'active'], 1.5, 0.75],
          'circle-stroke-color': ['case', ['get', 'active'], '#ffffff', '#a1a1aa'],
          'circle-opacity': ['case', ['get', 'active'], 1, 0.55],
          'circle-pitch-alignment': 'map',
          'circle-pitch-scale': 'map',
        },
      });
    }
  };

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current.getMap();
    const source = map.getSource('visitors');
    if (source) (source as any).setData(visitorData);
  }, [visitorData]);

  // Occlusion: hide the pinned popup when its dot rotates behind the globe.
  useEffect(() => {
    if (!selectedVisitor || !mapRef.current) {
      setIsPopupOccluded(false);
      return;
    }
    const map = mapRef.current.getMap();
    const checkOcclusion = () => {
      if (!selectedVisitor) return;
      const point = map.project([selectedVisitor.lng, selectedVisitor.lat]);
      const canvas = map.getCanvas();
      const inBounds =
        point.x >= 0 && point.x <= canvas.width && point.y >= 0 && point.y <= canvas.height;
      if (!inBounds) {
        setIsPopupOccluded(true);
        return;
      }
      const features = map.queryRenderedFeatures(point, { layers: ['visitor-dots'] });
      setIsPopupOccluded(!features.some((f: any) => f.properties?.id === selectedVisitor.id));
    };
    checkOcclusion();
    map.on('move', checkOcclusion);
    map.on('rotate', checkOcclusion);
    map.on('pitch', checkOcclusion);
    map.on('zoom', checkOcclusion);
    return () => {
      map.off('move', checkOcclusion);
      map.off('rotate', checkOcclusion);
      map.off('pitch', checkOcclusion);
      map.off('zoom', checkOcclusion);
    };
  }, [selectedVisitor]);

  const mapStyle = useMemo(
    () => ({
      version: 8,
      sources: {
        'carto-dark': {
          type: 'raster',
          tiles: [
            'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            'https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
          ],
          tileSize: 256,
          attribution:
            '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        },
      },
      layers: [
        { id: 'background', type: 'background', paint: { 'background-color': '#0B1121' } },
        {
          id: 'carto-dark-layer',
          type: 'raster',
          source: 'carto-dark',
          minzoom: 0,
          maxzoom: 22,
          paint: {
            'raster-contrast': 0.3,
            'raster-brightness-min': 0.15,
            'raster-saturation': -1,
            'raster-opacity': 0.8,
          },
        },
      ],
      sky: {
        'sky-color': '#0B1121',
        'sky-horizon-blend': 0.3,
        'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 10, 0],
      },
    }),
    [],
  );

  /* ------------------------------ aggregations ---------------------------- */

  const countryCounts = visitors.reduce((acc: Record<string, number>, v) => {
    const c = v.country || 'Unknown';
    acc[c] = (acc[c] || 0) + 1;
    return acc;
  }, {});

  const referrerCounts = visitors.reduce((acc: Record<string, number>, v) => {
    const r = v.referrer || 'Direct';
    acc[r] = (acc[r] || 0) + 1;
    return acc;
  }, {});

  // "Viewing now" — pages the currently-active sessions are on.
  const hotPages = useMemo(() => {
    const counts: Record<string, number> = {};
    activeVisitors.forEach(v => {
      counts[v.currentPath] = (counts[v.currentPath] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
  }, [activeVisitors]);

  // 30-point sparkline of pageviews. Demo uses a fixed gentle wave.
  const sparkline = useMemo(() => {
    if (isDemo) {
      return Array.from({ length: 30 }, (_, i) => 3 + Math.round(2 * Math.sin(i / 3) + (i % 5 === 0 ? 2 : 0)));
    }
    const pts = realtimeData?.series?.views;
    if (Array.isArray(pts) && pts.length) {
      return pts.slice(-30).map((p: any) => Number(p.y) || 0);
    }
    return [];
  }, [isDemo, realtimeData?.series?.views]);

  const websiteName = website?.name || (isDemo ? 'Demo · SaaS starter' : '');
  const websiteDomain = website?.domain || (isDemo ? 'demo.conclick.io' : '');

  // Ambient tab title so a backgrounded/pinned tab still shows the live count.
  useEffect(() => {
    const base = websiteName || 'Live visitors';
    document.title = activeCount > 0 ? `● ${activeCount} live · ${base}` : base;
    return () => {
      document.title = base;
    };
  }, [activeCount, websiteName]);

  /* --------------------------------- render ------------------------------- */

  if (!isClient) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        Loading Globe...
      </div>
    );
  }

  const panelBody = (
    <>
      {/* Controls */}
      <div className="flex items-center gap-1 pb-3 border-b border-white/5">
        <Button
          variant="ghost"
          size="sm"
          className={`flex-1 h-8 hover:bg-white/10 transition-colors ${copied ? 'text-green-400' : 'text-zinc-400 hover:text-white'}`}
          title={copied ? 'Copied!' : 'Copy public share link'}
          onClick={handleShare}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={`flex-1 h-8 hover:bg-white/10 transition-colors ${isAutoPanning ? 'text-indigo-400 bg-white/10' : 'text-zinc-400 hover:text-white'}`}
          title={isAutoPanning ? 'Stop rotating' : 'Rotate the globe'}
          onClick={() => setIsAutoPanning(v => !v)}
        >
          <RotateCw className={`h-3.5 w-3.5 ${isAutoPanning ? 'animate-spin' : ''}`} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={`flex-1 h-8 hover:bg-white/10 transition-colors ${isFollowing ? 'text-indigo-400 bg-white/10' : 'text-zinc-400 hover:text-white'}`}
          title={isFollowing ? 'Stop following new visitors' : 'Fly to new visitors'}
          onClick={() => setIsFollowing(v => !v)}
        >
          <Crosshair className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 h-8 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
          title="Full screen"
          onClick={toggleFullscreen}
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Website */}
      <div className="pt-3">
        <div className="flex items-center gap-2 text-sm text-zinc-400 mb-1">
          <GlobeIcon className="h-4 w-4" />
          <span className="text-sm font-medium">Website</span>
        </div>
        <p className="font-bold text-white text-lg leading-tight">{websiteName}</p>
        <p className="text-sm text-zinc-500">{websiteDomain}</p>
      </div>

      {/* Active now */}
      <div className="pt-3 border-t border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-zinc-400 font-medium">Active now</span>
            <p className="text-xs text-zinc-600 mt-0.5">{windowCount} in the last hour</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-4xl font-bold text-indigo-400">{activeCount}</span>
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
            </div>
          </div>
        </div>
        {sparkline.length > 1 && (
          <div className="mt-3">
            <Sparkline values={sparkline} />
            <p className="text-[10px] text-zinc-600 mt-1">Pageviews · last hour</p>
          </div>
        )}
      </div>

      {/* Revenue · last hour — only when the site has payment events */}
      {revenueSummary && (
        <div className="pt-3 border-t border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-zinc-400 font-medium">
              <BadgeDollarSign className="h-4 w-4 text-amber-400/90" />
              <span>Revenue · last hour</span>
            </div>
            <span className="text-xl font-bold text-amber-300">
              {formatMinorCurrency(revenueSummary.minor, revenueSummary.currency)}
              {revenueSummary.mixed ? ' +' : ''}
            </span>
          </div>
        </div>
      )}

      {/* Bot-filter trust badge */}
      {botsBlocked > 0 && (
        <div
          className="pt-3 border-t border-white/5 flex items-center gap-2 text-xs text-zinc-400"
          title="Datacenter IPs, headless browsers, and known crawlers are dropped at ingest — they never touch these numbers"
        >
          <ShieldCheck className="h-4 w-4 text-emerald-400/80" />
          <span>
            <span className="font-semibold text-zinc-200">{botsBlocked}</span> bot{' '}
            {botsBlocked === 1 ? 'hit' : 'hits'} blocked · last hour
          </span>
        </div>
      )}

      {/* Viewing now */}
      {hotPages.length > 0 && (
        <div className="pt-3 border-t border-white/5">
          <div className="flex items-center gap-2 text-sm text-zinc-500 mb-2">
            <Flame className="h-4 w-4 text-orange-400/80" />
            <span>Viewing now</span>
          </div>
          <div className="space-y-1.5">
            {hotPages.map(([path, count]) => (
              <div key={path} className="relative overflow-hidden rounded px-2 py-1">
                <div
                  className="absolute inset-y-0 left-0 bg-indigo-500/15 rounded"
                  style={{ width: `${Math.min(100, (count / (hotPages[0][1] || 1)) * 100)}%` }}
                />
                <div className="relative flex items-center justify-between text-sm gap-2">
                  <span className="truncate text-zinc-300" title={path}>
                    {path}
                  </span>
                  <span className="font-semibold text-white text-xs shrink-0">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Details */}
      <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen} className="pt-3 border-t border-white/5">
        <CollapsibleTrigger className="flex items-center justify-between w-full text-sm text-zinc-400 hover:text-white transition-colors group">
          <span className="font-medium">Details</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform text-zinc-500 group-hover:text-zinc-300 ${isDetailsOpen ? 'rotate-180' : ''}`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-3">
          <div>
            <div className="flex items-center gap-2 text-sm text-zinc-500 mb-2">
              <MapPin className="h-4 w-4" />
              <span>Locations</span>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {Object.entries(countryCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([country, count]) => (
                  <div
                    key={country}
                    className="flex items-center justify-between text-sm hover:bg-white/5 px-1 py-0.5 rounded transition-colors"
                  >
                    <span className="text-zinc-300 truncate">
                      <span className="mr-1.5">{flagEmoji(country)}</span>
                      {countryName(country)}
                    </span>
                    <span className="font-semibold text-white bg-white/10 px-2 py-0.5 rounded-full text-xs">
                      {count}
                    </span>
                  </div>
                ))}
            </div>
          </div>
          <div className="pt-3 border-t border-white/5">
            <div className="flex items-center gap-2 text-sm text-zinc-500 mb-2">
              <ExternalLink className="h-4 w-4" />
              <span>Top sources</span>
            </div>
            <div className="space-y-1.5">
              {Object.entries(referrerCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([referrer, count]) => (
                  <div
                    key={referrer}
                    className="flex items-center justify-between text-sm px-1 py-0.5 rounded hover:bg-white/5 transition-colors"
                  >
                    <span className="truncate text-zinc-300">{referrer}</span>
                    <span className="font-semibold text-white bg-white/10 px-2 py-0.5 rounded-full text-xs">
                      {count}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </>
  );

  return (
    <div className="h-screen w-full relative bg-[#020410] overflow-hidden">
      <style jsx global>{`
        .stars {
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(1px 1px at 25px 5px, white, rgba(255, 255, 255, 0)),
            radial-gradient(1px 1px at 50px 25px, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0)),
            radial-gradient(1.5px 1.5px at 125px 20px, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0)),
            radial-gradient(2px 2px at 250px 80px, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0));
          background-size: 350px 350px;
          opacity: 0.5;
          pointer-events: none;
        }
        @keyframes ripple-ping {
          0% {
            transform: scale(0.35);
            opacity: 0.9;
          }
          100% {
            transform: scale(2.6);
            opacity: 0;
          }
        }
        @keyframes feed-in {
          from {
            opacity: 0;
            transform: translateX(14px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
        .feed-item {
          animation: feed-in 0.35s ease-out both;
        }
        .maplibregl-popup-content {
          background: transparent;
          box-shadow: none;
          padding: 0;
          border: none;
        }
        .maplibregl-popup-tip {
          display: none;
        }
        .maplibregl-popup-close-button {
          display: none !important;
        }
        .maplibregl-ctrl-group {
          background-color: #18181b !important;
          border: 1px solid #27272a !important;
        }
        .maplibregl-ctrl button {
          color: #f4f4f5 !important;
          border: none !important;
        }
        .maplibregl-ctrl button:hover {
          background-color: #27272a !important;
        }
        .maplibregl-ctrl-attrib,
        .maplibregl-compact {
          display: none !important;
        }
      `}</style>

      <div className="stars" />

      {/* ------------------------- Desktop panel ------------------------- */}
      <div className="absolute top-6 left-6 z-[1000] space-y-3 hidden lg:block">
        <div className="flex items-center gap-3 px-2">
          <Logo className="h-6 w-auto" />
          <div className="h-5 w-px bg-white/20"></div>
          <span className="text-white/80 text-sm font-medium">Live</span>
          <span className="text-[11px] text-zinc-500 ml-auto flex items-center gap-1.5">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${lastSync && Date.now() - lastSync < 25000 ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
            updated {timeAgo(lastSync)}
          </span>
        </div>

        <Card className="w-80 shadow-2xl border-white/10 bg-black/40 backdrop-blur-md text-zinc-200">
          <CardHeader className="pb-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-400" />
              <CardTitle className="text-lg font-semibold text-white">Live Visitors</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-3 space-y-0">{panelBody}</CardContent>
        </Card>
      </div>

      {/* ------------------------- Mobile top bar ------------------------ */}
      <div className="absolute top-4 inset-x-4 z-[1000] lg:hidden">
        <button
          onClick={() => setSheetOpen(true)}
          className="w-full flex items-center gap-3 rounded-xl border border-white/10 bg-black/50 backdrop-blur-md px-4 py-3 text-left"
        >
          <Logo className="h-5 w-auto" />
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold leading-tight truncate">{websiteName || 'Live visitors'}</p>
            <p className="text-[11px] text-zinc-500">updated {timeAgo(lastSync)}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-2xl font-bold text-indigo-400">{activeCount}</span>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
            </span>
            <ChevronUp className="h-4 w-4 text-zinc-500" />
          </div>
        </button>

        {/* compact feed under the bar */}
        {(feedEvents.length > 0 || revenueRows.length > 0) && (
          <div className="mt-2 space-y-1.5">
            {revenueRows.slice(0, 1).map(r => (
              <RevenueFeedRow key={r.id} r={r} compact />
            ))}
            {feedEvents.slice(0, 3).map(f => (
              <FeedRow key={f.id} f={f} compact />
            ))}
          </div>
        )}
      </div>

      {/* ------------------------- Mobile bottom sheet ------------------- */}
      {sheetOpen && (
        <div className="fixed inset-0 z-[1200] lg:hidden">
          <button className="absolute inset-0 bg-black/60" aria-label="Close" onClick={() => setSheetOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto rounded-t-2xl border-t border-white/10 bg-[#0b0b0e]/95 backdrop-blur-md p-5 pb-8">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-indigo-400" />
                <span className="text-lg font-semibold text-white">Live Visitors</span>
              </div>
              <button onClick={() => setSheetOpen(false)} className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-0 text-zinc-200">{panelBody}</div>
          </div>
        </div>
      )}

      {/* --------------------------- Activity feed ----------------------- */}
      <div className="absolute top-6 right-6 z-[900] w-72 hidden lg:flex flex-col gap-2 pointer-events-none">
        {/* Sales pinned on top — never truncated by pageview flow */}
        {revenueRows.slice(0, 3).map(r => {
          // Only clickable when the payer still has a live dot to fly to.
          const payer = r.sessionId ? visitors.find(v => v.id === r.sessionId) : undefined;
          return (
            <RevenueFeedRow
              key={r.id}
              r={r}
              source={payer?.referrer}
              onSelect={payer ? focusVisitor : undefined}
            />
          );
        })}
        {feedEvents.length > 0 && (
          <div className="px-1 pb-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
            Recent activity
          </div>
        )}
        {feedEvents.slice(0, 7).map(f => (
          <FeedRow key={f.id} f={f} onSelect={focusVisitor} />
        ))}
      </div>

      {/* ---------------------------- Empty state ------------------------ */}
      {!isDemo && !isLoading && windowCount === 0 && (
        <div className="absolute inset-0 z-[800] flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto text-center rounded-2xl border border-white/10 bg-black/50 backdrop-blur-md px-8 py-8 max-w-sm mx-4">
            <div className="mx-auto mb-4 relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
            </div>
            <p className="text-white font-semibold text-lg">It's quiet right now</p>
            <p className="text-sm text-zinc-400 mt-1.5">
              No visitors in the last hour. This view updates live — leave it open and watch them
              land.
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="mt-4 border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10 hover:text-white"
            >
              {copied ? <Check className="h-3.5 w-3.5 mr-1.5 text-green-400" /> : <Share2 className="h-3.5 w-3.5 mr-1.5" />}
              {copied ? 'Link copied' : 'Share this view'}
            </Button>
          </div>
        </div>
      )}

      {/* --------------------- Behind-the-globe + legend ----------------- */}
      {!isAutoPanning && hidden.count > 0 && (
        <button
          onClick={revealHidden}
          className="absolute bottom-6 left-1/2 z-[950] flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3.5 py-1.5 text-xs text-zinc-200 backdrop-blur-md transition-colors hover:border-indigo-400/40 hover:bg-black/80"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
          </span>
          {hidden.count} {hidden.count === 1 ? 'visitor' : 'visitors'} behind the globe
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      )}

      <div className="pointer-events-none absolute bottom-6 left-6 z-[900] hidden items-center gap-3 text-[11px] text-zinc-400 lg:flex">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#818cf8]" /> Active now
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#52525b]" /> Recent · 1h
        </span>
      </div>

      <div aria-live="polite" className="sr-only">
        {activeCount} {activeCount === 1 ? 'visitor' : 'visitors'} active now on {websiteName}
      </div>

      {/* ------------------------------- Map ------------------------------ */}
      <MapGL
        onLoad={handleMapLoad}
        onMouseDown={handleInteractionStart}
        onMouseUp={handleInteractionEnd}
        onTouchStart={handleInteractionStart}
        onTouchEnd={handleInteractionEnd}
        onDragStart={handleInteractionStart}
        onDragEnd={handleInteractionEnd}
        ref={mapRef}
        initialViewState={{ longitude: 0, latitude: 20, zoom: 2.5 }}
        interactiveLayerIds={['visitor-dots']}
        onClick={e => {
          const feature = e.features?.[0];
          if (feature) {
            e.originalEvent.stopPropagation();
            const coords = (feature.geometry as any).coordinates;
            setHoveredVisitor(null);
            setSelectedVisitor({ ...(feature.properties as any), lng: coords[0], lat: coords[1] });
          }
        }}
        onMouseMove={e => {
          const feature = e.features?.[0];
          if (feature) {
            const coords = (feature.geometry as any).coordinates;
            const props = feature.properties as any;
            if (!selectedVisitor || selectedVisitor.id !== props.id) {
              setHoveredVisitor({ ...props, lng: coords[0], lat: coords[1] });
            }
            if (mapRef.current) mapRef.current.getCanvas().style.cursor = 'pointer';
          } else {
            setHoveredVisitor(null);
            if (mapRef.current) mapRef.current.getCanvas().style.cursor = 'default';
          }
        }}
        onMouseLeave={() => {
          setHoveredVisitor(null);
          if (mapRef.current) mapRef.current.getCanvas().style.cursor = 'default';
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle as any}
        projection="globe"
        logoPosition="bottom-right"
      >
        <NavigationControl position="bottom-right" showCompass={false} />

        {/* Arrival / activity ripples */}
        {ripples.map(r => (
          <Marker key={r.id} longitude={r.lng} latitude={r.lat} anchor="center">
            <span
              className="block rounded-full pointer-events-none"
              style={{
                width: r.gold ? 44 : r.big ? 34 : 18,
                height: r.gold ? 44 : r.big ? 34 : 18,
                border: `2px solid ${r.gold ? '#fbbf24' : r.big ? '#a5b4fc' : '#6366f1'}`,
                boxShadow: r.gold ? '0 0 18px rgba(251,191,36,0.45)' : undefined,
                animation: `ripple-ping ${r.gold ? '1.6s' : r.big ? '1.3s' : '1.1s'} cubic-bezier(0, 0, 0.2, 1) infinite`,
              }}
            />
          </Marker>
        ))}

        {/* Hover preview */}
        {hoveredVisitor && (!selectedVisitor || selectedVisitor.id !== hoveredVisitor.id) && (
          <Popup
            longitude={hoveredVisitor.lng}
            latitude={hoveredVisitor.lat}
            anchor="bottom"
            closeOnClick={false}
            closeButton={false}
            offset={16}
          >
            <div className="pointer-events-none">
              <VisitorCard v={hoveredVisitor} compact paid={revenueBySession.get(hoveredVisitor.id)} />
            </div>
          </Popup>
        )}

        {/* Pinned card */}
        {selectedVisitor && !isPopupOccluded && (
          <Popup
            longitude={selectedVisitor.lng}
            latitude={selectedVisitor.lat}
            anchor="bottom"
            onClose={() => setSelectedVisitor(null)}
            closeOnClick={false}
            offset={20}
          >
            <VisitorCard
            v={selectedVisitor}
            websiteId={websiteId}
            paid={revenueBySession.get(selectedVisitor.id)}
            onClose={() => setSelectedVisitor(null)}
          />
          </Popup>
        )}
      </MapGL>
    </div>
  );
}

/* ------------------------------ subcomponents ----------------------------- */

function Sparkline({ values }: { values: number[] }) {
  const w = 272;
  const h = 30;
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => [
    (i / Math.max(values.length - 1, 1)) * w,
    h - (v / max) * (h - 4) - 2,
  ]);
  const line = pts.map(p => p.join(',')).join(' ');
  const area = `0,${h} ${line} ${w},${h}`;
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polygon points={area} fill="rgba(99,102,241,0.15)" />
      <polyline points={line} fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function FeedRow({
  f,
  compact,
  onSelect,
}: {
  f: FeedEvent;
  compact?: boolean;
  onSelect?: (id: string) => void;
}) {
  const Tag: any = onSelect ? 'button' : 'div';
  return (
    <Tag
      onClick={onSelect ? () => onSelect(f.sessionId) : undefined}
      className={`feed-item pointer-events-auto flex w-full items-center gap-2.5 rounded-lg border border-white/10 bg-black/50 px-3 text-left backdrop-blur-md ${
        onSelect ? 'cursor-pointer transition-colors hover:border-indigo-400/40 hover:bg-black/70' : ''
      } ${compact ? 'py-1.5' : 'py-2'}`}
    >
      <span className="text-base leading-none shrink-0">{flagEmoji(f.country)}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-zinc-200 leading-tight truncate">
          <span className="font-medium text-white">{f.city !== 'Unknown' ? f.city : countryName(f.country)}</span>
          <span className="text-zinc-500"> → </span>
          <span className="text-indigo-300">{f.urlPath}</span>
        </p>
        {f.eventName && !compact && (
          <p className="text-[11px] text-amber-300/90 leading-tight flex items-center gap-1 mt-0.5">
            <MousePointerClick className="h-3 w-3" />
            {f.eventName}
          </p>
        )}
      </div>
      <span className="text-[11px] text-zinc-500 shrink-0">{timeAgo(f.createdAt)}</span>
    </Tag>
  );
}

function RevenueFeedRow({
  r,
  source,
  compact,
  onSelect,
}: {
  r: RevenueRow;
  source?: string;
  compact?: boolean;
  onSelect?: (id: string) => void;
}) {
  const refund = r.amountMinor < 0;
  const Tag: any = onSelect ? 'button' : 'div';
  return (
    <Tag
      onClick={onSelect && r.sessionId ? () => onSelect(r.sessionId!) : undefined}
      className={`feed-item pointer-events-auto flex w-full items-center gap-2.5 rounded-lg border px-3 text-left backdrop-blur-md ${
        refund
          ? 'border-zinc-500/30 bg-zinc-500/10'
          : 'border-amber-400/40 bg-amber-500/10'
      } ${onSelect ? 'cursor-pointer transition-colors hover:border-amber-300/60 hover:bg-amber-500/20' : ''} ${
        compact ? 'py-1.5' : 'py-2'
      }`}
    >
      <span className="text-base leading-none shrink-0">{refund ? '↩️' : '💰'}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-tight truncate">
          <span className={`font-semibold ${refund ? 'text-zinc-300' : 'text-amber-200'}`}>
            {formatMinorCurrency(r.amountMinor, r.currency)}
          </span>
          <span className="text-zinc-400">
            {' '}
            · {r.city && r.city !== 'Unknown' ? r.city : countryName(r.country || undefined)}
          </span>
        </p>
        {!compact && (
          <p className={`text-[11px] leading-tight truncate ${refund ? 'text-zinc-500' : 'text-amber-300/80'}`}>
            {refund ? 'refund' : 'payment'} · {r.gateway}
            {source && source !== 'Direct' ? ` · from ${source}` : ''}
          </p>
        )}
      </div>
      <span className="text-[11px] text-zinc-500 shrink-0">{timeAgo(r.occurredAt)}</span>
    </Tag>
  );
}

function VisitorCard({
  v,
  onClose,
  compact,
  websiteId,
  paid,
}: {
  v: any;
  onClose?: () => void;
  compact?: boolean;
  websiteId?: string;
  paid?: { minor: number; currency: string };
}) {
  const active = Date.now() - Number(v.lastSeen || 0) <= ACTIVE_MS;
  const duration = Number(v.lastSeen || 0) - Number(v.firstSeen || 0);
  return (
    <div className="relative w-64 bg-zinc-950/95 backdrop-blur-md border border-zinc-800 rounded-lg shadow-xl overflow-hidden">
      {onClose && (
        <div className="absolute top-2 right-2 z-10">
          <button
            onClick={e => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center gap-3 mb-3 pr-6">
          <img
            src={avatarFor(String(v.id))}
            alt="Visitor avatar"
            width={36}
            height={36}
            className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-700"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white leading-tight truncate">
              {flagEmoji(v.country)} {v.city !== 'Unknown' ? v.city : countryName(v.country)}
            </p>
            <p className="text-xs text-zinc-400 font-medium truncate">{countryName(v.country)}</p>
          </div>
          <span className="ml-auto flex shrink-0 items-center gap-1">
            {paid && paid.minor > 0 && (
              <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                💰 {formatMinorCurrency(paid.minor, paid.currency)}
              </span>
            )}
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-zinc-800 text-zinc-400'}`}
            >
              {active ? 'active' : 'idle'}
            </span>
          </span>
        </div>

        <div className="space-y-1.5">
          <Row label="Viewing" value={v.currentPath} mono />
          {v.entryPath && v.entryPath !== v.currentPath && (
            <Row label="Entered at" value={v.entryPath} mono />
          )}
          <Row label="Source" value={v.referrer || 'Direct'} />
          {!compact && (
            <>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500 font-medium">Device</span>
                <span className="text-zinc-200 font-medium flex items-center gap-1.5 truncate max-w-[140px]">
                  <DeviceIcon device={v.device} className="h-3 w-3 text-zinc-400" />
                  {[v.browser, v.os].filter(Boolean).join(' · ') || v.device || '—'}
                </span>
              </div>
              <Row label="Pages" value={String(v.pageCount ?? 1)} />
              {duration > 0 && <Row label="Time on site" value={fmtDuration(duration)} />}
            </>
          )}
          <Row label="Last active" value={timeAgo(Number(v.lastSeen) || null)} />
        </div>

        {onClose && websiteId && (
          <a
            href={`/websites/${websiteId}/sessions?session=${v.id}`}
            className="mt-3 flex items-center justify-center gap-1.5 rounded-md border border-indigo-500/30 bg-indigo-500/10 py-1.5 text-xs font-medium text-indigo-300 transition-colors hover:bg-indigo-500/20 hover:text-indigo-200"
          >
            View full journey
            <ArrowRight className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center text-xs gap-3">
      <span className="text-zinc-500 font-medium shrink-0">{label}</span>
      <span
        className={`text-zinc-200 font-medium truncate max-w-[150px] ${mono ? 'text-indigo-300' : ''}`}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}
