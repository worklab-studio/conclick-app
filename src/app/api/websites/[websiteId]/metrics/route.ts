import { EVENT_COLUMNS, EVENT_TYPE, SESSION_COLUMNS } from '@/lib/constants';
import { getQueryFilters, parseRequest } from '@/lib/request';
import { badRequest, json, unauthorized } from '@/lib/response';
import { dateRangeParams, filterParams, searchParams } from '@/lib/schema';
import { canViewWebsite } from '@/permissions';
import {
  getChannelMetrics,
  getEventMetrics,
  getPageviewMetrics,
  getSessionMetrics,
} from '@/queries/sql';
import { z } from 'zod';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const schema = z.object({
    type: z.string(),
    // Cap limit/offset so a caller can't materialize huge result sets and
    // OOM the API process. limit/offset are string-interpolated into raw SQL
    // (parameterized as numbers, not injection — just DoS surface).
    limit: z.coerce.number().int().positive().max(1000).optional(),
    offset: z.coerce.number().int().nonnegative().optional(),
    ...dateRangeParams,
    ...searchParams,
    ...filterParams,
  });

  const { auth, query, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const { websiteId } = await params;

  if (!(await canViewWebsite(auth, websiteId))) {
    return unauthorized();
  }

  const { type, limit, offset, search } = query;
  const filters = await getQueryFilters(query, websiteId);

  if (search) {
    filters[type] = `c.${search}`;
  }

  if (SESSION_COLUMNS.includes(type)) {
    const data = await getSessionMetrics(websiteId, { type, limit, offset }, filters);

    return json(data);
  }

  if (EVENT_COLUMNS.includes(type)) {
    if (type === 'event') {
      filters.eventType = EVENT_TYPE.customEvent;
      return json(await getEventMetrics(websiteId, { type, limit, offset }, filters));
    } else {
      return json(await getPageviewMetrics(websiteId, { type, limit, offset }, filters));
    }
  }

  if (type === 'channel') {
    return json(await getChannelMetrics(websiteId, filters));
  }

  return badRequest();
}
