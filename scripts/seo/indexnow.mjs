#!/usr/bin/env node
// IndexNow submitter — the fastest path from "published" to "citable".
// ---------------------------------------------------------------------------
// IndexNow is a push protocol: one POST tells Bing, DuckDuckGo, Yandex, Naver
// and Seznam that a URL changed, and they fetch it in minutes instead of
// whenever their crawler next wanders by. Google does not participate — Google
// gets the sitemap + RSS feed instead.
//
// Why we care disproportionately about Bing: Bing's index is the retrieval
// backend behind ChatGPT search. A page that is not in Bing cannot be cited by
// ChatGPT, no matter how good it is. IndexNow is the cheapest lever on that.
//
// Usage:
//   node scripts/seo/indexnow.mjs --all                     # every sitemap URL
//   node scripts/seo/indexnow.mjs --urls /blog/foo /vs/bar  # specific pages
//   node scripts/seo/indexnow.mjs --all --dry               # print, submit NOTHING
//
// The key lives in scripts/seo/indexnow-key.txt (generated on first run) and is
// SERVED BY THE CLOUDFLARE WORKER as an inline constant, not by Next.js — see
// the long comment next to INDEXNOW_KEY in conclick-seo-proxy.worker.js. If the
// key file ever 404s, the search engines permanently distrust the key.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CONTENT, DIR } from './lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const KEY_FILE = path.join(HERE, 'indexnow-key.txt');

const HOST = 'conclick.io';
const BASE = `https://${HOST}`;
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const MAX_BATCH = 10000; // protocol cap per submission

// Mirrors src/app/sitemap.ts. Kept in sync by hand — both lists are short and
// change about once a year.
const CORE = ['', 'pricing', 'about', 'contact'];
const HUBS = ['compare', 'alternatives', 'glossary', 'for', 'guides', 'blogs', 'tools'];
// Directory (from lib.mjs DIR) -> URL prefix. Mirrors pathForType in src/content/schema.ts.
const PREFIX = {
  comparisons: 'vs',
  alternatives: 'alternatives',
  tools: 'tools',
  glossary: 'glossary',
  'use-cases': 'for',
  guides: 'guides',
  blog: 'blogs',
};

// --- key -------------------------------------------------------------------

// IndexNow keys must be 8-128 chars of [a-zA-Z0-9-]. 32 hex chars is well
// inside that and matches what the Worker serves.
export function loadKey() {
  if (fs.existsSync(KEY_FILE)) {
    const key = fs.readFileSync(KEY_FILE, 'utf8').trim();
    if (/^[a-zA-Z0-9-]{8,128}$/.test(key)) return key;
    throw new Error(`${KEY_FILE} contains an invalid IndexNow key: ${JSON.stringify(key)}`);
  }
  const key = crypto.randomBytes(16).toString('hex'); // 32 hex chars
  fs.writeFileSync(KEY_FILE, `${key}\n`);
  console.log(`[indexnow] generated new key -> ${path.relative(process.cwd(), KEY_FILE)}`);
  console.log('[indexnow] IMPORTANT: paste this into INDEXNOW_KEY in');
  console.log('[indexnow]   deploy/cloudflare/conclick-seo-proxy.worker.js  and redeploy the Worker,');
  console.log('[indexnow]   otherwise https://conclick.io/<key>.txt 404s and the key is rejected.');
  return key;
}

// --- url discovery ---------------------------------------------------------

// Enumerate the same URL set src/app/sitemap.ts emits, straight off disk. Local
// so it works offline and in CI before the site has redeployed.
export function sitemapUrlsLocal() {
  // Root is bare `https://conclick.io`, NOT `.../` — siteUrl() strips the
  // trailing slash, so this is the exact string sitemap.xml emits. Submitting
  // the other variant would ask the engines to index a second URL for the
  // homepage.
  const urls = CORE.map(p => (p ? `${BASE}/${p}` : BASE));
  for (const h of HUBS) urls.push(`${BASE}/${h}`);
  for (const dir of Object.values(DIR)) {
    const full = path.join(CONTENT, dir);
    if (!fs.existsSync(full)) continue;
    for (const f of fs.readdirSync(full).sort()) {
      if (!f.endsWith('.ts')) continue;
      urls.push(`${BASE}/${PREFIX[dir]}/${f.replace(/\.ts$/, '')}`);
    }
  }
  return [...new Set(urls)];
}

// Preferred source of truth when the site is reachable: the live sitemap.
export async function sitemapUrlsLive() {
  const res = await fetch(`${BASE}/sitemap.xml`, { headers: { accept: 'application/xml' } });
  if (!res.ok) throw new Error(`sitemap.xml -> HTTP ${res.status}`);
  const xml = await res.text();
  const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(m => m[1]);
  if (!locs.length) throw new Error('sitemap.xml contained no <loc> entries');
  return [...new Set(locs)];
}

async function resolveAllUrls() {
  try {
    const urls = await sitemapUrlsLive();
    console.log(`[indexnow] source: live ${BASE}/sitemap.xml (${urls.length} urls)`);
    return urls;
  } catch (err) {
    const urls = sitemapUrlsLocal();
    console.log(`[indexnow] live sitemap unavailable (${err.message}) — falling back to local content registry`);
    console.log(`[indexnow] source: local src/content (${urls.length} urls)`);
    return urls;
  }
}

// Accept "/blog/foo", "blog/foo" or a full https://conclick.io/... URL.
export function absolutize(u) {
  if (/^https?:\/\//i.test(u)) {
    const parsed = new URL(u);
    if (parsed.host !== HOST) throw new Error(`refusing off-host URL (IndexNow rejects it): ${u}`);
    return parsed.toString();
  }
  return `${BASE}/${String(u).replace(/^\/+/, '')}`;
}

// --- submit ----------------------------------------------------------------

export async function submit(urlList, { key, dry = false } = {}) {
  const payload = {
    host: HOST,
    key,
    keyLocation: `${BASE}/${key}.txt`,
    urlList,
  };
  if (dry) {
    console.log(`[indexnow] DRY RUN — nothing was submitted. Would POST ${ENDPOINT}:`);
    console.log(JSON.stringify(payload, null, 2));
    return { dry: true, status: null, count: urlList.length };
  }
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  });
  const text = await res.text().catch(() => '');
  // 200 = accepted, 202 = accepted but key still pending validation.
  console.log(`[indexnow] POST ${ENDPOINT} -> ${res.status} ${res.statusText} ${text.slice(0, 200)}`);
  if (!res.ok) throw new Error(`IndexNow rejected the submission: HTTP ${res.status} ${text.slice(0, 200)}`);
  return { dry: false, status: res.status, count: urlList.length };
}

// --- cli -------------------------------------------------------------------

// Ledger of what has already been submitted. Git-tracked so the record survives
// a machine change, and so a diff shows exactly what was announced and when.
const LEDGER = path.join(HERE, 'indexnow-submitted.json');

function readLedger() {
  try {
    const j = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
    return j && typeof j === 'object' && j.submitted ? j : { submitted: {} };
  } catch {
    return { submitted: {} };
  }
}

function writeLedger(led) {
  const sorted = Object.fromEntries(Object.entries(led.submitted).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(LEDGER, JSON.stringify({ submitted: sorted }, null, 2) + '\n');
}

/**
 * URLs that exist now but have never been submitted.
 *
 * This is the mode the scheduled routine should use. Submitting "the page I just
 * wrote" depends on the routine reaching that step: if it errors earlier, runs in
 * review mode, or simply forgets, that page is never announced and NOTHING ever
 * notices. Diffing against a ledger is self-healing — whatever was missed goes out
 * on the next run, and re-running is a no-op rather than a duplicate submission.
 */
export async function newUrls() {
  const led = readLedger();
  const all = await resolveAllUrls();
  return { fresh: all.filter(u => !led.submitted[u]), all, led };
}

function parseArgs(argv) {
  const out = { all: false, new: false, dry: false, urls: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--all') out.all = true;
    else if (a === '--new') out.new = true;
    else if (a === '--dry' || a === '--dry-run') out.dry = true;
    else if (a === '--urls') {
      while (i + 1 < argv.length && !argv[i + 1].startsWith('--')) out.urls.push(argv[++i]);
    } else if (a === '--help' || a === '-h') out.help = true;
    else throw new Error(`unknown argument: ${a}`);
  }
  return out;
}

const USAGE = `Usage:
  node scripts/seo/indexnow.mjs --new [--dry]        <-- use this one in automation
  node scripts/seo/indexnow.mjs --all [--dry]
  node scripts/seo/indexnow.mjs --urls <u1> [u2 ...] [--dry]

  --new     submit only URLs not yet in indexnow-submitted.json, then record them.
            Idempotent and self-healing: a missed run is caught by the next one,
            and re-running submits nothing.
  --all     submit every URL in the sitemap (live sitemap.xml, else local registry)
  --urls    submit specific URLs (paths like /blog/foo or full conclick.io URLs)
  --dry     print the exact payload and exit WITHOUT submitting
`;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || (!args.all && !args.new && !args.urls.length)) {
    console.log(USAGE);
    process.exit(args.help ? 0 : 1);
  }

  const key = loadKey();

  let urls;
  let ledger = null;
  if (args.new) {
    const { fresh, all, led } = await newUrls();
    urls = fresh;
    ledger = led;
    console.log(`[indexnow] ${all.length} url(s) known, ${fresh.length} not yet submitted`);
    if (!fresh.length) {
      console.log('[indexnow] nothing new — no submission made');
      return;
    }
  } else {
    urls = args.all ? await resolveAllUrls() : args.urls.map(absolutize);
  }

  console.log(`[indexnow] key ${key.slice(0, 6)}… keyLocation ${BASE}/${key}.txt`);
  console.log(`[indexnow] submitting ${urls.length} url(s):`);
  for (const u of urls) console.log(`  ${u}`);

  let ok = true;
  for (let i = 0; i < urls.length; i += MAX_BATCH) {
    const res = await submit(urls.slice(i, i + MAX_BATCH), { key, dry: args.dry });
    // submit() may return undefined on older paths; treat only an explicit
    // failure as failure so we never silently skip recording a good submission.
    if (res && res.ok === false) ok = false;
  }

  // Only record after a successful, non-dry submission. Recording a failed
  // submission would permanently hide those URLs from --new, which is exactly
  // the silent gap this mode exists to close.
  if (ledger && ok && !args.dry) {
    const at = new Date().toISOString();
    for (const u of urls) ledger.submitted[u] = at;
    writeLedger(ledger);
    console.log(`[indexnow] recorded ${urls.length} url(s) in indexnow-submitted.json`);
  }
}

// pathToFileURL, not `file://${argv[1]}` — the repo path contains a space, and
// import.meta.url percent-encodes it, so raw string concat never matches.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    console.error(`[indexnow] ${err.message}`);
    process.exit(1);
  });
}
