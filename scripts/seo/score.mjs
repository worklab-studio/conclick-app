// Keyword scoring for the Conclick pSEO autopilot.
//
//   scoreRow(row) -> { demand, opportunity, value, fit, score }
//
// The canonical SEO base formula is
//
//   log10(volume + 10) * ((100 - kd) / 50) * intentBoost
//
// which is fine when you PAY for volume and difficulty. We do not. With no paid
// data every row arrives with search_volume = null and keyword_difficulty =
// null, so opportunity collapses to 1.0, demand collapses to 1.0, and every
// single keyword in the store scores an identical 1.3. The picker then degrades
// into "whatever ORDER BY score returned first", which is alphabetical noise.
//
// The fix is to make DEMAND a function of EVIDENCE PROVENANCE rather than of a
// number we do not have. Four tiers, strongest first:
//
//   1.00  gsc         real Search Console impressions for a URL we own
//   0.85  wikipedia   real pageviews for the concept's article
//   0.70  autocomplete a proxy built from cross-engine agreement x suggestion
//                     POSITION — ordinal rank in a suggest dropdown is derived
//                     from actual query frequency, so it carries real signal
//   0.50  prior       nothing but a seed; a flat floor, deliberately weak
//
// All four factors are persisted separately on the row so any pick is
// auditable after the fact ("why did this beat that?" is answerable).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalize, classify, isNavigational } from './gates.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SEEDS_PATH = path.join(HERE, 'seeds.txt');

// ---------------------------------------------------------------------------
// constants
// ---------------------------------------------------------------------------

export const INTENT_BOOST = {
  transactional: 1.4,
  commercial: 1.3,
  informational: 1.0,
  navigational: 0.6, // the only penalty — see gates.isNavigational
};

export const PROVENANCE_WEIGHT = {
  gsc: 1.0,
  paid: 1.0, // ahrefs/semrush/dataforseo if we ever buy data
  wikipedia: 0.85,
  autocomplete: 0.7,
  prior: 0.5,
};

// Only a fraction of a Wikipedia article's pageviews correspond to commercial
// search demand for the phrasing we would target, so scale before the log.
const WIKI_SEARCH_SHARE = 0.35;

// Ceiling for the autocomplete pseudo-volume: a #1 suggestion agreed on by all
// three engines. Everything else decays off this.
const AC_BASE_VOLUME = 900;
const AC_MAX_ENGINES = 3;

// Default keyword difficulty when unknown. 50 -> opportunity exactly 1.0.
const DEFAULT_KD = 50;

// ---------------------------------------------------------------------------
// seed groups -> cluster-level intent fallback
// ---------------------------------------------------------------------------

let _seedIndex = null;

/**
 * Parse `# cluster: <name> | intent: <fallback>` headers out of seeds.txt and
 * map every seed line beneath a header to that header's fallback intent.
 * Lazy + fault tolerant: a missing seeds.txt yields empty maps, never a throw.
 */
function seedIndex() {
  if (_seedIndex) return _seedIndex;
  const bySeed = new Map(); // normalized seed  -> { group, intent }
  const byGroup = new Map(); // group name       -> intent
  try {
    const raw = fs.readFileSync(SEEDS_PATH, 'utf8');
    let group = null;
    let intent = null;
    for (const line of raw.split('\n')) {
      const t = line.trim();
      if (!t) continue;
      const header = t.match(/^#\s*cluster:\s*([^|]+?)\s*\|\s*intent:\s*([a-z-]+)\s*$/i);
      if (header) {
        group = header[1].trim().toLowerCase();
        intent = header[2].trim().toLowerCase();
        byGroup.set(group, intent);
        continue;
      }
      if (t.startsWith('#')) continue;
      if (group) bySeed.set(normalize(t), { group, intent });
    }
  } catch {
    /* no seeds.txt yet — fallbacks simply do not fire */
  }
  _seedIndex = { bySeed, byGroup };
  return _seedIndex;
}

/** Test hook: drop the cached seeds.txt parse. */
export function resetSeedIndex() {
  _seedIndex = null;
}

function seedFallbackIntent(row) {
  const { bySeed, byGroup } = seedIndex();
  const seed = normalize(row.seed);
  if (seed && bySeed.has(seed)) return bySeed.get(seed).intent;
  // `cluster` on the row is normally gates.clusterOf output (a token
  // signature), but tolerate a literal seed-group name being stored there.
  const cluster = normalize(row.cluster);
  if (cluster && byGroup.has(cluster)) return byGroup.get(cluster);
  return null;
}

// ---------------------------------------------------------------------------
// evidence
// ---------------------------------------------------------------------------

function num(v) {
  const n = typeof v === 'string' ? Number(v) : v;
  return Number.isFinite(n) ? n : null;
}

/**
 * Pull structured evidence off a row. Lives in `notes` as JSON because the
 * kwstore column list is locked, but top-level fields win if a future migration
 * promotes them.
 */
function evidenceOf(row) {
  let ev = {};
  if (row.notes && typeof row.notes === 'object') {
    ev = row.notes;
  } else if (typeof row.notes === 'string' && row.notes.trim().startsWith('{')) {
    try {
      ev = JSON.parse(row.notes);
    } catch {
      ev = {};
    }
  }
  const engines = row.ac_engines ?? ev.engines ?? ev.ac_engines ?? null;
  return {
    gscImpressions: num(row.gsc_impressions ?? ev.gsc_impressions ?? ev.impressions),
    wikiPageviews: num(row.wiki_pageviews ?? ev.wiki_pageviews ?? ev.pageviews),
    engineCount: Array.isArray(engines) ? engines.length : num(engines),
    position: num(row.ac_position ?? ev.position ?? ev.ac_position),
  };
}

/**
 * Which evidence tier is this row standing on? Explicit `source` wins so the
 * harvester can label rows directly; otherwise infer from what data exists.
 */
export function provenanceOf(row) {
  const src = normalize(row.source);
  if (/gsc|search.?console|impression/.test(src)) return 'gsc';
  if (/ahrefs|semrush|dataforseo|keywords?.?everywhere|moz|paid/.test(src)) return 'paid';
  if (/wiki/.test(src)) return 'wikipedia';
  if (/autocomplete|autosuggest|suggest|paa|serp/.test(src)) return 'autocomplete';

  const ev = evidenceOf(row);
  if (ev.gscImpressions != null) return 'gsc';
  if (ev.wikiPageviews != null) return 'wikipedia';
  if (ev.engineCount != null || ev.position != null) return 'autocomplete';
  if (num(row.search_volume) != null) return 'paid';
  return 'prior';
}

/**
 * Autocomplete pseudo-volume.
 *
 * Two real signals, multiplied:
 *   agreement  — how many independent engines surfaced the suggestion. Three
 *                engines independently agreeing is a much stronger frequency
 *                claim than one.
 *   position   — rank in the dropdown. Suggest ordering is frequency-derived,
 *                so an ordinal discount (the NDCG 1/log2(rank+1) curve) turns
 *                rank back into something volume-shaped: #1 -> 1.00,
 *                #2 -> 0.63, #5 -> 0.39, #10 -> 0.29.
 */
export function autocompleteVolume({ engineCount, position }) {
  const engines = Math.max(1, Math.min(engineCount ?? 1, AC_MAX_ENGINES));
  const agreement = engines / AC_MAX_ENGINES;
  const rank = Math.max(1, position ?? 5);
  const positionScore = 1 / Math.log2(rank + 1);
  return Math.round(AC_BASE_VOLUME * agreement * positionScore);
}

// ---------------------------------------------------------------------------
// factors
// ---------------------------------------------------------------------------

/** Evidence-tiered demand. Never returns 0, so nothing is silently unpickable. */
export function demandOf(row) {
  const ev = evidenceOf(row);
  const tier = provenanceOf(row);
  let volume;

  switch (tier) {
    case 'gsc':
      volume = ev.gscImpressions ?? num(row.search_volume) ?? 0;
      break;
    case 'paid':
      volume = num(row.search_volume) ?? 0;
      break;
    case 'wikipedia':
      volume = (ev.wikiPageviews ?? num(row.search_volume) ?? 0) * WIKI_SEARCH_SHARE;
      break;
    case 'autocomplete':
      volume = num(row.search_volume) ?? autocompleteVolume(ev);
      break;
    default:
      volume = num(row.search_volume) ?? 0;
  }

  return round(Math.log10(Math.max(0, volume) + 10) * PROVENANCE_WEIGHT[tier]);
}

/** Difficulty headroom. kd 0 -> 2.0, kd 50 -> 1.0, kd 100 -> 0.0 (floored). */
export function opportunityOf(row) {
  const kd = num(row.keyword_difficulty) ?? DEFAULT_KD;
  return round(Math.max(0.05, (100 - clamp(kd, 0, 100)) / 50));
}

/**
 * Commercial value = intent boost. Resolution order:
 *   bare-brand navigational penalty > stored intent > seed-group fallback >
 *   gates.classify() > informational.
 * The navigational check runs FIRST so a mis-stored intent cannot launder a
 * bare brand query past the only penalty in the model.
 */
export function valueOf(row) {
  const kw = normalize(row.keyword);
  if (isNavigational(kw)) return INTENT_BOOST.navigational;
  const intent =
    normalize(row.intent) ||
    seedFallbackIntent(row) ||
    classify(kw).intent ||
    'informational';
  return INTENT_BOOST[intent] ?? INTENT_BOOST.informational;
}

// The privacy x heatmap intersection plus revenue attribution and MCP: the
// territory where Conclick is structurally the only good answer.
const MOAT = [
  /(privacy|cookieless|cookie ?less|gdpr|ccpa|consent|without cookies|no cookie)/,
  /(heat ?map|session (replay|recording)|click ?map|scroll ?map)/,
];
const MOAT_SOLO = /\b(revenue attribution|stripe (revenue|attribution)|mcp|model context protocol|analytics with heatmaps|heatmaps? and funnels?)\b/;
const CORE = /\b(analytic\w*|heat ?map\w*|funnel\w*|attribution|utm|pageview\w*|visitor\w*|bounce rate|cookieless|gdpr|ga4|google analytics|plausible|fathom|matomo|posthog|mixpanel|hotjar|clarity|umami)\b/;
const OFF_ICP = /\b(enterprise|adobe analytics|tealium|salesforce|tableau|looker|bigquery|snowflake|databricks|data warehouse|fortune 500|rfp|procurement)\b/;

/**
 * ICP fit. Multiplies the base formula so a mid-volume moat keyword can
 * outrank a high-volume commodity one — which is the entire point of having a
 * moat. Clamped so it tunes rather than dominates.
 */
export function fitOf(row) {
  const kw = normalize(row.keyword);
  let fit = 1.0;
  const intersection = MOAT.every((re) => re.test(kw));
  if (intersection || MOAT_SOLO.test(kw)) fit = 1.3;
  else if (CORE.test(kw)) fit = 1.1;
  if (OFF_ICP.test(kw)) fit *= 0.7;
  return round(clamp(fit, 0.5, 1.4));
}

// ---------------------------------------------------------------------------
// scoreRow
// ---------------------------------------------------------------------------

/**
 * Score one keyword row. Pure — reads the row, returns the four factors and
 * their product. Callers persist all five columns so picks stay auditable.
 */
export function scoreRow(row = {}) {
  const demand = demandOf(row);
  const opportunity = opportunityOf(row);
  const value = valueOf(row);
  const fit = fitOf(row);
  const score = round(demand * opportunity * value * fit);
  return { demand, opportunity, value, fit, score };
}

// ---------------------------------------------------------------------------

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}
function round(n) {
  return Number.isFinite(n) ? Math.round(n * 10000) / 10000 : 0;
}

export const _internals = { seedIndex, evidenceOf, WIKI_SEARCH_SHARE, AC_BASE_VOLUME, DEFAULT_KD };
