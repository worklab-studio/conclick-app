// Picks the single serif word that sits on a page's mesh art.
//
// Deterministic and total: every entry gets a word, the same word, forever —
// because the word is baked into the OG card that social platforms and search
// engines cache. A word that changes between deploys means a card that no longer
// matches the page people already shared.
//
// Pure module — no React, no Next, no fs.

import type { ContentType } from '@/content/schema';

/** Structurally accepts a full ContentEntry, or anything with a slug. */
export interface HeroWordSource {
  slug: string;
  h1?: string;
  type?: ContentType;
  heroWord?: string;
}

/**
 * The string to seed the art with — pass this to MeshHero's `slug` prop and to
 * meshSpec(), NOT entry.slug.
 *
 * Slugs are only unique WITHIN a content type: /alternatives/fathom and
 * /vs/fathom are two different pages that both have slug "fathom", and seeding
 * on the bare slug would hand them byte-identical hero art. Nine of the current
 * entries collide this way (fathom, plausible, umami, matomo, mixpanel, posthog,
 * hotjar, google-analytics, and the utm glossary/tool pair). Qualifying with the
 * type makes the seed unique per page and keeps it stable forever.
 */
export function meshKeyFor(entry: { type?: ContentType; slug: string }): string {
  return entry.type ? `${entry.type}/${entry.slug}` : entry.slug;
}

/**
 * Domain nouns that read well as a giant display word. Checked first and in this
 * order, so "why-revenue-attribution-matters" resolves to the punchy "revenue."
 * rather than the merely-longest "attribution.".
 */
const PREFERRED = [
  'revenue',
  'funnel',
  'funnels',
  'heatmap',
  'heatmaps',
  'growth',
  'churn',
  'signal',
  'traffic',
  'clicks',
  'sessions',
  'visitors',
  'sampling',
  'attribution',
  'conversion',
  'privacy',
  'cookies',
  'cookieless',
  'consent',
  'bounce',
  'vanity',
  'metrics',
  'dropoff',
  'checkout',
  'pricing',
  'tracking',
  'insights',
  'banners',
  'gdpr',
  'utm',
];

/** Words that carry no meaning on their own at 130px. */
const STOP = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'best', 'but', 'by', 'can', 'do',
  'does', 'for', 'from', 'get', 'has', 'have', 'how', 'in', 'is', 'it', 'its',
  'my', 'no', 'not', 'of', 'on', 'or', 'our', 'should', 'so', 'ct', 'that',
  'the', 'their', 'them', 'to', 'up', 'use', 'vs', 'was', 'we', 'what', 'when',
  'why', 'will', 'with', 'you', 'your', 'guide', 'about', 'into', 'more',
]);

/** Last-resort word per content type, so nothing ever renders wordless. */
const BY_TYPE: Record<ContentType, string> = {
  comparison: 'versus',
  alternative: 'instead',
  tool: 'toolkit',
  glossary: 'defined',
  useCase: 'built',
  guide: 'playbook',
  blog: 'signal',
};

const MIN_LEN = 3;
const MAX_LEN = 12;

/**
 * The serif word for an entry.
 *
 * Precedence: explicit `heroWord` -> a preferred domain noun in the slug ->
 * the longest meaningful slug token -> the same from the h1 -> a per-type
 * fallback. Always lowercase and always period-terminated.
 */
export function heroWordFor(entry: HeroWordSource): string {
  // 1. Author's explicit choice always wins, verbatim (minus casing).
  if (entry.heroWord && entry.heroWord.trim()) {
    return punctuate(entry.heroWord.trim().toLowerCase());
  }

  const slugTokens = tokenize(entry.slug);

  // 2. A known-good display noun anywhere in the slug.
  for (const p of PREFERRED) {
    if (slugTokens.includes(p)) return punctuate(p);
  }

  // 3. Longest meaningful token in the slug (ties resolve to the earliest,
  //    which is stable because tokenize preserves slug order).
  const fromSlug = longestMeaningful(slugTokens);
  if (fromSlug) return punctuate(fromSlug);

  // 4. Fall back to the headline.
  const fromH1 = longestMeaningful(tokenize(entry.h1 ?? ''));
  if (fromH1) return punctuate(fromH1);

  // 5. Never return empty.
  return punctuate(entry.type ? BY_TYPE[entry.type] : 'signal');
}

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean);
}

function longestMeaningful(tokens: string[]): string | null {
  let best: string | null = null;
  for (const t of tokens) {
    if (t.length < MIN_LEN || t.length > MAX_LEN) continue;
    if (STOP.has(t)) continue;
    // Strictly greater keeps the FIRST of any tie — order-stable.
    if (!best || t.length > best.length) best = t;
  }
  return best;
}

/** The trailing period is the house style; it makes one word read as a statement. */
function punctuate(word: string): string {
  return /[.!?]$/.test(word) ? word : `${word}.`;
}
