import { getQueryFilters, parseRequest } from '@/lib/request';
import { json, unauthorized } from '@/lib/response';
import { filterParams, pagingParams, searchParams } from '@/lib/schema';
import { canViewWebsite } from '@/permissions';
import { getWebsiteEvents } from '@/queries/sql';
import { z } from 'zod';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const schema = z.object({
    // Required: getQueryFilters → getRequestDateRange does `new Date(+startAt)`,
    // which produces Invalid Date when undefined; Invalid Date is truthy so it
    // flows into the SQL filter and Prisma throws at parameter serialization.
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

  const data = await getWebsiteEvents(websiteId, filters);

  return json(data);
}
