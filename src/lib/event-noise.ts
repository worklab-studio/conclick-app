/**
 * Event/path hygiene shared by every funnel & goal surface (pickers, auto-
 * funnel, suggestions, matching). The vague-funnel bug class this kills:
 *
 * - `engagement` is the tracker's INTERNAL heartbeat event (scroll/click
 *   rollup). It's high-volume on every site, so anywhere it leaks into a
 *   picker or a "best conversion" ranking it wins by sheer count — while
 *   meaning nothing. It must never be suggested or listed.
 * - `Viewed: <section>` events are PASSIVE autocapture markers (a section
 *   scrolled into view). They're legitimate mid-funnel steps on one-pagers,
 *   but they are never a conversion — "Viewed: demo" is someone scrolling
 *   past the demo, not booking one.
 * - `/#pricing` is not a page; it's a scroll anchor on `/`. Treating hash
 *   variants as distinct pages makes one-pagers look multipage, gets
 *   `/#pricing` picked as a "consideration page", and splits funnel/goal
 *   cohorts across `/`, `/#pricing`, `/#top`, …
 */

export interface ValueRow {
  value: string;
  count: number;
}

/** Tracker-internal events: never show, never suggest, never rank. */
export function isInternalEvent(name: string): boolean {
  return String(name || '').toLowerCase() === 'engagement';
}

/** Passive autocapture section-view markers ("Viewed: pricing"). */
export function isAutoViewEvent(name: string): boolean {
  return /^viewed:/i.test(String(name || ''));
}

/** `/pricing#plans` → `/pricing`; `/docs/` → `/docs`; root stays `/`. */
export function normalizePath(path: string): string {
  let p = String(path || '').split('#')[0];
  if (p.length > 1 && p.endsWith('/')) p = p.replace(/\/+$/, '') || '/';
  return p || '/';
}

/**
 * Clean a values list for pickers/suggestions: internal events dropped,
 * hash/trailing-slash path variants merged (counts summed), re-sorted.
 */
export function cleanValues(kind: 'path' | 'event', rows: ValueRow[]): ValueRow[] {
  const list = (rows || []).filter(r => r && r.value);

  if (kind === 'event') {
    return list.filter(r => !isInternalEvent(r.value));
  }

  const merged = new Map<string, number>();
  for (const r of list) {
    const key = normalizePath(r.value);
    merged.set(key, (merged.get(key) || 0) + (Number(r.count) || 0));
  }
  return [...merged.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);
}

/** Escape LIKE metacharacters so a path is matched literally inside LIKE. */
export function escapeLike(value: string): string {
  return String(value || '').replace(/[\\%_]/g, '\\$&');
}
