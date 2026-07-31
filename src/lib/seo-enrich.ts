/**
 * Optional SEO enrichment for the onboarding analysis (DataForSEO).
 *
 * Strictly additive. If credentials are missing, the API is slow, or the
 * domain is unknown to their index, this returns null and the onboarding
 * screen simply does not show the panel. It must never block, never throw,
 * and never be on the critical path to activation.
 *
 * Note on naming: DataForSEO's `rank` is their own 0 to 1000 domain rank.
 * It is NOT Moz's "Domain Authority" (a different, trademarked 0 to 100
 * metric), so the UI must never call it DA.
 */

export interface SeoSnapshot {
  /**
   * DataForSEO domain rank, 0 to 1000. Null when it is too low to be worth
   * showing: measured against real customer sites, a young site returns 0 or
   * single digits, and "Domain rank: 0" reads as failure rather than as "you
   * are early". Below the floor we simply omit the stat and let backlinks and
   * referring domains carry the panel.
   */
  domainRank: number | null;
  backlinks: number | null;
  referringDomains: number | null;
  brokenBacklinks: number | null;
  /** True when the profile is small enough that growth framing beats raw numbers. */
  isEarlyStage: boolean;
  fetchedAt: number;
}

/** Below this, showing a rank number hurts more than it helps. */
const RANK_FLOOR = 20;

export function isSeoEnrichmentEnabled(): boolean {
  return !!process.env.DATAFORSEO_LOGIN && !!process.env.DATAFORSEO_PASSWORD;
}

// Per-domain cache. Signup volume is low, but a retried onboarding screen or a
// refresh should never bill a second lookup.
const TTL = 24 * 60 * 60 * 1000;
const KEY = '__conclick_seo_cache__';
const cache: Map<string, SeoSnapshot> = (globalThis as any)[KEY] || new Map();
(globalThis as any)[KEY] = cache;

/**
 * Fetch a backlink summary for a domain. Returns null on any failure, on a
 * missing config, or when the domain is not in the index.
 */
export async function fetchSeoSnapshot(rawDomain: string): Promise<SeoSnapshot | null> {
  if (!isSeoEnrichmentEnabled()) return null;

  const domain = (rawDomain || '')
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
    .trim()
    .toLowerCase();
  if (!domain || !/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(domain)) return null;

  const hit = cache.get(domain);
  if (hit && Date.now() - hit.fetchedAt < TTL) return hit;

  const auth = Buffer.from(
    `${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`,
  ).toString('base64');

  try {
    const res = await fetch('https://api.dataforseo.com/v3/backlinks/summary/live', {
      method: 'POST',
      // Hard ceiling: the onboarding screen renders without this panel rather
      // than making anyone wait on a third party.
      signal: AbortSignal.timeout(6000),
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        { target: domain, internal_list_limit: 1, backlinks_status_type: 'live' },
      ]),
    });

    if (!res.ok) return null;

    const json: any = await res.json();
    const result = json?.tasks?.[0]?.result?.[0];
    if (!result) return null;

    const num = (v: any) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

    const rawRank = num(result.rank);
    const backlinks = num(result.backlinks);
    const referringDomains = num(result.referring_domains);

    const snapshot: SeoSnapshot = {
      // Suppress a demoralising near-zero rank rather than printing "0".
      domainRank: rawRank !== null && rawRank >= RANK_FLOOR ? rawRank : null,
      backlinks,
      referringDomains,
      brokenBacklinks: num(result.broken_backlinks),
      isEarlyStage: (rawRank ?? 0) < RANK_FLOOR || (referringDomains ?? 0) < 25,
      fetchedAt: Date.now(),
    };

    // Nothing worth rendering is the same as no response: the panel hides.
    if (!snapshot.backlinks && !snapshot.referringDomains && snapshot.domainRank === null) {
      return null;
    }

    cache.set(domain, snapshot);
    return snapshot;
  } catch {
    return null;
  }
}
