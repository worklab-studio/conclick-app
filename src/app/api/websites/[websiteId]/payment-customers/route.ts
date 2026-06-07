import { z } from 'zod';
import { getQueryFilters, parseRequest } from '@/lib/request';
import { unauthorized, json } from '@/lib/response';
import { canViewWebsite } from '@/permissions';
import { dateRangeParams, filterParams, pagingParams, searchParams } from '@/lib/schema';
import { getPaymentCustomers } from '@/queries/sql';

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

  return json(data);
}
