import { parseRequest } from '@/lib/request';
import { json, unauthorized, serverError } from '@/lib/response';
import { canViewWebsite } from '@/permissions';
import { getActiveIntegration } from '@/lib/revenue/store';
import { getRevenueProvider, EMPTY_SUMMARY } from '@/lib/revenue';
import { stripeProvider } from '@/lib/revenue/stripe';
import { getWebsite } from '@/queries/prisma';
import type { RevenueRange, RevenueUnit } from '@/lib/revenue/types';

const DAY = 24 * 60 * 60 * 1000;

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
