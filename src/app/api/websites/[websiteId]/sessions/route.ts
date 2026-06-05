import { z } from 'zod';
import { getQueryFilters, parseRequest } from '@/lib/request';
import { unauthorized, json } from '@/lib/response';
import { canViewWebsite } from '@/permissions';
import { dateRangeParams, filterParams, pagingParams, searchParams } from '@/lib/schema';
import { getWebsiteSessions } from '@/queries/sql';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  // Override startAt/endAt to required — without dates, getRequestDateRange
  // produces Invalid Date objects that crash Prisma at parameter serialization.
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

  const data = await getWebsiteSessions(websiteId, filters);

  return json(data);
}
