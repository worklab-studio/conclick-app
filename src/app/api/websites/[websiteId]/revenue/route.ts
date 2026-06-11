import { parseRequest } from '@/lib/request';
import { json, unauthorized, serverError } from '@/lib/response';
import { canViewWebsite } from '@/permissions';
import { getActiveIntegration } from '@/lib/revenue/store';
import { getRevenueProvider, EMPTY_SUMMARY } from '@/lib/revenue';
import { stripeProvider } from '@/lib/revenue/stripe';
import { getWebsite } from '@/queries/prisma';
import prisma from '@/lib/prisma';
import type { RevenueRange, RevenueSummary, RevenueUnit } from '@/lib/revenue/types';

const DAY = 24 * 60 * 60 * 1000;

// Summary straight from the revenue_event rows the webhooks ingested — used for
// webhook-only gateways (Lemon Squeezy / Paddle / Polar) that have no pull-side
// API. Net of refunds/disputes (negative rows); minor units → major.
async function summarizeRevenueEvents(
  websiteId: string,
  range: RevenueRange,
): Promise<RevenueSummary> {
  const rows = await prisma.client.revenueEvent.findMany({
    where: { websiteId, occurredAt: { gte: range.startDate, lte: range.endDate } },
    select: { amountMinor: true, currency: true, occurredAt: true },
    orderBy: { occurredAt: 'asc' },
  });

  if (!rows.length) return { ...EMPTY_SUMMARY };

  const bucketKey = (d: Date) => {
    const iso = d.toISOString();
    if (range.unit === 'hour') return `${iso.slice(0, 13)}:00:00Z`;
    if (range.unit === 'month') return `${iso.slice(0, 7)}-01T00:00:00Z`;
    return `${iso.slice(0, 10)}T00:00:00Z`;
  };

  const buckets = new Map<string, number>();
  let totalMinor = 0;
  const currencyCount = new Map<string, number>();
  for (const r of rows) {
    const minor = Number(r.amountMinor);
    totalMinor += minor;
    const k = bucketKey(r.occurredAt);
    buckets.set(k, (buckets.get(k) || 0) + minor / 100);
    currencyCount.set(r.currency, (currencyCount.get(r.currency) || 0) + 1);
  }
  const currency = [...currencyCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'USD';

  return {
    total: totalMinor / 100,
    currency,
    chart: [...buckets.entries()].map(([x, y]) => ({ x, y: Math.round(y * 100) / 100 })),
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const { auth, query, error } = await parseRequest(request);
  if (error) return error();

  const { websiteId } = await params;
  if (!(await canViewWebsite(auth, websiteId))) return unauthorized();

  const now = Date.now();
  const endAt = query.endAt ? Number(query.endAt) : now;
  const startAt = query.startAt ? Number(query.startAt) : now - 30 * DAY;
  const unit: RevenueUnit = query.unit === 'hour' || query.unit === 'month' ? query.unit : 'day';
  const range: RevenueRange = {
    startDate: new Date(startAt),
    endDate: new Date(endAt),
    unit,
  };

  try {
    // 1. Active integration (encrypted credentials in payment_integration).
    const active = await getActiveIntegration(websiteId);
    if (active) {
      const provider = getRevenueProvider(active.provider);
      if (provider) {
        const summary = await provider.fetchRevenue(active.credentials, range);
        return json({ ...summary, connected: true, provider: active.provider });
      }

      // Webhook-only gateway — its truth lives in our own revenue_event rows.
      const summary = await summarizeRevenueEvents(websiteId, range);
      return json({ ...summary, connected: true, provider: active.provider });
    }

    // 2. Legacy fallback: a Stripe secret key stored on the website row.
    const website = await getWebsite(websiteId);
    if (website?.stripeSecretKey) {
      const summary = await stripeProvider.fetchRevenue({ apiKey: website.stripeSecretKey }, range);
      return json({ ...summary, connected: true, provider: 'stripe' });
    }

    // 3. Nothing connected.
    return json({ ...EMPTY_SUMMARY, connected: false, stripeNotConfigured: true });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('Revenue fetch error:', e?.message ?? e);
    return serverError({ message: 'Failed to fetch revenue.' });
  }
}
