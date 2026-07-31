/**
 * Buying-intent score: how likely is this visitor to become a customer?
 *
 * A weighted evidence model over six signal blocks (max 100 points total):
 *
 *   1. Money pages (25) — did they open checkout/payment (tier A) or
 *      pricing/signup/demo (tier B) pages? The single strongest predictor:
 *      nobody reads a pricing page by accident.
 *   2. Return frequency (20) — repeat visits are the classic conversion
 *      predictor; the jump from 1 → 2 visits matters more than 4 → 5.
 *   3. Depth (15) — pages viewed and events fired: how much of the product
 *      story they consumed.
 *   4. Attention (15) — time per visit, scroll completion, clicks: were they
 *      reading or bouncing around.
 *   5. Recency (15) — intent decays fast; someone here NOW outranks someone
 *      hot last month.
 *   6. Source quality (10) — AI assistants & search bring problem-aware
 *      seekers; social brings drive-bys; direct means they knew the name.
 *
 * Different surfaces know different signals (the live globe has no scroll
 * data; the visitors list has no page paths), so the score RENORMALIZES:
 * blocks whose inputs are entirely unknown drop out of the denominator and
 * the score stays a 0-100 percentage of the evidence we actually have.
 * That keeps scores comparable across surfaces instead of punishing a
 * surface for data it never collects.
 *
 * Overrides, applied last:
 *   - Paying customer (spent > 0) → floor of 92. The question is answered.
 *   - Drive-by clamp: a single visit with ≤1 pageview and no money-page hit
 *     is capped at 22 no matter how fresh or well-sourced it is.
 */

const TIER_A_PAGES = /(checkout|cart|buy|payment|\bpay\b|upgrade|subscribe|billing|order)/i;
const TIER_B_PAGES =
  /(pricing|\bplans?\b|signup|sign-up|register|get-started|\bstart\b|demo|trial|contact|book|quote)/i;

const AI_SOURCES = /(chatgpt|openai|perplexity|claude|anthropic|gemini|copilot|poe\.com|you\.com)/i;
const SEARCH_SOURCES = /(google\.|bing\.|duckduckgo|brave\.|ecosia|yahoo|baidu|yandex)/i;
const SOCIAL_SOURCES =
  /(facebook|instagram|\bt\.co\b|twitter|x\.com|linkedin|reddit|youtube|tiktok|threads|pinterest)/i;

export interface IntentSignals {
  /** Distinct visits (sessions-with-gaps). Omit if unknown. */
  visits?: number;
  /** Total pageviews. */
  views?: number;
  /** Custom events fired. */
  events?: number;
  /** Total engaged seconds across all visits. */
  totalSeconds?: number;
  /** Deepest scroll reached, 0-100. */
  maxScrollPct?: number | string | null;
  /** Total clicks recorded. */
  clicks?: number | string | null;
  /** Last activity timestamp. */
  lastAt?: string | number | Date;
  /** True when the visitor is on the site right now (live surface). */
  activeNow?: boolean;
  /** Referrer domain (null = direct). Omit only if genuinely unknown. */
  referrerDomain?: string | null;
  utmSource?: string | null;
  utmCampaign?: string | null;
  /** URL paths this visitor touched (pageviews and events both count). */
  paths?: string[];
  /** Lifetime revenue in minor units; > 0 = already a customer. */
  spentMinor?: number;
}

export type IntentLevel = 'hot' | 'warm' | 'cool' | 'cold';

export interface IntentResult {
  /** 0-100. */
  score: number;
  level: IntentLevel;
  /** Short human label ("High intent"). */
  label: string;
  /** Top contributing evidence, human-readable, max 4. */
  reasons: string[];
}

const LEVEL_LABELS: Record<IntentLevel, string> = {
  hot: 'High intent',
  warm: 'Warm',
  cool: 'Curious',
  cold: 'Low intent',
};

export function computeIntentScore(s: IntentSignals): IntentResult {
  let earned = 0;
  let possible = 0;
  const reasons: string[] = [];

  // 1 — Money pages (25)
  if (s.paths !== undefined) {
    possible += 25;
    const a = s.paths.filter(p => TIER_A_PAGES.test(p || '')).length;
    const b = s.paths.filter(p => !TIER_A_PAGES.test(p || '') && TIER_B_PAGES.test(p || '')).length;
    earned += Math.min(25, a * 12 + b * 6);
    if (a) reasons.push(`Opened checkout/payment pages ${a}×`);
    else if (b) reasons.push(`Viewed pricing/signup pages ${b}×`);
  }

  // 2 — Return frequency (20)
  if (s.visits !== undefined) {
    possible += 20;
    const v = s.visits;
    earned += v >= 5 ? 20 : v === 4 ? 17 : v === 3 ? 15 : v === 2 ? 11 : v === 1 ? 4 : 0;
    if (v >= 2) reasons.push(`${v} separate visits`);
  }

  // 3 — Depth (15)
  if (s.views !== undefined || s.events !== undefined) {
    possible += 15;
    earned += Math.min(15, (s.views ?? 0) * 1.5 + (s.events ?? 0) * 0.25);
    if ((s.views ?? 0) >= 5) reasons.push(`${s.views} pages viewed`);
  }

  // 4 — Attention (15)
  if (s.totalSeconds !== undefined || s.maxScrollPct != null || s.clicks != null) {
    possible += 15;
    let pts = 0;
    if (s.totalSeconds !== undefined) {
      const perVisit = s.totalSeconds / Math.max(s.visits ?? 1, 1);
      pts +=
        perVisit >= 180
          ? 9
          : perVisit >= 90
            ? 7
            : perVisit >= 45
              ? 5
              : perVisit >= 15
                ? 3
                : perVisit > 0
                  ? 1
                  : 0;
      if (perVisit >= 90) reasons.push('Long, attentive sessions');
    }
    if (s.maxScrollPct != null) {
      const sc = Number(s.maxScrollPct);
      pts += sc >= 85 ? 4 : sc >= 60 ? 3 : sc >= 40 ? 2 : sc >= 20 ? 1 : 0;
      if (sc >= 85) reasons.push('Reads pages to the end');
    }
    if (s.clicks != null) {
      const c = Number(s.clicks);
      pts += c >= 10 ? 2 : c >= 3 ? 1 : 0;
    }
    earned += Math.min(15, pts);
  }

  // 5 — Recency (15)
  if (s.lastAt !== undefined || s.activeNow) {
    possible += 15;
    if (s.activeNow) {
      earned += 15;
      reasons.push('On the site right now');
    } else if (s.lastAt) {
      const hours = (Date.now() - new Date(s.lastAt).getTime()) / 3_600_000;
      earned +=
        hours < 1
          ? 14
          : hours < 6
            ? 12
            : hours < 24
              ? 10
              : hours < 72
                ? 7
                : hours < 168
                  ? 5
                  : hours < 720
                    ? 2
                    : 0;
      if (hours < 24) reasons.push('Visited in the last 24h');
    }
  }

  // 6 — Source quality (10)
  if (s.referrerDomain !== undefined || s.utmSource !== undefined) {
    possible += 10;
    const src = `${s.utmSource || ''} ${s.referrerDomain || ''}`.trim();
    let pts: number;
    if (!src) {
      pts = 6; // direct: typed the URL or kept the tab, brand-aware
    } else if (AI_SOURCES.test(src)) {
      pts = 8;
      reasons.push('Came from an AI assistant');
    } else if (SEARCH_SOURCES.test(src)) {
      pts = 7;
      reasons.push('Came from search');
    } else if (SOCIAL_SOURCES.test(src)) {
      pts = 3;
    } else {
      pts = 5;
    }
    if (s.utmCampaign) pts = Math.min(10, pts + 2);
    earned += pts;
  }

  if (possible === 0) {
    return { score: 0, level: 'cold', label: 'No signal', reasons: [] };
  }

  let score = Math.round((100 * earned) / possible);

  // Drive-by clamp: one shallow visit can't be a hot lead no matter how
  // fresh or well-sourced.
  const touchedMoneyPage = s.paths?.some(
    p => TIER_A_PAGES.test(p || '') || TIER_B_PAGES.test(p || ''),
  );
  if ((s.visits ?? 1) <= 1 && (s.views ?? 0) <= 1 && (s.events ?? 0) <= 1 && !touchedMoneyPage) {
    score = Math.min(score, 22);
  }

  // Paying customer: the question is answered.
  if ((s.spentMinor ?? 0) > 0) {
    score = Math.max(score, 92);
    reasons.unshift('Already a paying customer');
  }

  score = Math.max(0, Math.min(100, score));
  const level: IntentLevel =
    score >= 70 ? 'hot' : score >= 45 ? 'warm' : score >= 25 ? 'cool' : 'cold';

  return { score, level, label: LEVEL_LABELS[level], reasons: reasons.slice(0, 4) };
}
