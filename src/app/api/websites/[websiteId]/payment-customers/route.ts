import { z } from 'zod';
import { getQueryFilters, parseRequest } from '@/lib/request';
import { unauthorized, json } from '@/lib/response';
import { canViewWebsite } from '@/permissions';
import { dateRangeParams, filterParams, pagingParams, searchParams } from '@/lib/schema';
import { getPaymentCustomers } from '@/queries/sql';
import { getActiveIntegration } from '@/lib/revenue/store';
import { getRevenueProvider } from '@/lib/revenue';
import type { RevenueRange, RevenueUnit } from '@/lib/revenue/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  // Dates required — without them getRequestDateRange yields Invalid Date and
  // crashes Prisma at parameter serialization (same as the sessions endpoint).
  const schema = z.object({
    ...dateRangeParams,
    startAt: z.coerce.number(),
    endAt: z.coerce.number(),
    ...filterParams,
    ...pagingParams,
    ...searchParams,
  });

  const { auth, query, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const { websiteId } = await params;

  if (!(await canViewWebsite(auth, websiteId))) {
    return unauthorized();
  }

  const filters = await getQueryFilters(query, websiteId);

  const data = await getPaymentCustomers(websiteId, filters);

  // Webhook-attributed customers exist → return the rich per-visitor journey.
  if (data?.data?.length) {
    return json(data);
  }

  // Fallback: a pull integration (API key) has payments but no per-visitor
  // attribution. Surface the gateway's own customers (email + total spent) so the
  // Customers tab isn't empty when revenue is clearly flowing.
  try {
    const active = await getActiveIntegration(websiteId);
    if (active) {
      const provider = getRevenueProvider(active.provider);
      if (provider?.listCustomers) {
        const unit: RevenueUnit =
          query.unit === 'hour' || query.unit === 'month' ? query.unit : 'day';
        const range: RevenueRange = {
          startDate: new Date(Number(query.startAt)),
          endDate: new Date(Number(query.endAt)),
          unit,
        };
        const customers = await provider.listCustomers(active.credentials, range);
        const rows = customers.map(c => ({
          id: c.id,
          distinctId: c.email || c.name || c.id,
          displayName: c.email || c.name || undefined,
          spentMinor: c.totalMinor,
          spentCurrency: c.currency,
          completedAt: c.lastAt,
          secondsToComplete: null,
          unlinked: true,
        }));
        return json({ data: rows, count: rows.length });
      }
    }
  } catch {
    // Ignore and fall through to the (empty) attributed result.
  }

  return json(data);
}
