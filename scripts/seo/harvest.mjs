#!/usr/bin/env node
/**
 * harvest.mjs — real user questions.
 *
 * WHY THE DEFAULT MODE IS "UNANSWERED", NOT "RECENT"
 * Stack Overflow's google-analytics tag has ~21,121 questions LIFETIME but only
 * ~23 in the past year. It is an ARCHIVE, not a feed. Polling it daily for new
 * questions returns nothing. So:
 *
 *   default  — UNANSWERED questions sorted by VOTES. Proven demand (people
 *              upvoted it) with zero competition (nobody answered it). This is
 *              the single best recurring source and it is safe to run daily
 *              because the ranking shifts as votes accrue.
 *   --archive— a ONE-OFF bulk mine of the lifetime corpus. Deliberately NOT
 *              wired into the daily routine: it would burn the 300/day quota
 *              re-reading a corpus that does not change.
 *   HN Algolia — free, keyless, no WAF, and where the GA4-exodus / privacy
 *              discourse actually happens. Runs in both modes.
 *
 * QUOTA. Anonymous StackExchange is 300 requests/day per IP. Every response
 * carries `quota_remaining`; this script reads it live rather than guessing,
 * stops at a reserve floor, and honours the `backoff` field when present.
 *
 * Every source is independently non-fatal: StackExchange being rate-limited
 * must never stop the HN harvest, and vice versa.
 *
 * CLI
 *   node harvest.mjs                       # daily: unanswered-by-votes + HN
 *   node harvest.mjs --archive             # one-off bulk mine (NOT for cron)
 *   node harvest.mjs --dry --source so     # smoke test, no DB write
 *
 * Flags
 *   --archive           bulk lifetime mine instead of the unanswered feed
 *   --source LIST       comma list of: so, hn (default both)
 *   --tags LIST         override the StackExchange tag list
 *   --pages N           pages per tag (default 1 unanswered / 10 archive)
 *   --from-page N       resume an interrupted archive run (default 1)
 *   --pagesize N        1..100 (default 100)
 *   --min-score N       drop questions below this score (default 0 / 3 archive)
 *   --reserve N         stop when quota_remaining drops to this (default 30)
 *   --delay MS          delay between API calls (default 350)
 *   --dry               do everything except touch the DB
 *   --json              machine-readable summary
 *   --quiet             suppress per-keyword logging
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

// StackExchange treats `tagged=a;b` as AND (intersection), so each tag is
// queried separately rather than joined.
const SO_TAGS = [
  'google-analytics',
  'google-tag-manager',
  'analytics',
  'google-analytics-4',
  'web-analytics',
  'gtag.js',
  'third-party-cookies',
];

// HN Algolia queries — the analytics/privacy discourse beat.
const HN_QUERIES = [
  'google analytics',
  'ga4',
  'web analytics',
  'privacy analytics',
  'cookie banner',
  'self-hosted analytics',
  'plausible analytics',
  'ad blocker analytics',
  'ai crawler traffic',
  'gdpr tracking',
];

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const SE_BASE = 'https://api.stackexchange.com/2.3';
const HN_BASE = 'https://hn.algolia.com/api/v1';

const MIN_LEN = 8;
const MAX_LEN = 90;

// ---------------------------------------------------------------------------
// args
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const a = {
    archive: false, dry: false, json: false, quiet: false,
    sources: ['so', 'hn'], tags: SO_TAGS, pages: 0, fromPage: 1,
    pagesize: 100, minScore: null, reserve: 30, delay: 350, hnMinPoints: 20, db: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const next = () => argv[++i];
    if (k === '--archive') a.archive = true;
    else if (k === '--dry') a.dry = true;
    else if (k === '--json') a.json = true;
    else if (k === '--quiet') a.quiet = true;
    else if (k === '--source' || k === '--sources') {
      a.sources = String(next() || '').split(',').map(s => s.trim()).filter(s => s === 'so' || s === 'hn');
      if (!a.sources.length) a.sources = ['so', 'hn'];
    } else if (k === '--tags') a.tags = String(next() || '').split(',').map(s => s.trim()).filter(Boolean);
    else if (k === '--pages') a.pages = Number(next()) || 0;
    else if (k === '--from-page') a.fromPage = Math.max(1, Number(next()) || 1);
    else if (k === '--pagesize') a.pagesize = Math.min(100, Math.max(1, Number(next()) || 100));
    else if (k === '--min-score') a.minScore = Number(next()) || 0;
    else if (k === '--hn-min-points') a.hnMinPoints = Number(next() ?? 20);
    else if (k === '--reserve') a.reserve = Number(next() ?? 30);
    else if (k === '--delay') a.delay = Number(next() ?? 350);
    else if (k === '--db') a.db = next();
    else if (k === '--help' || k === '-h') a.help = true;
  }
  if (!a.pages) a.pages = a.archive ? 10 : 1;
  if (a.minScore === null) a.minScore = a.archive ? 3 : 0;
  return a;
}

// ---------------------------------------------------------------------------
// module wiring — kwstore.mjs / gates.mjs are owned by other agents.
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
      console.error(`\nharvest.mjs: cannot load ./gates.mjs — ${err.message}`);
      console.error('gates.mjs is owned by the `gates` agent and must exist before a real run.');
      console.error('Re-run with --dry to smoke-test the fetch layer without it.\n');
      process.exit(2);
    }
    console.error('\n!! gates.mjs missing — --dry run using a THROWAWAY built-in stub.');
    console.error('!! Every classification below is [stub-gates] and is NOT the real gate.\n');
    return { gates: stubGates(), stub: true };
  }
}

function stubGates() {
  const TOPICAL = /analytic|traffic|heatmap|funnel|conversion|attribution|utm|ga4|gtm|cookie|gdpr|visitor|pageview|bounce|tracking|track|metric|dashboard|session|referral/i;
  return {
    normalize: kw => String(kw).trim().toLowerCase().replace(/\s+/g, ' '),
    clusterOf: kw => String(kw).toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/)
      .filter(t => t && !['the', 'a', 'to', 'for', 'of', 'in', 'is', 'how', 'best', 'vs'].includes(t))
      .sort().join('-'),
    relevant: kw => (TOPICAL.test(kw) ? 'accept' : 'reject'),
    classify: () => ({ content_type: 'guide', format: 'howto', intent: 'informational' }),
  };
}

// See suggest.mjs: an unscored row sorts LAST under every pickNext bucket, so
// scoring at write time is what makes a harvested keyword reachable at all.
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
    console.error(`\nharvest.mjs: cannot load ./kwstore.mjs — ${err.message}`);
    console.error('kwstore.mjs is owned by the `kwstore` agent. Use --dry until it lands.\n');
    process.exit(2);
  }
}

// ---------------------------------------------------------------------------
// fetch
// ---------------------------------------------------------------------------
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchJson(url, { timeout = 20000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': UA, Accept: 'application/json', 'Accept-Encoding': 'gzip, deflate' },
    });
    if (!res.ok) {
      let detail = '';
      try {
        const body = await res.json();
        if (body?.error_message) detail = ` — ${body.error_name || ''} ${body.error_message}`;
      } catch { /* body not json */ }
      throw new Error(`HTTP ${res.status}${detail}`);
    }
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

// ---------------------------------------------------------------------------
// title cleanup
// ---------------------------------------------------------------------------
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'", '#34': '"' };

export function decodeEntities(s) {
  return String(s)
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&([a-z]+|#\d+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m);
}

/**
 * STRUCTURAL filter only — is this string shaped like source code rather than
 * like something a human would type into a search box? Topical relevance is
 * gates.relevant()'s job, not ours; this only strips titles that no gate should
 * have to reason about ("NSValueTransformer", "gtag('config', ...)").
 */
export function looksLikeCode(title) {
  const s = String(title);
  if (/[{}[\]<>|\\^~`]/.test(s)) return true;              // brackets, pipes, backticks
  if (/::|=>|->|\+\+|&&|\|\|/.test(s)) return true;         // operators
  if (/\w\(\)|\(\s*\)/.test(s)) return true;                // function call syntax
  if (/\.(js|ts|jsx|tsx|py|php|java|swift|kt|rb|cs|go|xml|json|yml|html|css|sh)\b/i.test(s)) return true;
  if (/\b[a-z]+[A-Z][a-zA-Z]*[A-Z]/.test(s)) return true;   // 2+ hump camelCase identifier
  if (/\b[A-Z]{4,}\b/.test(s)) return true;                 // ALLCAPS constant
  if (/\b\w+\.\w+\.\w+/.test(s)) return true;               // a.b.c namespace
  if (/\bv?\d+\.\d+(\.\d+)?\b/.test(s)) return true;        // version numbers
  return false;
}

/**
 * Show HN / Launch HN are PRODUCT ANNOUNCEMENTS, not queries. Nobody searches
 * "ktx - open-source executable context layer for data agents". Left in, they
 * dominate the harvest by points (a launch easily out-scores real discourse)
 * and quietly fill the backlog with unrankable strings.
 *
 * Ask HN is the opposite — a literal user question — so it is kept, with the
 * prefix stripped. Editorial story titles are kept too.
 */
export function isHnLaunch(title) {
  return /^(Show|Launch)\s+HN\b/i.test(String(title).trim());
}

// Strip the HN title furniture that is not part of the query.
export function cleanHnTitle(title) {
  return decodeEntities(title)
    .replace(/^(Show|Ask|Tell|Launch)\s+HN:?\s*/i, '')
    .replace(/\s*\([^)]*\.[a-z]{2,}\)\s*$/i, '')  // trailing (domain.com)
    .replace(/\s*\[(pdf|video|2\d{3})\]\s*/gi, ' ')
    .trim();
}

export function cleanSoTitle(title) {
  return decodeEntities(title).replace(/\s*\?+\s*$/, '').replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// evidence — stored as JSON in the `notes` column under a per-source key,
// because the locked keywords schema has no column for question provenance and
// inventing a search_volume number would poison volume provenance.
// ---------------------------------------------------------------------------
/**
 * Fold a gate verdict INTO the notes JSON.
 *
 * kwstore.setStatus(db, kw, status, slug, reason) writes its `reason` argument
 * to the **notes column** (`notes = COALESCE(?, notes)`), so passing a reason
 * overwrites the whole evidence blob with plain text — which also breaks
 * score.mjs, whose evidenceOf() only parses notes starting with '{'. The reason
 * is already recorded in kwstore's `actions` ledger, so carry it in the JSON and
 * pass reason=null to setStatus.
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

export function mergeEvidence(priorNotes, key, fresh, today) {
  let base = {};
  try {
    base = priorNotes ? (typeof priorNotes === 'string' ? JSON.parse(priorNotes) : priorNotes) : {};
  } catch { base = {}; }
  if (!base || typeof base !== 'object') base = {};
  const prev = base[key] || null;

  base[key] = {
    n: (prev?.n || 0) + 1,
    score: Math.max(prev?.score ?? -Infinity, fresh.score ?? 0),
    views: Math.max(prev?.views ?? 0, fresh.views ?? 0),
    ...(fresh.comments != null ? { comments: Math.max(prev?.comments ?? 0, fresh.comments) } : {}),
    ...(fresh.unanswered != null ? { unanswered: fresh.unanswered } : {}),
    ...(fresh.tags ? { tags: [...new Set([...(prev?.tags || []), ...fresh.tags])].slice(0, 8) } : {}),
    links: [...new Set([...(prev?.links || []), fresh.link].filter(Boolean))].slice(0, 3),
    asked: fresh.asked || prev?.asked,
    first: prev?.first || today,
    last: today,
  };

  // TOP-LEVEL MIRROR of the demand signal, for score.mjs.
  //
  // KNOWN GAP, flagged deliberately rather than papered over: score.mjs has no
  // tier for community sources. `source` of "stackoverflow"/"hn" matches none of
  // its provenance regexes, so these rows land in the `prior` tier (weight 0.5,
  // volume 0) and EVERY harvested row scores an identical demand of 0.5 — which
  // throws away the entire point of sorting unanswered questions by votes.
  //
  // The fix belongs in score.mjs (a `community` tier keyed off source, deriving
  // volume from votes+views). It is NOT to relabel these rows as `autocomplete`
  // to smuggle them into a better-weighted tier — that would poison provenance,
  // which is the one thing the scoring model depends on being honest.
  // Emitting votes/views at the root means that fix is a few lines there and
  // needs no re-harvest here.
  base.votes = Math.max(base.votes ?? 0, fresh.score ?? 0);
  base.views = Math.max(base.views ?? 0, fresh.views ?? 0);

  return JSON.stringify(base);
}

// ---------------------------------------------------------------------------
// StackExchange
// ---------------------------------------------------------------------------
function seUrl(kind, { tag, page, pagesize }) {
  const common = `site=stackoverflow&page=${page}&pagesize=${pagesize}&tagged=${encodeURIComponent(tag)}`;
  return kind === 'unanswered'
    ? `${SE_BASE}/questions/unanswered?order=desc&sort=votes&${common}`
    : `${SE_BASE}/questions?order=desc&sort=votes&${common}`;
}

async function harvestStackExchange(args, sink, stats) {
  const kind = args.archive ? 'archive' : 'unanswered';
  let quota = null;

  for (const tag of args.tags) {
    for (let page = args.fromPage; page < args.fromPage + args.pages; page++) {
      if (quota != null && quota <= args.reserve) {
        stats.so.quotaStopped = true;
        return quota;
      }
      const url = seUrl(kind, { tag, page, pagesize: args.pagesize });
      let json;
      try {
        stats.so.requests += 1;
        json = await fetchJson(url);
      } catch (err) {
        // Per-request non-fatal: one bad tag must not end the harvest.
        stats.so.failed += 1;
        stats.so.errors.push(`${tag} p${page}: ${err.message}`);
        await sleep(args.delay);
        continue;
      }

      if (typeof json.quota_remaining === 'number') quota = json.quota_remaining;
      stats.so.quotaRemaining = quota;

      const items = Array.isArray(json.items) ? json.items : [];
      stats.so.items += items.length;
      for (const q of items) {
        if ((q.score ?? 0) < args.minScore) { stats.so.lowScore += 1; continue; }
        const title = cleanSoTitle(q.title || '');
        if (!title) continue;
        if (looksLikeCode(q.title || '')) { stats.so.codey += 1; continue; }
        sink({
          raw: title,
          key: 'so',
          source: 'stackoverflow',
          seed: tag,
          fresh: {
            score: q.score ?? 0,
            views: q.view_count ?? 0,
            unanswered: !q.is_answered,
            tags: Array.isArray(q.tags) ? q.tags : [],
            link: q.link,
            asked: q.creation_date ? new Date(q.creation_date * 1000).toISOString().slice(0, 10) : null,
          },
        });
      }

      // Honour the API's own throttle signal before anything else.
      if (json.backoff) {
        stats.so.backoffs += 1;
        await sleep((Number(json.backoff) + 1) * 1000);
      }
      if (!json.has_more) break;
      await sleep(args.delay);
    }
  }
  return quota;
}

// ---------------------------------------------------------------------------
// HN Algolia
// ---------------------------------------------------------------------------
async function harvestHn(args, sink, stats) {
  for (const q of HN_QUERIES) {
    const url = `${HN_BASE}/search_by_date?tags=story&query=${encodeURIComponent(q)}&hitsPerPage=50`;
    try {
      stats.hn.requests += 1;
      const json = await fetchJson(url);
      const hits = Array.isArray(json.hits) ? json.hits : [];
      stats.hn.items += hits.length;
      for (const h of hits) {
        if (isHnLaunch(h.title || '')) { stats.hn.launches += 1; continue; }
        if ((h.points ?? 0) < args.hnMinPoints) { stats.hn.lowScore += 1; continue; }
        const title = cleanHnTitle(h.title || '');
        if (!title) continue;
        if (looksLikeCode(h.title || '')) { stats.hn.codey += 1; continue; }
        sink({
          raw: title,
          key: 'hn',
          source: 'hn',
          seed: q,
          fresh: {
            score: h.points ?? 0,
            comments: h.num_comments ?? 0,
            views: 0,
            link: `https://news.ycombinator.com/item?id=${h.objectID}`,
            asked: h.created_at ? String(h.created_at).slice(0, 10) : null,
          },
        });
      }
    } catch (err) {
      stats.hn.failed += 1;
      stats.hn.errors.push(`${q}: ${err.message}`);
    }
    await sleep(args.delay);
  }
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

  const known = new Map();
  let db = null;
  if (store) {
    db = args.db ? store.openDb(args.db) : store.openDb();
    for (const row of store.allKeywords(db)) known.set(row.keyword, { status: row.status, notes: row.notes });
  }

  const mk = () => ({ requests: 0, failed: 0, items: 0, codey: 0, lowScore: 0, launches: 0, backoffs: 0, errors: [], quotaRemaining: null, quotaStopped: false });
  const stats = { so: mk(), hn: mk(), tooShort: 0, tooLong: 0, rejected: 0, needsHuman: 0, accepted: 0 };

  // keyword -> { key, source, seed, fresh }
  const candidates = new Map();
  const sink = ({ raw, key, source, seed, fresh }) => {
    const kw = gates.normalize(raw);
    if (kw.length < MIN_LEN) { stats.tooShort += 1; return; }
    if (kw.length > MAX_LEN) { stats.tooLong += 1; return; }
    const prev = candidates.get(kw);
    if (prev && (prev.fresh.score ?? 0) >= (fresh.score ?? 0)) return;
    candidates.set(kw, { key, source, seed, fresh });
  };

  const started = Date.now();
  // Sources are awaited independently so one rejecting does not abort the other.
  if (args.sources.includes('so')) {
    try { await harvestStackExchange(args, sink, stats); }
    catch (err) { stats.so.errors.push(`fatal: ${err.message}`); }
  }
  if (args.sources.includes('hn')) {
    try { await harvestHn(args, sink, stats); }
    catch (err) { stats.hn.errors.push(`fatal: ${err.message}`); }
  }
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);

  // ---- gate + upsert --------------------------------------------------------
  const upserts = [];
  for (const [kw, c] of candidates) {
    const verdict = gates.relevant(kw);
    if (verdict === 'reject') { stats.rejected += 1; continue; }

    const cls = gates.classify(kw) || {};
    const prior = known.get(kw);
    let notes = mergeEvidence(prior?.notes, c.key, c.fresh, today);
    if (verdict === 'needs-human') notes = withGateReason(notes, `${c.source}: gates.relevant=needs-human`);

    const fields = {
      cluster: typeof gates.clusterOf === 'function' ? gates.clusterOf(kw) : undefined,
      content_type: cls.content_type,
      format: cls.format,
      intent: cls.intent,
      source: c.source,
      seed: c.seed,
      notes,
    };
    for (const k of Object.keys(fields)) if (fields[k] === undefined) delete fields[k];

    // Must run after `fields` is complete (scoreRow reads `notes`) and before
    // the upsert, or the row lands with score/demand NULL and is never picked.
    if (scoreRow) Object.assign(fields, scoreRow({ keyword: kw, ...fields }));

    upserts.push({ keyword: kw, verdict, fields, ev: JSON.parse(notes)[c.key], isNew: !prior });
    if (verdict === 'needs-human') stats.needsHuman += 1; else stats.accepted += 1;

    if (db) {
      store.upsertKeyword(db, kw, fields);
      // reason=null is deliberate: see withGateReason above — a non-null reason
      // would overwrite the evidence JSON we just wrote.
      if (verdict === 'needs-human' && (!prior || prior.status === 'discovered')) {
        store.setStatus(db, kw, 'needs-human', null, null);
      }
    }
  }

  upserts.sort((a, b) => (b.ev.score ?? 0) - (a.ev.score ?? 0));

  if (args.json) {
    console.log(JSON.stringify({
      mode: args.archive ? 'archive' : 'unanswered', dry: args.dry, stubGates: stub,
      sources: args.sources, elapsedSec: Number(elapsed), stats,
      keywords: upserts.map(u => ({ keyword: u.keyword, verdict: u.verdict, isNew: u.isNew, ...u.fields, ev: u.ev })),
    }, null, 2));
  } else {
    const tag = stub ? '[stub-gates] ' : '';
    console.log(`harvest.mjs ${args.archive ? '--archive (ONE-OFF, not for cron)' : '(unanswered-by-votes)'}${args.dry ? ' --dry' : ''}`);
    console.log(`  sources ${args.sources.join(', ')}  pages/tag ${args.pages}  min-score ${args.minScore}`);
    console.log('');
    for (const u of upserts.slice(0, args.quiet ? 0 : 60)) {
      console.log(`  ${tag}${u.isNew ? '+' : '~'} [${String(u.ev.score).padStart(4)}] ${u.keyword}`);
      if (u.ev.links?.[0]) console.log(`         ${u.ev.links[0]}`);
    }
    console.log('');
    console.log(`  stackexchange  ${stats.so.requests} req (${stats.so.failed} failed), ${stats.so.items} questions, quota_remaining ${stats.so.quotaRemaining ?? 'n/a'}${stats.so.quotaStopped ? ' STOPPED AT RESERVE' : ''}`);
    console.log(`  hn algolia     ${stats.hn.requests} req (${stats.hn.failed} failed), ${stats.hn.items} stories`);
    for (const e of [...stats.so.errors, ...stats.hn.errors].slice(0, 5)) console.log(`    ! ${e}`);
    console.log(`  filtered       ${stats.so.codey + stats.hn.codey} code-shaped, ${stats.hn.launches} Show/Launch HN, ${stats.so.lowScore + stats.hn.lowScore} below min-score, ${stats.tooShort + stats.tooLong} out of length`);
    console.log(`  gated          ${stats.accepted} accept, ${stats.needsHuman} needs-human, ${stats.rejected} reject`);
    console.log(`  ${args.dry ? 'DRY RUN — nothing written' : `upserted       ${upserts.length} rows`} in ${elapsed}s`);
  }

  if (db && typeof store.exportState === 'function') store.exportState(db);
  if (db && typeof db.close === 'function') db.close();
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  main().catch(err => { console.error(err); process.exit(1); });
}
