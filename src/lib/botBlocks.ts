/**
 * Rolling in-memory counter of bot-blocked sends, per website.
 *
 * Bot traffic is DROPPED at ingest (isbot / EXTRA_BOT / datacenter-IP in
 * /api/send return `beep boop` before anything is persisted), so there is no
 * DB row to count. This counter feeds the Live page's trust badge
 * ("N bots blocked · last hour"). Single-machine Fly deploy → an in-process
 * counter is accurate; it resets on deploy/restart by design (it's a badge,
 * not an audit log). Stored on globalThis so dev hot-reload keeps one instance.
 */

const BUCKET_MS = 60_000; // 1-minute buckets
const WINDOW_BUCKETS = 60; // keep one hour
const MAX_WEBSITES = 1000; // hard cap so a scan of random websiteIds can't grow it unbounded

type Buckets = Map<number, number>; // minuteBucket -> blocked count

const KEY = '__conclick_bot_blocks__';
const store: Map<string, Buckets> = (globalThis as any)[KEY] || new Map();
(globalThis as any)[KEY] = store;

export function recordBotBlock(websiteId?: string | null) {
  if (!websiteId) return;
  const bucket = Math.floor(Date.now() / BUCKET_MS);
  let buckets = store.get(websiteId);
  if (!buckets) {
    // When full, drop the NEW key rather than evicting an existing one — an
    // attacker spraying random ids must never wipe real sites' counters.
    if (store.size >= MAX_WEBSITES) return;
    buckets = new Map();
    store.set(websiteId, buckets);
  }
  buckets.set(bucket, (buckets.get(bucket) || 0) + 1);
  // opportunistic prune of expired buckets
  for (const k of buckets.keys()) {
    if (k < bucket - WINDOW_BUCKETS) buckets.delete(k);
  }
}

export function botBlocksLastHour(websiteId: string): number {
  const buckets = store.get(websiteId);
  if (!buckets) return 0;
  const min = Math.floor(Date.now() / BUCKET_MS) - WINDOW_BUCKETS;
  let total = 0;
  for (const [k, v] of buckets) {
    if (k >= min) total += v;
    else buckets.delete(k);
  }
  return total;
}
