import fs from 'fs';
import puppeteer, { type Browser, type Page } from 'puppeteer-core';

// Server-side page snapshot for the Click map: a faithful full-page screenshot of the
// user's OWN site plus the measured bounding box of every clicked element (located by
// the CSS selector the tracker stored, disambiguated by the element's text). Positions
// are MEASURED at capture time, never estimated. Cached per (page, selectors) per day.

const VIEWPORT_W = 1280;
const VIEWPORT_H = 900;
const SCALE = 1.5; // crisp on retina without huge rasters on a 1GB machine
const MAX_HEIGHT = 4500; // CSS px cap for very long pages
const NAV_TIMEOUT = 20_000;
const CACHE_TTL = 24 * 60 * 60 * 1000;
const CACHE_MAX = 24;

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
  // text we stored with the click. Targets are embedded as JSON (safe in a JS
  // expression context for modern Chrome).
  const src = `(() => {
    const items = ${JSON.stringify(targets)};
    const out = {};
    const norm = (s) => s.replace(/\\s+/g, ' ').trim().slice(0, 80);
    for (const it of items) {
      try {
        const els = Array.from(document.querySelectorAll(it.selector));
        if (!els.length) continue;
        let el = els[0];
        if (els.length > 1 && it.text) {
          const want = norm(it.text);
          const hit = els.find((c) => {
            const t = norm(c.innerText || c.textContent || '');
            return !!t && (t === want || t.startsWith(want) || want.startsWith(t));
          });
          if (hit) el = hit;
        }
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) continue;
        out[it.selector] = {
          x: r.x + window.scrollX,
          y: r.y + window.scrollY,
          w: r.width,
          h: r.height,
        };
      } catch (e) { /* invalid selector — skip */ }
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
    // Freeze animations/transitions so the screenshot and the measured boxes agree.
    await page.addStyleTag({
      content:
        '*,*::before,*::after{animation:none!important;transition:none!important} html{scroll-behavior:auto!important}',
    });

    const height = (await page.evaluate(
      `Math.min(Math.max(document.documentElement.scrollHeight, 600), ${MAX_HEIGHT})`,
    )) as number;
    const boxes = await measureBoxes(page, targets);
    const buf = await page.screenshot({
      type: 'jpeg',
      quality: 80,
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

// ---- day cache ----
const cache = new Map<string, { snap: PageSnapshot; ts: number }>();

function hashTargets(targets: SnapshotTarget[]): string {
  const s = targets
    .map(t => t.selector)
    .sort()
    .join('|');
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return String(h);
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
  const key = `${domain}|${path}|${hashTargets(targets)}|${new Date().toISOString().slice(0, 10)}`;

  const hit = cache.get(key);
  if (hit && !refresh && Date.now() - hit.ts < CACHE_TTL) return hit.snap;

  // Serialize captures (memory) and share the in-flight result via the cache.
  const run = queue.then(() => captureOnce(`https://${domain}${path}`, targets));
  queue = run.catch(() => undefined);

  try {
    const snap = await run;
    cache.set(key, { snap, ts: Date.now() });
    while (cache.size > CACHE_MAX) {
      const oldest = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
      cache.delete(oldest[0]);
    }
    return snap;
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('[page-snapshot] capture failed:', e?.message || e);
    return { ok: false, reason: e?.message === 'no-chromium' ? 'no-chromium' : 'unreachable' };
  }
}
