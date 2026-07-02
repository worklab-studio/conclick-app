import { format } from 'date-fns';
import { DigestSnapshot, SiteSnapshot } from './snapshot';

// Synthetic snapshots for the preview route (?fixture=spike|milestone|slowday)
// so the email/channel rendering and the LLM narrative can be eyeballed without
// waiting a day or seeding traffic. Spikes/milestones are pre-set here (the
// detectors are bypassed for fixtures).

function baseSite(p: Partial<SiteSnapshot> & { name: string }): SiteSnapshot {
  return {
    websiteId: '00000000-0000-0000-0000-000000000000',
    domain: 'example.com',
    visitors: 0,
    pageviews: 0,
    visits: 0,
    bounceRate: 0.4,
    avgSeconds: 95,
    prevVisitors: 0,
    prev7dAvgVisitors: 0,
    last30Visitors: 0,
    prev30Visitors: 0,
    lifetimeVisitors: 0,
    topReferrers: [],
    referrerBaselinePerDay: {},
    revenueMinor: 0,
    payments: 0,
    currency: 'USD',
    spikes: [],
    milestones: [],
    ...p,
  };
}

function wrap(start: Date, sites: SiteSnapshot[]): DigestSnapshot {
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
  const pct = (c: number, p: number) => (p > 0 ? Math.round(((c - p) / p) * 100) : null);
  return {
    userId: 'preview',
    email: 'preview@conclick.io',
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

export function makeFixture(kind: string, start: Date): DigestSnapshot {
  if (kind === 'milestone') {
    return wrap(start, [
      baseSite({
        name: 'Acme SaaS',
        visitors: 1320,
        pageviews: 4210,
        visits: 1500,
        prevVisitors: 980,
        prev7dAvgVisitors: 870,
        last30Visitors: 26500,
        prev30Visitors: 19800,
        lifetimeVisitors: 100240,
        revenueMinor: 48900,
        payments: 7,
        topReferrers: [
          { domain: 'google.com', label: 'Google', hits: 540 },
          { domain: 'producthunt.com', label: 'Product Hunt', hits: 210 },
        ],
        milestones: [{ type: 'visitors', threshold: 100000, siteName: 'Acme SaaS' }],
      }),
    ]);
  }

  if (kind === 'spike') {
    return wrap(start, [
      baseSite({
        name: 'Acme SaaS',
        visitors: 980,
        pageviews: 3120,
        visits: 1100,
        prevVisitors: 240,
        prev7dAvgVisitors: 210,
        last30Visitors: 8200,
        prev30Visitors: 7600,
        lifetimeVisitors: 42000,
        revenueMinor: 12900,
        payments: 3,
        topReferrers: [
          { domain: 'producthunt.com', label: 'Product Hunt', hits: 560 },
          { domain: 'news.ycombinator.com', label: 'Hacker News', hits: 180 },
          { domain: 'google.com', label: 'Google', hits: 120 },
        ],
        referrerBaselinePerDay: { 'producthunt.com': 6, 'news.ycombinator.com': 20, 'google.com': 110 },
        spikes: [
          { kind: 'channel', label: 'Product Hunt', today: 560, multiple: 93.3, isNew: false },
          { kind: 'traffic', label: 'Overall traffic', today: 980, multiple: 4.7 },
          { kind: 'channel', label: 'Hacker News', today: 180, multiple: 9 },
        ],
      }),
    ]);
  }

  // slowday
  return wrap(start, [
    baseSite({
      name: 'Acme SaaS',
      visitors: 3,
      pageviews: 7,
      visits: 3,
      prevVisitors: 9,
      prev7dAvgVisitors: 8,
      last30Visitors: 240,
      prev30Visitors: 300,
      lifetimeVisitors: 5400,
      topReferrers: [{ domain: 'google.com', label: 'Google', hits: 2 }],
    }),
  ]);
}
