import fs from 'fs';
import puppeteer, { type Browser, type Page } from 'puppeteer-core';
import prisma from '@/lib/prisma';

// Server-side page snapshot for the Click map: a faithful full-page screenshot of the
// user's OWN site plus the measured bounding box of every clicked element (located by
// the CSS selector the tracker stored, disambiguated by the element's text). Positions
// are MEASURED at capture time, never estimated.
//
// Caching (v2): the screenshot is identical no matter which cohort is being
// viewed, so the cache key is (domain, path, day) ONLY — the old key hashed
// the cohort-dependent target list, which recaptured the same page up to 7×
// as the user flipped cohorts. Box coverage for arbitrary cohorts comes from
// a generic sweep: at capture time we measure EVERY clickable element keyed
// by the tracker's own selector format, so any future target set resolves
// from the cached entry. Entries are served stale-while-revalidate (instant
// response, background recapture) and persisted to Postgres so a deploy
// doesn't cold-start every page back to a 5-10s capture.

const VIEWPORT_W = 1280;
const VIEWPORT_H = 900;
const SCALE = 1.5; // crisp on retina without huge rasters on a 1GB machine
const MAX_HEIGHT = 12000; // CSS px cap, long landing pages run 8-11k incl. footer
const SCALE_DROP_HEIGHT = 8000; // beyond this, raster at 1.25x to keep memory bounded
const NAV_TIMEOUT = 20_000;
const CACHE_TTL = 24 * 60 * 60 * 1000;
const CACHE_MAX = 60;

export interface SnapshotBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SnapshotTarget {
  selector: string;
  text?: string | null;
}

export interface PageSnapshot {
  ok: true;
  width: number; // CSS px (viewport width)
  height: number; // CSS px of the captured area
  image: string; // data:image/jpeg;base64,…
  boxes: Record<string, SnapshotBox>;
  capturedAt: string;
}

export interface SnapshotFailure {
  ok: false;
  reason: string;
}

// Same private-network guard as site-analyzer, plus the 172.16-31 RFC1918 block.
export function safePublicDomain(rawDomain: string): string | null {
  const domain = (rawDomain || '')
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .trim();
  if (
    !domain ||
    /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[)/.test(
      domain,
    )
  ) {
    return null;
  }
  return domain;
}

function chromePath(): string | null {
  const candidates = [
    process.env.CHROME_PATH,
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean) as string[];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      /* ignore */
    }
  }
  return null;
}

// Singleton browser, relaunched on disconnect. Captures are serialized through a
// simple mutex — one page at a time keeps memory predictable on a small machine.
let browserPromise: Promise<Browser> | null = null;
let queue: Promise<unknown> = Promise.resolve();

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    const executablePath = chromePath();
    if (!executablePath) throw new Error('no-chromium');
    browserPromise = puppeteer
      .launch({
        executablePath,
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-zygote',
          '--hide-scrollbars',
          '--mute-audio',
        ],
      })
      .then(b => {
        b.on('disconnected', () => {
          browserPromise = null;
        });
        return b;
      });
    browserPromise.catch(() => {
      browserPromise = null;
    });
  }
  return browserPromise;
}

// In-page scripts are passed as STRINGS, not closures: bundlers (esbuild/tsx keepNames,
// minifiers) inject helpers like `__name` into serialized functions that don't exist in
// the page context. Strings execute verbatim.

// Step-scroll to the bottom (triggers IntersectionObserver lazy-loading), then settle
// back at the top so all measurements and the screenshot share origin 0.
async function primeLazyContent(page: Page) {
  await page.evaluate(`new Promise((resolve) => {
    let y = 0;
    const step = ${VIEWPORT_H};
    const cap = ${MAX_HEIGHT};
    const tick = () => {
      y += step;
      window.scrollTo(0, y);
      const max = Math.min(document.documentElement.scrollHeight, cap);
      if (y >= max) {
        window.scrollTo(0, 0);
        setTimeout(resolve, 350);
      } else {
        setTimeout(tick, 110);
      }
    };
    tick();
  })`);
}

async function measureBoxes(
  page: Page,
  targets: SnapshotTarget[],
): Promise<Record<string, SnapshotBox>> {
  // The tracker's selector can match several nodes — disambiguate by the element
  // text we stored with the click. When the selector matches NOTHING (the site was
  // redesigned since the clicks happened), fall back to finding a clickable element
  // by its normalized text ("GET STARTED ▶" still finds today's "Get started").
  // Targets are embedded as JSON (safe in a JS expression context for modern Chrome).
  const src = `(() => {
    const items = ${JSON.stringify(targets)};
    const out = {};
    const norm = (s) => s.replace(/\\s+/g, ' ').trim().slice(0, 80);
    const loose = (s) => norm(s).toLowerCase().normalize('NFKC').replace(/[^\\p{L}\\p{N}]+/gu, '');
    const clickables = Array.from(
      document.querySelectorAll('a, button, [role="button"], input[type="submit"], input[type="button"]'),
    );
    const box = (el) => {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return null;
      return { x: r.x + window.scrollX, y: r.y + window.scrollY, w: r.width, h: r.height };
    };
    for (const it of items) {
      let el = null;
      try {
        const els = Array.from(document.querySelectorAll(it.selector));
        el = els[0] || null;
        if (els.length > 1 && it.text) {
          const want = norm(it.text);
          const hit = els.find((c) => {
            const t = norm(c.innerText || c.textContent || '');
            return !!t && (t === want || t.startsWith(want) || want.startsWith(t));
          });
          if (hit) el = hit;
        }
      } catch (e) { /* invalid selector */ }
      if ((!el || !box(el)) && it.text) {
        const want = loose(it.text);
        if (want) el = clickables.find((c) => loose(c.innerText || c.textContent || '') === want) || el;
      }
      const b = el && box(el);
      if (b) out[it.selector] = b;
    }
    // Generic sweep: measure EVERY clickable element keyed by the tracker's
    // own selector format (tag#id.c1.c2, first two classes, 100 chars). This
    // makes the snapshot cohort-independent — any future target set resolves
    // from these boxes without re-opening the page.
    for (const c of clickables) {
      try {
        let sel = c.tagName.toLowerCase();
        if (c.id) sel += '#' + c.id;
        const cls = c.className && typeof c.className === 'string'
          ? c.className.trim().split(/\\s+/).slice(0, 2).join('.')
          : '';
        if (cls) sel += '.' + cls;
        sel = sel.slice(0, 100);
        if (!out[sel]) {
          const b = box(c);
          if (b) out[sel] = b;
        }
      } catch (e) { /* ignore */ }
    }
    return out;
  })()`;
  return (await page.evaluate(src)) as Record<string, SnapshotBox>;
}

async function captureOnce(url: string, targets: SnapshotTarget[]): Promise<PageSnapshot> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: VIEWPORT_W, height: VIEWPORT_H, deviceScaleFactor: SCALE });
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 ConclickSnapshot/1.0 (+https://conclick.io)',
    );
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: NAV_TIMEOUT });
    } catch {
      // Long-polling/analytics keep some pages from ever going idle — proceed with
      // whatever rendered as long as navigation committed.
      if (page.url() === 'about:blank') throw new Error('unreachable');
    }
    await Promise.race([
      page.evaluateHandle('document.fonts.ready'),
      new Promise(r => setTimeout(r, 3000)),
    ]);
    await primeLazyContent(page);
    // Let in-flight images finish decoding (lazy-loaded hero/media shift boxes
    // if captured mid-decode) — capped so a broken image can't stall us.
    await page
      .evaluate(
        `Promise.race([
          Promise.all(Array.from(document.images).filter(i => !i.complete)
            .map(i => new Promise(r => { i.onload = i.onerror = r; }))),
          new Promise(r => setTimeout(r, 1500)),
        ])`,
      )
      .catch(() => undefined);
    // Freeze animations/transitions so the screenshot and the measured boxes
    // agree — via ZERO DURATION, not `animation:none`. `none` erases keyframe
    // end-states (`fill-mode: forwards`), which left every reveal-animated
    // element stuck at opacity:0 and produced grey-void screenshots on
    // Framer/GSAP-style sites. Zero duration jumps everything to its final
    // frame instead.
    await page.addStyleTag({
      content:
        '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important;transition-delay:0s!important} html{scroll-behavior:auto!important}',
    });

    // Some sites size <html> to the viewport and scroll <body> — take the taller.
    const height = (await page.evaluate(
      `Math.min(Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0, 600), ${MAX_HEIGHT})`,
    )) as number;
    const boxes = await measureBoxes(page, targets);
    // Very tall pages re-raster at 1.25x — same CSS layout (boxes stay valid),
    // bounded memory. (Was 1x, which is what made long pages look blurry.)
    if (height > SCALE_DROP_HEIGHT) {
      await page.setViewport({ width: VIEWPORT_W, height: VIEWPORT_H, deviceScaleFactor: 1.25 });
    }
    const buf = await page.screenshot({
      type: 'jpeg',
      quality: 85,
      clip: { x: 0, y: 0, width: VIEWPORT_W, height },
      captureBeyondViewport: true,
    });

    return {
      ok: true,
      width: VIEWPORT_W,
      height,
      image: `data:image/jpeg;base64,${Buffer.from(buf).toString('base64')}`,
      boxes,
      capturedAt: new Date().toISOString(),
    };
  } finally {
    await page.close().catch(() => undefined);
  }
}

// ---- cache: memory (fast path) + Postgres (survives deploys), SWR semantics ----
const cache = new Map<string, { snap: PageSnapshot; ts: number }>();
const inFlight = new Map<string, Promise<PageSnapshot>>();

// Lazily-created cache table — deliberately raw SQL (not a Prisma model):
// it's an internal cache, safe to drop at any time, and versioning it through
// migrations would be ceremony without benefit.
let tableReady: Promise<void> | null = null;
function ensureTable(): Promise<void> {
  if (!tableReady) {
    tableReady = prisma
      .rawQuery(
        `create table if not exists page_snapshot_cache (
          cache_key text primary key,
          payload jsonb not null,
          ts timestamptz not null default now()
        )`,
        {},
      )
      .then(() => undefined)
      .catch(() => {
        tableReady = null;
      }) as Promise<void>;
  }
  return tableReady;
}

async function dbGet(key: string): Promise<{ snap: PageSnapshot; ts: number } | null> {
  try {
    await ensureTable();
    const rows: any[] = await prisma.rawQuery(
      `select payload, extract(epoch from ts) * 1000 as ts
       from page_snapshot_cache where cache_key = {{key}}`,
      { key },
    );
    if (!rows?.length) return null;
    const payload = rows[0].payload;
    const snap = typeof payload === 'string' ? JSON.parse(payload) : payload;
    return snap?.ok ? { snap, ts: Number(rows[0].ts) || 0 } : null;
  } catch {
    return null;
  }
}

function dbPut(key: string, snap: PageSnapshot): void {
  // Fire-and-forget — a cache write must never slow the response down.
  ensureTable()
    .then(() =>
      prisma.rawQuery(
        `insert into page_snapshot_cache (cache_key, payload, ts)
         values ({{key}}, {{payload}}::jsonb, now())
         on conflict (cache_key) do update set payload = excluded.payload, ts = now()`,
        { key, payload: JSON.stringify(snap) },
      ),
    )
    .then(() =>
      prisma.rawQuery(`delete from page_snapshot_cache where ts < now() - interval '7 days'`, {}),
    )
    .catch(() => undefined);
}

function remember(key: string, snap: PageSnapshot) {
  cache.set(key, { snap, ts: Date.now() });
  while (cache.size > CACHE_MAX) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
    cache.delete(oldest[0]);
  }
  dbPut(key, snap);
}

function startCapture(key: string, url: string, targets: SnapshotTarget[]): Promise<PageSnapshot> {
  const existing = inFlight.get(key);
  if (existing) return existing;
  const run = queue
    .then(() => captureOnce(url, targets))
    .then(snap => {
      remember(key, snap);
      return snap;
    })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, run);
  queue = run.catch(() => undefined);
  return run;
}

export async function capturePageSnapshot(
  rawDomain: string,
  rawPath: string,
  targets: SnapshotTarget[],
  { refresh = false }: { refresh?: boolean } = {},
): Promise<PageSnapshot | SnapshotFailure> {
  const domain = safePublicDomain(rawDomain);
  if (!domain) return { ok: false, reason: 'no-public-domain' };

  const path =
    '/' +
    String(rawPath || '/')
      .replace(/^\/+/, '')
      .slice(0, 300);
  // Cohort-independent: the page looks the same whoever clicked it.
  const key = `${domain}|${path}`;
  const url = `https://${domain}${path}`;

  if (!refresh) {
    let hit = cache.get(key) || null;
    if (!hit) {
      hit = await dbGet(key);
      if (hit) cache.set(key, hit); // warm the memory tier from Postgres
    }
    if (hit) {
      // Stale-while-revalidate: past TTL we still answer instantly with the
      // old snapshot and recapture in the background for the next view.
      if (Date.now() - hit.ts >= CACHE_TTL) startCapture(key, url, targets);
      return hit.snap;
    }
  }

  try {
    return await startCapture(key, url, targets);
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('[page-snapshot] capture failed:', e?.message || e);
    return { ok: false, reason: e?.message === 'no-chromium' ? 'no-chromium' : 'unreachable' };
  }
}
