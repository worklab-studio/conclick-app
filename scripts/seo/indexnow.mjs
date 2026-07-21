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
const HUBS = ['compare', 'alternatives', 'glossary', 'for', 'guides', 'blog', 'tools'];
// Directory (from lib.mjs DIR) -> URL prefix. Mirrors pathForType in src/content/schema.ts.
const PREFIX = {
  comparisons: 'vs',
  alternatives: 'alternatives',
  tools: 'tools',
  glossary: 'glossary',
  'use-cases': 'for',
  guides: 'guides',
  blog: 'blog',
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

function parseArgs(argv) {
  const out = { all: false, dry: false, urls: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--all') out.all = true;
    else if (a === '--dry' || a === '--dry-run') out.dry = true;
    else if (a === '--urls') {
      while (i + 1 < argv.length && !argv[i + 1].startsWith('--')) out.urls.push(argv[++i]);
    } else if (a === '--help' || a === '-h') out.help = true;
    else throw new Error(`unknown argument: ${a}`);
  }
  return out;
}

const USAGE = `Usage:
  node scripts/seo/indexnow.mjs --all [--dry]
  node scripts/seo/indexnow.mjs --urls <u1> [u2 ...] [--dry]

  --all     submit every URL in the sitemap (live sitemap.xml, else local registry)
  --urls    submit specific URLs (paths like /blog/foo or full conclick.io URLs)
  --dry     print the exact payload and exit WITHOUT submitting
`;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || (!args.all && !args.urls.length)) {
    console.log(USAGE);
    process.exit(args.help ? 0 : 1);
  }

  const key = loadKey();
  const urls = args.all ? await resolveAllUrls() : args.urls.map(absolutize);

  console.log(`[indexnow] key ${key.slice(0, 6)}… keyLocation ${BASE}/${key}.txt`);
  console.log(`[indexnow] ${urls.length} url(s):`);
  for (const u of urls) console.log(`  ${u}`);

  for (let i = 0; i < urls.length; i += MAX_BATCH) {
    await submit(urls.slice(i, i + MAX_BATCH), { key, dry: args.dry });
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
