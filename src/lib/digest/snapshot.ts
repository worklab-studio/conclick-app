import { differenceInMinutes, format, subDays, subMinutes, subMonths } from 'date-fns';
import prisma from '@/lib/prisma';
import { getWebsiteStats } from '@/queries/sql';
import { getCompareDate } from '@/lib/date';
import { friendlyReferrer } from './referrers';

// Builds ONE rich snapshot per user across all their sites — the structured
// input to spike/milestone detection, the LLM narrative, the email, and the
// channel messages. All numbers come from the same queries the dashboard uses
// so they agree exactly. Postgres only.

export interface PeakMoment {
  kind: 'traffic' | 'channel';
  label: string;
  today: number;
  multiple: number; // today / baseline, 1dp
  isNew?: boolean; // baseline was ~0
}

export interface MilestoneHit {
  type: 'visitors' | 'revenue';
  threshold: number;
  siteName: string;
}

export interface SiteSnapshot {
  websiteId: string;
  name: string;
  domain: string | null;
  // today (last 24h)
  visitors: number;
  pageviews: number;
  visits: number;
  bounceRate: number; // 0..1
  avgSeconds: number;
  // comparisons
  prevVisitors: number; // prior 24h
  prev7dAvgVisitors: number; // per-day mean over trailing 7d (also spike baseline)
  last30Visitors: number;
  prev30Visitors: number;
  lifetimeVisitors: number;
  // sources
  topReferrers: { domain: string; label: string; hits: number }[]; // today, top 5
  referrerBaselinePerDay: Record<string, number>; // trailing-7d per-day avg, for spikes
  // money
  revenueMinor: number;
  payments: number;
  currency: string;
  // filled by detectors in the cron
  spikes: PeakMoment[];
  milestones: MilestoneHit[];
}

export interface DigestSnapshot {
  userId: string;
  email: string;
  dateLabel: string; // "Monday, June 16"
  sites: SiteSnapshot[];
  totals: {
    visitors: number;
    prevVisitors: number;
    prev7dAvgVisitors: number;
    last30Visitors: number;
    prev30Visitors: number;
    pageviews: number;
    revenueMinor: number;
    currency: string;
  };
  deltas: {
    vsYesterdayPct: number | null;
    vsLastWeekPct: number | null;
    vsLastMonthPct: number | null;
  };
}

const n = (v: any) => Number(v ?? 0);
const pct = (cur: number, prev: number): number | null =>
  prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null;

async function statsVisitors(websiteId: string, startDate: Date, endDate: Date) {
  const s: any = await getWebsiteStats(websiteId, { startDate, endDate });
  return s || {};
}

async function referrerCounts(websiteId: string, start: Date, end: Date) {
  const rows = await prisma.client.websiteEvent.groupBy({
    by: ['referrerDomain'],
    where: { websiteId, createdAt: { gte: start, lt: end }, referrerDomain: { not: null } },
    _count: { referrerDomain: true },
    orderBy: { _count: { referrerDomain: 'desc' } },
    take: 20,
  });
  return rows
    .map(r => ({ domain: String(r.referrerDomain), hits: r._count.referrerDomain }))
    .filter(r => r.domain && r.domain !== '');
}

async function buildSiteSnapshot(
  site: { id: string; name: string; domain: string | null; createdAt: Date | null },
  start: Date,
  end: Date,
): Promise<SiteSnapshot | null> {
  const prevDay = getCompareDate('prev', start, end);
  const sevenStart = subDays(start, 7);
  const thirtyStart = subDays(start, 30);
  const sixtyStart = subDays(start, 60);

  const [today, prev, last30, prev30, lifetime, refToday, refBaseline, rev, ccy] =
    await Promise.all([
      statsVisitors(site.id, start, end),
      statsVisitors(site.id, prevDay.startDate as Date, prevDay.endDate as Date),
      statsVisitors(site.id, thirtyStart, start),
      statsVisitors(site.id, sixtyStart, thirtyStart),
      statsVisitors(site.id, site.createdAt ?? new Date(0), end),
      referrerCounts(site.id, start, end),
      referrerCounts(site.id, sevenStart, start),
      prisma.client.revenueEvent.aggregate({
        where: { websiteId: site.id, type: 'payment', occurredAt: { gte: start, lt: end } },
        _sum: { amountMinor: true },
        _count: true,
      }),
      prisma.client.revenueEvent.findFirst({
        where: { websiteId: site.id, type: 'payment', occurredAt: { gte: start, lt: end } },
        select: { currency: true },
      }),
    ]);

  const visitors = n(today.visitors);
  const pageviews = n(today.pageviews);
  if (visitors === 0 && pageviews === 0) return null; // dead site this window

  // True per-day baseline: the mean of seven INDEPENDENT single-day distinct
  // visitor counts. A single 7-day distinct-session query ÷ 7 under-counts,
  // because sessions are deduped across the whole window (monthly salt) — that
  // would manufacture daily "spikes" on flat sites with returning visitors.
  const prev7dDaily = await Promise.all(
    Array.from({ length: 7 }, (_, k) =>
      statsVisitors(site.id, subDays(start, k + 1), subDays(start, k)),
    ),
  );
  const prev7dAvgVisitors = Math.round(prev7dDaily.reduce((a, d) => a + n(d.visitors), 0) / 7);

  const visits = n(today.visits) || 1;
  const referrerBaselinePerDay: Record<string, number> = {};
  for (const r of refBaseline) referrerBaselinePerDay[r.domain] = r.hits / 7;

  return {
    websiteId: site.id,
    name: site.name,
    domain: site.domain,
    visitors,
    pageviews,
    visits: n(today.visits),
    bounceRate: visits ? n(today.bounces) / visits : 0,
    avgSeconds: visits ? Math.round(n(today.totaltime) / visits) : 0,
    prevVisitors: n(prev.visitors),
    prev7dAvgVisitors,
    last30Visitors: n(last30.visitors),
    prev30Visitors: n(prev30.visitors),
    lifetimeVisitors: n(lifetime.visitors),
    topReferrers: refToday
      .slice(0, 5)
      .map(r => ({ domain: r.domain, label: friendlyReferrer(r.domain), hits: r.hits })),
    referrerBaselinePerDay,
    revenueMinor: n(rev._sum.amountMinor),
    payments: rev._count || 0,
    currency: ccy?.currency || 'USD',
    spikes: [],
    milestones: [],
  };
}

export async function buildSnapshot(
  user: { id: string; email: string },
  websites: { id: string; name: string; domain: string | null; createdAt: Date | null }[],
  window: { start: Date; end: Date },
): Promise<DigestSnapshot> {
  const { start, end } = window;
  const built = await Promise.all(websites.map(w => buildSiteSnapshot(w, start, end)));
  const sites = built.filter((s): s is SiteSnapshot => !!s);

  const sum = (k: keyof SiteSnapshot) => sites.reduce((a, s) => a + (s[k] as number), 0);
  const totals = {
    visitors: sum('visitors'),
    prevVisitors: sum('prevVisitors'),
    prev7dAvgVisitors: sum('prev7dAvgVisitors'),
    last30Visitors: sum('last30Visitors'),
    prev30Visitors: sum('prev30Visitors'),
    pageviews: sum('pageviews'),
    revenueMinor: sum('revenueMinor'),
    currency: sites.find(s => s.revenueMinor > 0)?.currency || 'USD',
  };

  return {
    userId: user.id,
    email: user.email,
    dateLabel: format(start, 'EEEE, MMMM d'),
    sites,
    totals,
    deltas: {
      vsYesterdayPct: pct(totals.visitors, totals.prevVisitors),
      vsLastWeekPct: pct(totals.visitors, totals.prev7dAvgVisitors),
      vsLastMonthPct: pct(totals.last30Visitors, totals.prev30Visitors),
    },
  };
}

// Re-export so date helpers stay co-located if callers need the window math.
export { differenceInMinutes, subMinutes, subMonths };
