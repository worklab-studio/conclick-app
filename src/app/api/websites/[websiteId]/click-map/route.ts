import { z } from 'zod';
import { parseRequest, getQueryFilters } from '@/lib/request';
import { unauthorized, json, badRequest } from '@/lib/response';
import { canViewWebsite } from '@/permissions';
import { dateRangeParams, filterParams } from '@/lib/schema';
import { getClickMap } from '@/queries/sql';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const schema = z.object({
    ...dateRangeParams,
    ...filterParams,
    // Our buyer cohort — a distinct enum, NOT the segment-UUID `cohort` that
    // filterParams defines (we override it here and strip it before getQueryFilters).
    cohort: z
      .enum(['all', 'paid', 'non_buyer', 'refunded', 'high_ltv', 'abandoner', 'trial'])
      .optional()
      .default('all'),
  });

  const { auth, query, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const { websiteId } = await params;

  if (!(await canViewWebsite(auth, websiteId))) {
    return unauthorized();
  }

  const { cohort, path } = query;

  if (!path) {
    return badRequest('A page (path) is required.');
  }

  // Strip our buyer-cohort enum before getQueryFilters — it would otherwise be
  // misread as a segment UUID and crash the segment lookup.
  const filters = await getQueryFilters({ ...query, cohort: undefined }, websiteId);
  const data = await getClickMap(websiteId, filters, { urlPath: path, cohort });

  return json(data);
}
