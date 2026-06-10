// Intelligent auto-funnel detection. Ranks real conversions (demoting UI noise like
// "Clicked: Close"), detects whether a site is single-page or multipage, and assembles
// a meaningful multi-step funnel toward the best available conversion. Pure + testable.

export interface ValueCount {
  value: string;
  count: number;
}
export type AutoStep = { type: 'path' | 'event'; value: string };

// UI chrome / navigation that is NOT a conversion — dropped (score -1).
const NOISE = [
  'close',
  'dismiss',
  'cancel',
  'back',
  'menu',
  'toggle',
  'open',
  'cookie',
  'accept',
  'deny',
  'decline',
  'got it',
  'maybe later',
  'skip',
  'next',
  'previous',
  'home',
  'about',
  'blog',
  'help',
  'support',
  'terms',
  'privacy',
  'login',
  'log in',
  'sign in',
];
// Real conversions — the funnel should end here.
const CONVERSION = [
  'pay',
  'payment',
  'subscribe',
  'checkout',
  'buy',
  'purchase',
  'upgrade',
  'pro',
  'premium',
  'sign up',
  'signup',
  'register',
  'create account',
  'join',
  'start',
  'get started',
  'free trial',
  'trial',
  'book',
  'demo',
  'call',
  'talk to sales',
  'request',
  'claim',
  'email',
  'submit',
  'contact',
];
// Mid-funnel consideration.
const CONSIDERATION = [
  'pricing',
  'plans',
  'plan',
  'features',
  'feature',
  'how it works',
  'compare',
  'learn more',
];
const CHECKOUT_PATHS = ['/checkout', '/success', '/thank-you', '/thankyou', '/pay', '/order'];
const ASSET_RX = /\.(png|jpe?g|gif|svg|webp|css|js|ico|woff2?|map|json|txt|xml|pdf)$/i;

// Strip the autocapture prefix ("Clicked: " / "Submitted: " / "Viewed: ").
function labelOf(name: string): string {
  if (!name) return '';
  const idx = name.indexOf(': ');
  return (idx >= 0 ? name.slice(idx + 2) : name).toLowerCase().trim();
}

// Whole-word match so "feedback" doesn't match "back", "product" doesn't match "pro".
function hasWord(label: string, words: string[]): boolean {
  return words.some(w => {
    const rx = new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    return rx.test(label);
  });
}

/** Score an event's conversion-worthiness. Returns -1 to drop (UI noise). */
export function scoreConversionEvent(name: string, count: number, maxCount: number): number {
  if (!name) return -1;
  const label = labelOf(name);
  if (!label) return -1;
  if (hasWord(label, NOISE)) return -1;
  let base: number;
  if (hasWord(label, CONVERSION)) base = 100;
  else if (hasWord(label, CONSIDERATION)) base = 40;
  else base = 5; // unknown but non-noise — still a valid destination, just low priority
  if (/^submitted:/i.test(name)) base *= 1.5; // forms convert harder than clicks
  base += Math.round((count / Math.max(maxCount, 1)) * 25); // popularity bonus 0..25
  if (CHECKOUT_PATHS.some(c => label.includes(c.replace('/', '')))) base += 15;
  return base;
}

/** Single-page if there are < 4 meaningful (non-root, non-asset, with-traffic) paths. */
export function detectSiteType(pages: ValueCount[]): {
  isSinglePage: boolean;
  meaningful: ValueCount[];
} {
  const meaningful = (pages || []).filter(
    p => p && p.value && p.value !== '/' && !ASSET_RX.test(p.value) && (p.count || 0) > 0,
  );
  const uniq = new Set(meaningful.map(p => p.value.split('?')[0].split('#')[0]));
  return { isSinglePage: uniq.size < 4, meaningful };
}

function bestConversion(events: ValueCount[], maxCount: number): string | null {
  let best: string | null = null;
  let bestScore = 0;
  for (const e of events) {
    const s = scoreConversionEvent(e.value, e.count, maxCount);
    if (s > bestScore) {
      bestScore = s;
      best = e.value;
    }
  }
  return best;
}

/**
 * Build an ideal auto-funnel for the site:
 * - single-page → `/` → top scored `Viewed: <section>` step(s) (fallback to nav-anchor
 *   `Clicked:` consideration clicks when section views haven't accrued) → best conversion.
 * - multipage → `/` → top consideration page → best conversion (event, or a checkout-y path).
 * Never ends on UI noise; returns [] only when there is genuinely no 2nd step (caller then
 * falls back to the journey-derived sketch).
 */
export function buildAutoSteps(
  pages: ValueCount[],
  events: ValueCount[],
): { steps: AutoStep[]; isSinglePage: boolean } {
  const { isSinglePage, meaningful } = detectSiteType(pages);
  const maxEv = Math.max(1, ...events.map(e => e.count || 0));
  const entry = pages.some(p => p.value === '/') ? '/' : pages[0]?.value || '';
  const conv = bestConversion(events, maxEv);

  const steps: AutoStep[] = [];
  if (entry) steps.push({ type: 'path', value: entry });

  if (isSinglePage) {
    let mids = events
      .filter(e => /^Viewed:/i.test(e.value))
      .map(e => ({ value: e.value, score: scoreConversionEvent(e.value, e.count, maxEv) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map(s => s.value);
    if (!mids.length) {
      // Fallback: nav-anchor clicks that match a consideration keyword (How it works / Pricing).
      mids = events
        .filter(e => /^Clicked:/i.test(e.value) && hasWord(labelOf(e.value), CONSIDERATION))
        .slice(0, 2)
        .map(e => e.value);
    }
    for (const m of mids) steps.push({ type: 'event', value: m });
  } else {
    const considerationPage =
      meaningful.find(p => hasWord(p.value.toLowerCase(), CONSIDERATION))?.value ||
      meaningful[0]?.value;
    if (considerationPage) steps.push({ type: 'path', value: considerationPage });
  }

  if (conv) {
    steps.push({ type: 'event', value: conv });
  } else if (!isSinglePage) {
    const convPath = meaningful.find(p =>
      CHECKOUT_PATHS.some(c => p.value.toLowerCase().includes(c)),
    )?.value;
    if (convPath) steps.push({ type: 'path', value: convPath });
  }

  // Dedupe, drop any later step equal to the entry, cap at 5.
  const seen = new Set<string>();
  const deduped = steps
    .filter((s, i) => {
      const key = s.type + ':' + s.value;
      if (seen.has(key)) return false;
      seen.add(key);
      if (i > 0 && s.value === entry) return false;
      return true;
    })
    .slice(0, 5);

  return { steps: deduped.length >= 2 ? deduped : [], isSinglePage };
}
