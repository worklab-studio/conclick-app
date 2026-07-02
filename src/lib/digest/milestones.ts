import prisma from '@/lib/prisma';
import { SiteSnapshot, MilestoneHit } from './snapshot';

// Growth ladders. Visitors is what the founder enumerated (first 100 → 500 →
// 1k → 5k → 10k → 20k … 100k+). Revenue is a bonus, in MAJOR units of the
// site's currency (most sites are single-currency; mixed-currency is rare and
// still produces a reasonable "lifetime revenue" headline).
export const VISITOR_LADDER = [
  100, 500, 1000, 5000, 10000, 20000, 30000, 40000, 50000, 60000, 70000, 80000, 90000, 100000,
  150000, 200000, 300000, 400000, 500000, 750000, 1000000, 2000000, 5000000, 10000000,
];

export const REVENUE_LADDER = [
  100, 500, 1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000,
];

// Currencies whose amountMinor is already in major units (no /100).
const ZERO_DECIMAL_CCY = new Set([
  'JPY', 'KRW', 'VND', 'CLP', 'ISK', 'HUF', 'TWD', 'UGX', 'XOF', 'XAF', 'PYG', 'RWF',
]);

const key = (type: string, threshold: number) => `${type}:${threshold}`;
const maxOf = (xs: number[]) => (xs.length ? Math.max(...xs) : null);

/**
 * Reconcile the milestone ledger for one site against its lifetime totals and
 * return the milestones that should be ANNOUNCED today.
 *
 * Rules:
 *  - Every crossed threshold gets a ledger row (idempotent via the unique key).
 *  - On a normal day at most one new threshold crosses → announce it.
 *  - On the FIRST run a big site crosses many at once → record them all but
 *    only announce the single highest per type (the rest are backfilled with
 *    notifiedAt set so they never announce retroactively).
 *  - A ledger row with notifiedAt=null is a pending announcement from a prior
 *    run whose send failed → it's re-offered until markMilestonesNotified runs.
 *
 * dryRun computes the same answer without writing (preview route).
 */
export async function recordMilestones(
  site: SiteSnapshot,
  opts: { dryRun?: boolean } = {},
): Promise<MilestoneHit[]> {
  // Lifetime revenue (major units) for the revenue ladder. Restricted to the
  // site's own currency (summing across currencies would compare incomparable
  // units) and using the correct minor→major factor (zero-decimal currencies
  // like JPY have no /100).
  const byCcy = await prisma.client.revenueEvent.groupBy({
    by: ['currency'],
    where: { websiteId: site.websiteId, type: 'payment' },
    _sum: { amountMinor: true },
  });
  const revMinor = Number(
    byCcy.find(r => r.currency === site.currency)?._sum.amountMinor ?? 0,
  );
  const lifetimeRevenueMajor = revMinor / (ZERO_DECIMAL_CCY.has(site.currency) ? 1 : 100);

  const reached: { type: 'visitors' | 'revenue'; threshold: number }[] = [
    ...VISITOR_LADDER.filter(t => site.lifetimeVisitors >= t).map(
      t => ({ type: 'visitors' as const, threshold: t }),
    ),
    ...REVENUE_LADDER.filter(t => lifetimeRevenueMajor >= t).map(
      t => ({ type: 'revenue' as const, threshold: t }),
    ),
  ];

  const existing = await prisma.client.milestone.findMany({
    where: { websiteId: site.websiteId },
    select: { type: true, threshold: true, notifiedAt: true },
  });
  const existingKeys = new Set(existing.map(e => key(e.type, Number(e.threshold))));
  const pendingKeys = new Set(
    existing.filter(e => e.notifiedAt == null).map(e => key(e.type, Number(e.threshold))),
  );

  const fresh = reached.filter(r => !existingKeys.has(key(r.type, r.threshold)));

  // Headline = highest fresh per type (avoids first-run spam).
  const headlineByType: Record<string, number | null> = {
    visitors: maxOf(fresh.filter(f => f.type === 'visitors').map(f => f.threshold)),
    revenue: maxOf(fresh.filter(f => f.type === 'revenue').map(f => f.threshold)),
  };

  const toAnnounce: MilestoneHit[] = [];
  for (const r of reached) {
    const isHeadline = headlineByType[r.type] === r.threshold && fresh.some(f => key(f.type, f.threshold) === key(r.type, r.threshold));
    const isPending = pendingKeys.has(key(r.type, r.threshold));
    if (isHeadline || isPending) {
      toAnnounce.push({ type: r.type, threshold: r.threshold, siteName: site.name });
    }
  }

  if (opts.dryRun) return dedupe(toAnnounce);

  // Persist: headline rows pending (notifiedAt=null), backfill rows already
  // notified so they never announce later.
  const rows = fresh.map(f => {
    const isHeadline = headlineByType[f.type] === f.threshold;
    return {
      websiteId: site.websiteId,
      type: f.type,
      threshold: BigInt(f.threshold),
      ...(isHeadline ? {} : { notifiedAt: new Date() }),
    };
  });
  if (rows.length) {
    await prisma.client.milestone.createMany({ data: rows, skipDuplicates: true });
  }

  return dedupe(toAnnounce);
}

/** Stamp announced milestones as notified — call only after a successful send. */
export async function markMilestonesNotified(websiteId: string, hits: MilestoneHit[]) {
  if (!hits.length) return;
  // allSettled so one failing update doesn't abandon the rest; then throw if
  // any failed so the caller (cron) can retry rather than silently leaving a
  // row notifiedAt=null (which would re-announce an already-sent milestone).
  const results = await Promise.allSettled(
    hits.map(h =>
      prisma.client.milestone.updateMany({
        where: { websiteId, type: h.type, threshold: BigInt(h.threshold), notifiedAt: null },
        data: { notifiedAt: new Date() },
      }),
    ),
  );
  if (results.some(r => r.status === 'rejected')) {
    throw new Error('markMilestonesNotified: one or more updates failed');
  }
}

function dedupe(hits: MilestoneHit[]): MilestoneHit[] {
  const seen = new Set<string>();
  return hits.filter(h => {
    const k = key(h.type, h.threshold);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** "1,000 visitors" / "$10,000 revenue" — used in email + channel copy. */
export function milestoneLabel(h: MilestoneHit, currency = 'USD'): string {
  const num = h.threshold.toLocaleString('en-US');
  if (h.type === 'revenue') {
    const sym = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '';
    return sym ? `${sym}${num}` : `${num} ${currency}`;
  }
  return `${num} visitors`;
}
