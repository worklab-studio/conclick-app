#!/usr/bin/env node
/**
 * suggest.mjs — free autocomplete harvesting.
 *
 * Autocomplete is the best long-tail source for a young domain: it surfaces the
 * zero-volume tails that paid keyword tools bucket as "0" (and therefore hide),
 * and every string it returns is a query a real human actually typed.
 *
 * Sources (all keyless, no WAF):
 *   google — suggestqueries.google.com/complete/search?client=firefox&q=
 *   bing   — api.bing.com/osjson.aspx?query=
 *   ddg    — duckduckgo.com/ac/?q=
 *
 * MEASURED 2026-07-21, and it shapes the demand proxy: **DDG's autocomplete is
 * Bing-backed.** For `heatmap tool`, `gdpr analytics` and `google analytics
 * alternative` DDG returned byte-identical phrase lists to Bing (DDG truncates
 * to ~8). So "3 engines agreed" is really "2 indexes agreed". Every suggestion
 * therefore records BOTH `engines` (raw provenance) and `idx` (deduped engine
 * FAMILIES: google | bing). score.mjs should use `idx.length` as the agreement
 * signal — `engines.length` overcounts the Bing family 2:1.
 *
 * Request budget. Unrestricted fan-out is 175 seeds x 8 prefixes x 26 letters
 * ~= 36k requests, which is a reliable IP ban. So: a-z fan-out is restricted to
 * the TOP N seeds (default 40) and the whole run is truncated to a hard cap
 * (default 3000) by phase priority. `--quick` (daily) is seeds only, no fan-out.
 *
 * Politeness: requests are grouped into one serial queue PER HOST with a delay
 * between calls (default 150ms). The three hosts run concurrently — that is
 * politer per-host than a single global queue and ~3x faster overall.
 *
 * CLI
 *   node suggest.mjs --quick                    # daily: seeds only
 *   node suggest.mjs                            # full: prefixes + a-z fan-out
 *   node suggest.mjs --seeds "a, b, c" --dry    # smoke test, no DB write
 *   node suggest.mjs --limit 20 --cap 300       # bounded run
 *
 * Flags
 *   --quick            seeds only, no fan-out (the daily routine uses this)
 *   --seeds "a,b,c"    explicit seed list, overrides seeds.txt / built-ins
 *   --seeds-file PATH  newline-delimited seed file (default: ./seeds.txt if present)
 *   --limit N          use only the first N seeds
 *   --top N            a-z fan-out applies to the first N seeds (default 40)
 *   --engines LIST     comma list of google,bing,ddg,youtube (default first three)
 *   --cap N            hard request cap (default 3000)
 *   --delay MS         per-host delay between requests (default 150)
 *   --dry              do everything except touch the DB; print what would upsert
 *   --json             emit machine-readable JSON summary
 *   --quiet            suppress per-suggestion logging
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Seeds. Ordered by leverage — the first ~40 are the fan-out set.
// Groups 3 (AI/GEO) and 4 (bot traffic) are deliberately near the top: the
// PLAYBOOK flags them as the highest-leverage clusters absent from the current
// topic list, they are genuinely low-competition today, and Conclick has
// first-party data on both.
// Overridden by ./seeds.txt when that file exists (owned elsewhere).
// ---------------------------------------------------------------------------
const SEED_GROUPS = {
  // 1. bottom-funnel competitor / alternative intent
  competitors: [
    'google analytics alternative',
    'ga4 alternative',
    'plausible alternative',
    'fathom analytics alternative',
    'matomo alternative',
    'hotjar alternative',
    'mixpanel alternative',
    'posthog alternative',
    'umami alternative',
    'microsoft clarity alternative',
    'amplitude alternative',
    'heap analytics alternative',
    'simple analytics alternative',
    'privacy friendly analytics',
  ],
  // 2. privacy / compliance — durable, high commercial intent
  privacy: [
    'cookieless analytics',
    'gdpr compliant analytics',
    'analytics without cookie banner',
    'privacy first analytics',
    'is google analytics illegal',
    'is google analytics gdpr compliant',
    'first party analytics',
    'ccpa analytics',
    'analytics without consent',
  ],
  // 3. AI / GEO — the new lane, low competition today
  aiGeo: [
    'llm referral traffic',
    'track ai traffic',
    'chatgpt referral traffic',
    'ai search traffic analytics',
    'track chatgpt visitors',
    'generative engine optimization',
    'ai crawler traffic',
    'perplexity referral traffic',
    'how to track ai referrals',
  ],
  // 4. bot traffic — 3-layer filtering is a real differentiator, zero pages today
  bots: [
    'bot traffic analytics',
    'filter bot traffic',
    'how to block bot traffic',
    'fake traffic google analytics',
    'datacenter ip traffic',
    'spam referral traffic',
    'bot detection website',
  ],
  // 5. heatmaps / session behaviour
  heatmaps: [
    'website heatmap',
    'heatmap tool',
    'click tracking',
    'scroll depth tracking',
    'session recording',
    'rage click',
    'free heatmap tool',
    'heatmap software',
  ],
  // 6. funnels / conversion
  funnels: [
    'conversion funnel',
    'funnel analysis',
    'how to track conversions',
    'conversion rate optimization',
    'drop off rate',
    'checkout funnel analysis',
    'goal conversion tracking',
  ],
  // 7. revenue / attribution
  revenue: [
    'marketing attribution',
    'revenue attribution',
    'attribution model',
    'stripe revenue analytics',
    'how to measure marketing roi',
    'customer acquisition cost',
    'ltv cac ratio',
    'utm tracking',
    'utm builder',
  ],
  // 8. GA4 pain — the exodus discourse
  ga4: [
    'ga4 sampling',
    'ga4 migration',
    'ga4 data thresholding',
    'ga4 not tracking',
    'ga4 vs universal analytics',
    'why is ga4 so hard',
    'ga4 direct traffic',
    'ga4 data retention',
    'export ga4 data',
    'ga4 realtime not working',
  ],
  // 9. platform integrations — dev long-tail, scales
  platforms: [
    'nextjs analytics',
    'shopify analytics',
    'wordpress analytics',
    'webflow analytics',
    'framer analytics',
    'astro analytics',
    'react analytics',
    'vue analytics',
    'sveltekit analytics',
    'squarespace analytics',
    'ghost blog analytics',
    'analytics for static site',
  ],
  // 10. metrics / glossary
  metrics: [
    'bounce rate',
    'exit rate',
    'sessions vs users',
    'average session duration',
    'churn rate',
    'cohort analysis',
    'north star metric',
    'event tracking',
    'referral traffic',
    'direct traffic',
    'conversion rate benchmark',
    'pageviews vs sessions',
  ],
  // 11. audience / use case
  audience: [
    'saas analytics',
    'ecommerce analytics',
    'blog analytics',
    'analytics for agencies',
    'indie hacker analytics',
    'startup metrics dashboard',
    'newsletter analytics',
    'analytics for developers',
    'small business analytics',
  ],
  // 12. tooling / how-to
  tooling: [
    'self hosted analytics',
    'open source analytics',
    'server side tracking',
    'analytics dashboard',
    'web analytics tools',
    'best analytics for small website',
    'lightweight analytics script',
    'realtime visitor tracking',
    'ab testing tool',
    'how to read analytics',
  ],
};

const BUILTIN_SEEDS = Object.values(SEED_GROUPS).flat();

// The 8 question prefixes. Prefixed queries are where the informational
// long-tail actually lives — "how to X" returns a completely different tail
// than bare "X".
const PREFIXES = ['how to', 'why is', 'can i', 'does', 'what is', 'best', 'is it', 'fix'];

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

// `family` is the underlying suggestion index. ddg is Bing-backed (measured),
// so google+bing+ddg is TWO independent indexes, not three.
const ENGINES = {
  google: {
    family: 'google',
    host: 'suggestqueries.google.com',
    url: q => `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(q)}`,
    parse: j => (Array.isArray(j) && Array.isArray(j[1]) ? j[1] : []),
  },
  bing: {
    family: 'bing',
    host: 'api.bing.com',
    url: q => `https://api.bing.com/osjson.aspx?query=${encodeURIComponent(q)}`,
    parse: j => (Array.isArray(j) && Array.isArray(j[1]) ? j[1] : []),
  },
  ddg: {
    family: 'bing',
    host: 'duckduckgo.com',
    url: q => `https://duckduckgo.com/ac/?q=${encodeURIComponent(q)}`,
    parse: j => (Array.isArray(j) ? j.map(x => (typeof x === 'string' ? x : x?.phrase)).filter(Boolean) : []),
  },
  // Same Google endpoint, YouTube dataset. Off by default (the brief names three
  // sources) but useful for how-to/tutorial intent.
  youtube: {
    family: 'youtube',
    host: 'suggestqueries.google.com',
    url: q => `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(q)}`,
    parse: j => (Array.isArray(j) && Array.isArray(j[1]) ? j[1] : []),
  },
};

const DEFAULT_ENGINES = ['google', 'bing', 'ddg'];

// Suggestion length gate.
const MIN_LEN = 8;
const MAX_LEN = 90;

// ---------------------------------------------------------------------------
// args
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const a = {
    quick: false, dry: false, json: false, quiet: false,
    seeds: null, seedsFile: null, limit: 0, top: 40,
    engines: DEFAULT_ENGINES, cap: 3000, delay: 150, db: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const next = () => argv[++i];
    if (k === '--quick') a.quick = true;
    else if (k === '--dry') a.dry = true;
    else if (k === '--json') a.json = true;
    else if (k === '--quiet') a.quiet = true;
    else if (k === '--seeds') a.seeds = String(next() || '').split(',').map(s => s.trim()).filter(Boolean);
    else if (k === '--seeds-file') a.seedsFile = next();
    else if (k === '--limit') a.limit = Number(next()) || 0;
    else if (k === '--top') a.top = Number(next()) || 40;
    else if (k === '--cap') a.cap = Number(next()) || 3000;
    else if (k === '--delay') a.delay = Number(next() ?? 150);
    else if (k === '--db') a.db = next();
    else if (k === '--engines') {
      a.engines = String(next() || '').split(',').map(s => s.trim()).filter(s => ENGINES[s]);
      if (!a.engines.length) a.engines = DEFAULT_ENGINES;
    } else if (k === '--help' || k === '-h') a.help = true;
  }
  return a;
}

function loadSeeds(args) {
  if (args.seeds?.length) return { seeds: args.seeds, origin: '--seeds' };
  const file = args.seedsFile || path.join(HERE, 'seeds.txt');
  if (fs.existsSync(file)) {
    const seeds = fs.readFileSync(file, 'utf8')
      .split('\n')
      .map(l => l.replace(/#.*$/, '').trim())
      .filter(Boolean);
    if (seeds.length) return { seeds, origin: path.relative(HERE, file) || 'seeds.txt' };
  }
  return { seeds: BUILTIN_SEEDS, origin: 'built-in SEED_GROUPS' };
}

// ---------------------------------------------------------------------------
// module wiring — kwstore.mjs and gates.mjs are owned by other agents.
// Dynamic import so that (a) a missing module produces a clear message rather
// than an opaque ESM load crash, and (b) --dry works before they land.
// ---------------------------------------------------------------------------
async function loadGates({ dry }) {
  try {
    const m = await import('./gates.mjs');
    if (typeof m.relevant !== 'function' || typeof m.classify !== 'function') {
      throw new Error('gates.mjs loaded but is missing relevant()/classify()');
    }
    return { gates: m, stub: false };
  } catch (err) {
    if (!dry) {
      console.error(`\nsuggest.mjs: cannot load ./gates.mjs — ${err.message}`);
      console.error('gates.mjs is owned by the `gates` agent and must exist before a real run.');
      console.error('Re-run with --dry to smoke-test the fetch layer without it.\n');
      process.exit(2);
    }
    console.error('\n!! gates.mjs missing — --dry run using a THROWAWAY built-in stub.');
    console.error('!! Every classification below is [stub-gates] and is NOT the real gate.\n');
    return { gates: stubGates(), stub: true };
  }
}

// Deliberately crude. Only ever reachable under --dry with gates.mjs absent;
// exists so the network layer can be verified today, not to duplicate gates.
function stubGates() {
  const TOPICAL = /analytic|traffic|heatmap|funnel|conversion|attribution|utm|ga4|cookie|gdpr|visitor|pageview|bounce|tracking|track|metric|dashboard|session|bot|referral/i;
  return {
    normalize: kw => String(kw).trim().toLowerCase().replace(/\s+/g, ' '),
    clusterOf: kw => String(kw).toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/)
      .filter(t => t && !['the', 'a', 'to', 'for', 'of', 'in', 'is', 'how', 'best', 'vs'].includes(t))
      .sort().join('-'),
    relevant: kw => (TOPICAL.test(kw) ? 'accept' : 'reject'),
    classify: () => ({ content_type: 'guide', format: 'howto', intent: 'informational' }),
  };
}

// score.mjs derives demand/opportunity/value/fit/score from the evidence we
// write into `notes`. Without this the row lands with score=NULL, which sorts
// LAST under every bucket's `ORDER BY score DESC` / `demand DESC` — so freshly
// harvested keywords would never actually be picked. Fault-tolerant on purpose:
// a missing scorer degrades to unscored rows rather than killing the harvest.
async function loadScorer({ dry }) {
  if (dry) return null;
  try {
    const m = await import('./score.mjs');
    return typeof m.scoreRow === 'function' ? m.scoreRow : null;
  } catch {
    console.error('!! score.mjs unavailable — rows will be upserted UNSCORED.');
    return null;
  }
}

async function loadStore({ dry }) {
  if (dry) return null;
  try {
    return await import('./kwstore.mjs');
  } catch (err) {
    console.error(`\nsuggest.mjs: cannot load ./kwstore.mjs — ${err.message}`);
    console.error('kwstore.mjs is owned by the `kwstore` agent. Use --dry until it lands.\n');
    process.exit(2);
  }
}

// ---------------------------------------------------------------------------
// fetch layer
// ---------------------------------------------------------------------------
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchJson(url, { timeout = 12000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': UA,
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    // Google's client=firefox response is JSON but occasionally served as
    // text/javascript with a stray BOM.
    return JSON.parse(text.replace(/^﻿/, ''));
  } finally {
    clearTimeout(t);
  }
}

// ---------------------------------------------------------------------------
// evidence
// ---------------------------------------------------------------------------
/**
 * Autocomplete evidence lives in the `notes` column as JSON under the `ac` key,
 * because the locked keywords schema has no dedicated column for it and writing
 * a made-up number into search_volume would poison volume provenance.
 *
 *   ac.n       times this string was returned across all queries this run + prior
 *   ac.best    best (lowest, 0-based) position ever observed — position is the
 *              engine's own popularity ordering, so lower = more demand
 *   ac.avg     mean position, rounded to 2dp
 *   ac.engines raw engines that returned it: google | bing | ddg | youtube
 *   ac.idx     DEDUPED engine families: google | bing. USE THIS for agreement —
 *              ddg is Bing-backed, so engines overcounts the bing family 2:1.
 *   ac.seeds   up to 5 seed queries that surfaced it (provenance for review)
 *   ac.first / ac.last   ISO dates, first and most recent sighting
 */
/**
 * Fold a gate verdict INTO the notes JSON.
 *
 * Why this exists: kwstore.setStatus(db, kw, status, slug, reason) writes its
 * `reason` argument to the **notes column** (`notes = COALESCE(?, notes)`), so
 * passing a reason string overwrites the whole evidence blob with plain text —
 * which also breaks score.mjs, whose evidenceOf() only parses notes that start
 * with '{'. Measured: 2 needs-human rows lost all evidence that way.
 *
 * The reason is already durably recorded in kwstore's `actions` ledger, so we
 * carry it inside the JSON here and pass reason=null to setStatus.
 */
export function withGateReason(notesJson, reason) {
  try {
    const o = JSON.parse(notesJson);
    o.gate = reason;
    return JSON.stringify(o);
  } catch {
    return notesJson;
  }
}

export function parseAcEvidence(notes) {
  if (!notes) return null;
  try {
    const o = typeof notes === 'string' ? JSON.parse(notes) : notes;
    return o && typeof o === 'object' && o.ac ? o.ac : null;
  } catch {
    return null;
  }
}

export function mergeAcEvidence(priorNotes, fresh, today) {
  let base = {};
  try {
    base = priorNotes ? (typeof priorNotes === 'string' ? JSON.parse(priorNotes) : priorNotes) : {};
  } catch {
    base = {};
  }
  if (!base || typeof base !== 'object') base = {};
  const prev = base.ac || null;

  const n = (prev?.n || 0) + fresh.n;
  const sum = (prev?.sum ?? (prev?.avg != null && prev?.n ? prev.avg * prev.n : 0)) + fresh.sum;
  const engines = [...new Set([...(prev?.engines || []), ...fresh.engines])].sort();
  const idx = [...new Set([...(prev?.idx || []), ...fresh.idx])].sort();
  const seeds = [...new Set([...(prev?.seeds || []), ...fresh.seeds])].slice(0, 5);

  const best = Math.min(prev?.best ?? Infinity, fresh.best);
  const echo = (prev?.echo || 0) + fresh.echo;
  // A keyword standing on nothing but echoes has NO demand evidence.
  const echoOnly = !Number.isFinite(best);

  base.ac = {
    n,
    echo,
    echoOnly,
    best: echoOnly ? null : best,
    avg: n > echo ? Math.round((sum / (n - echo)) * 100) / 100 : null,
    sum,
    engines,
    idx,
    seeds,
    first: prev?.first || today,
    last: today,
  };

  // TOP-LEVEL MIRROR — this is the pair score.mjs actually reads.
  // evidenceOf() looks at `ev.engines` / `ev.position` at the ROOT of the notes
  // JSON; it does NOT descend into `ac`. Without this mirror every autocomplete
  // row falls back to engineCount=1/rank=5, collapsing to an identical demand
  // for every keyword — the "FIFO wearing a score column" failure.
  //
  // `engines` is deliberately the DEDUPED INDEX list, not the raw engine list:
  // DDG is Bing-backed (measured — see header), so raw engines overcounts the
  // Bing family 2:1 and would let a single index masquerade as agreement.
  // `position` is 1-BASED because autocompleteVolume() does 1/log2(rank+1) and
  // documents #1 -> 1.00; our internal `best` is a 0-based array index.
  //
  // ECHO SUPPRESSION. Every engine echoes the query back as suggestion #1 when
  // it has no real data — measured: `llm referral traffic` and `ai crawler
  // traffic` return ONLY themselves. Counting that echo would hand every seed
  // phrase a perfect "rank 1, engines agree" score derived purely from its own
  // input, which is the strongest signal in the model awarded for zero demand.
  // Echo sightings are therefore excluded from position/agreement; a keyword
  // with nothing but echoes emits null so score.mjs falls back to its own
  // defaults instead of reading fabricated evidence.
  if (echoOnly) {
    delete base.engines;
    delete base.position;
  } else {
    base.engines = idx;
    base.position = best + 1;
  }

  return JSON.stringify(base);
}

// ---------------------------------------------------------------------------
// task scheduling
// ---------------------------------------------------------------------------
/**
 * Priority order matters because the cap truncates the tail:
 *   1 base       every seed, every engine        — the trunk
 *   2 fanout     top-N seeds x a-z, ONE engine   — the deep tail
 *   3 prefixTop  top-N seeds x 8 prefixes, all engines
 *   4 prefixRest remaining seeds x 8 prefixes, ONE engine
 * Fan-out uses a single engine on purpose: with ddg Bing-backed, the marginal
 * engine mostly re-returns strings we already have, and requests are the scarce
 * resource.
 */
export function buildTasks({ seeds, quick, top, engines }) {
  const tasks = [];
  const primary = engines.includes('google') ? 'google' : engines[0];
  const one = [primary];

  for (const s of seeds) tasks.push({ q: s, engines, phase: 'base', seed: s });
  if (quick) return tasks;

  const head = seeds.slice(0, top);
  const rest = seeds.slice(top);

  for (const s of head) for (const L of LETTERS) tasks.push({ q: `${s} ${L}`, engines: one, phase: 'fanout', seed: s });
  for (const s of head) for (const p of PREFIXES) tasks.push({ q: `${p} ${s}`, engines, phase: 'prefixTop', seed: s });
  for (const s of rest) for (const p of PREFIXES) tasks.push({ q: `${p} ${s}`, engines: one, phase: 'prefixRest', seed: s });

  return tasks;
}

// Truncate the task list so total HTTP requests <= cap.
export function applyCap(tasks, cap) {
  const kept = [];
  let n = 0;
  for (const t of tasks) {
    if (n + t.engines.length > cap) break;
    kept.push(t);
    n += t.engines.length;
  }
  return { tasks: kept, requests: n, dropped: tasks.length - kept.length };
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0].replace(/^#!.*\n/, ''));
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const { gates, stub } = await loadGates(args);
  const store = await loadStore(args);
  const scoreRow = await loadScorer(args);

  let { seeds, origin } = loadSeeds(args);
  if (args.limit > 0) seeds = seeds.slice(0, args.limit);

  const all = buildTasks({ seeds, quick: args.quick, top: args.top, engines: args.engines });
  const { tasks, requests, dropped } = applyCap(all, args.cap);

  const log = (...m) => { if (!args.quiet && !args.json) console.log(...m); };
  log(`suggest.mjs ${args.quick ? '--quick' : '(full)'}${args.dry ? ' --dry' : ''}`);
  log(`  seeds     ${seeds.length} (from ${origin})`);
  log(`  engines   ${args.engines.join(', ')}  ->  indexes: ${[...new Set(args.engines.map(e => ENGINES[e].family))].join(', ')}`);
  log(`  tasks     ${tasks.length} queries / ${requests} requests (cap ${args.cap}${dropped ? `, ${dropped} tasks dropped` : ''})`);
  log('');

  // Prior state: needed to merge evidence and to avoid clobbering the status of
  // rows a human already decided on.
  const known = new Map(); // normalized keyword -> { status, notes }
  let db = null;
  if (store) {
    db = args.db ? store.openDb(args.db) : store.openDb();
    for (const row of store.allKeywords(db)) known.set(row.keyword, { status: row.status, notes: row.notes });
  }

  // keyword -> aggregated evidence for THIS run
  const found = new Map();
  const stats = {
    requests: 0, ok: 0, failed: 0, suggestions: 0, echoes: 0, echoOnly: 0,
    tooShort: 0, tooLong: 0, rejected: 0, needsHuman: 0, accepted: 0,
    byEngine: {}, byPhase: {},
  };
  for (const e of args.engines) stats.byEngine[e] = { ok: 0, failed: 0, suggestions: 0 };

  const record = (kw, pos, engine, phase, seed, isEcho) => {
    let ev = found.get(kw);
    if (!ev) {
      ev = { n: 0, echo: 0, sum: 0, best: Infinity, engines: new Set(), idx: new Set(), seeds: new Set(), phases: new Set() };
      found.set(kw, ev);
    }
    ev.n += 1;
    ev.seeds.add(seed);
    ev.phases.add(phase);
    // An echo is the engine repeating our own query back — not evidence.
    // It still counts as a sighting, but contributes no position/agreement.
    if (isEcho) { ev.echo += 1; return; }
    ev.sum += pos;
    ev.best = Math.min(ev.best, pos);
    ev.engines.add(engine);
    ev.idx.add(ENGINES[engine].family);
  };

  // One serial worker per HOST, workers run concurrently. Politer per-host than
  // a single global queue, and ~3x faster wall-clock.
  const byHost = new Map();
  for (const t of tasks) {
    for (const e of t.engines) {
      const host = ENGINES[e].host;
      if (!byHost.has(host)) byHost.set(host, []);
      byHost.get(host).push({ ...t, engine: e });
    }
  }

  const started = Date.now();
  await Promise.all([...byHost.entries()].map(async ([host, queue]) => {
    for (let i = 0; i < queue.length; i++) {
      const job = queue[i];
      const eng = ENGINES[job.engine];
      stats.requests += 1;
      try {
        const json = await fetchJson(eng.url(job.q));
        const phrases = eng.parse(json);
        stats.ok += 1;
        stats.byEngine[job.engine].ok += 1;
        stats.byEngine[job.engine].suggestions += phrases.length;
        stats.suggestions += phrases.length;
        stats.byPhase[job.phase] = (stats.byPhase[job.phase] || 0) + phrases.length;
        const askedFor = gates.normalize(job.q);
        phrases.forEach((raw, pos) => {
          const kw = gates.normalize(String(raw));
          if (kw.length < MIN_LEN) { stats.tooShort += 1; return; }
          if (kw.length > MAX_LEN) { stats.tooLong += 1; return; }
          const isEcho = kw === askedFor;
          if (isEcho) stats.echoes += 1;
          record(kw, pos, job.engine, job.phase, job.seed, isEcho);
        });
      } catch (err) {
        // Per-source, per-request failures are non-fatal by design: one engine
        // rate-limiting must never abort the harvest.
        stats.failed += 1;
        stats.byEngine[job.engine].failed += 1;
        if (!args.quiet && !args.json && stats.byEngine[job.engine].failed <= 3) {
          console.warn(`  ! ${job.engine} "${job.q}" — ${err.message}`);
        }
      }
      if (i < queue.length - 1 && args.delay > 0) await sleep(args.delay);
    }
  }));

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);

  // ---- gate + upsert --------------------------------------------------------
  const upserts = [];
  for (const [kw, ev] of found) {
    const verdict = gates.relevant(kw);
    if (verdict === 'reject') { stats.rejected += 1; continue; }

    const cls = gates.classify(kw) || {};
    const fresh = {
      n: ev.n, echo: ev.echo, sum: ev.sum, best: ev.best,
      engines: [...ev.engines], idx: [...ev.idx], seeds: [...ev.seeds].slice(0, 5),
    };
    const prior = known.get(kw);
    let notes = mergeAcEvidence(prior?.notes, fresh, today);
    if (verdict === 'needs-human') notes = withGateReason(notes, 'autocomplete: gates.relevant=needs-human');

    const fields = {
      cluster: typeof gates.clusterOf === 'function' ? gates.clusterOf(kw) : undefined,
      content_type: cls.content_type,
      format: cls.format,
      intent: cls.intent,
      source: 'autocomplete',
      seed: fresh.seeds[0],
      notes,
    };
    for (const k of Object.keys(fields)) if (fields[k] === undefined) delete fields[k];

    // Score from the evidence we just assembled. scoreRow reads `notes` (and the
    // top-level mirror), so it must run AFTER fields is complete and BEFORE the
    // upsert — otherwise the row is written with score/demand NULL and sinks to
    // the bottom of every pickNext bucket.
    if (scoreRow) Object.assign(fields, scoreRow({ keyword: kw, ...fields }));

    const rec = { keyword: kw, verdict, fields, ev: JSON.parse(notes).ac, isNew: !prior };
    if (rec.ev.echoOnly) stats.echoOnly += 1;
    upserts.push(rec);
    if (verdict === 'needs-human') stats.needsHuman += 1; else stats.accepted += 1;

    if (db) {
      store.upsertKeyword(db, kw, fields);
      // upsertKeyword never touches status by contract. Flag needs-human rows
      // explicitly — but only when nobody has decided on them yet, so a
      // published/skipped/covered row is never demoted by a re-harvest.
      // reason=null is deliberate: see withGateReason above — a non-null reason
      // would overwrite the evidence JSON we just wrote.
      if (verdict === 'needs-human' && (!prior || prior.status === 'discovered')) {
        store.setStatus(db, kw, 'needs-human', null, null);
      }
    }
  }

  // ---- report ---------------------------------------------------------------
  // echo-only rows sort last: they carry no demand evidence at all.
  upserts.sort((a, b) =>
    (Number(a.ev.echoOnly) - Number(b.ev.echoOnly)) ||
    (b.ev.idx.length - a.ev.idx.length) ||
    ((a.ev.best ?? 99) - (b.ev.best ?? 99)) ||
    (b.ev.n - a.ev.n));

  if (args.json) {
    console.log(JSON.stringify({
      mode: args.quick ? 'quick' : 'full', dry: args.dry, stubGates: stub,
      seeds: seeds.length, seedOrigin: origin, engines: args.engines,
      elapsedSec: Number(elapsed), stats,
      keywords: upserts.map(u => ({ keyword: u.keyword, verdict: u.verdict, isNew: u.isNew, ...u.fields, ev: u.ev })),
    }, null, 2));
  } else {
    const tag = stub ? '[stub-gates] ' : '';
    for (const u of upserts.slice(0, args.quiet ? 0 : 400)) {
      const e = u.ev;
      console.log(
        `  ${tag}${u.isNew ? '+' : '~'} ${u.keyword}` +
        `  [${e.echoOnly ? 'ECHO-ONLY, no demand evidence' : `pos ${e.best}, n=${e.n}, idx=${e.idx.join('/')}`}` +
        `${u.fields.content_type ? `, ${u.fields.content_type}/${u.fields.intent || '?'}` : ''}]` +
        `${u.verdict === 'needs-human' ? '  <needs-human>' : ''}`
      );
    }
    console.log('');
    console.log(`  requests    ${stats.requests} (${stats.ok} ok, ${stats.failed} failed) in ${elapsed}s`);
    for (const [e, s] of Object.entries(stats.byEngine)) {
      console.log(`    ${e.padEnd(8)} ${s.ok} ok / ${s.failed} failed, ${s.suggestions} suggestions`);
    }
    console.log(`  suggestions ${stats.suggestions} raw -> ${found.size} unique (${stats.echoes} echoes; ${stats.echoOnly} kept rows have NO demand evidence)`);
    console.log(`  gated       ${stats.accepted} accept, ${stats.needsHuman} needs-human, ${stats.rejected} reject, ${stats.tooShort + stats.tooLong} out of length`);
    console.log(`  ${args.dry ? 'DRY RUN — nothing written' : `upserted    ${upserts.length} rows`}`);
  }

  if (db && typeof store.exportState === 'function') store.exportState(db);
  if (db && typeof db.close === 'function') db.close();
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  main().catch(err => { console.error(err); process.exit(1); });
}
