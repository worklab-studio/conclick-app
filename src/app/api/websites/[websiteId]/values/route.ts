import { canViewWebsite } from '@/permissions';
import { EVENT_COLUMNS, FILTER_COLUMNS, SESSION_COLUMNS } from '@/lib/constants';
import { getQueryFilters, parseRequest } from '@/lib/request';
import { badRequest, json, unauthorized } from '@/lib/response';
import { getValues } from '@/queries/sql';
import { z } from 'zod';
import { dateRangeParams, fieldsParam, searchParams } from '@/lib/schema';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const schema = z.object({
    type: fieldsParam,
    ...dateRangeParams,
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

  const { type } = query;

  // type is constrained by fieldsParam (a zod enum), which does NOT include
  // 'segment' or 'cohort' — so the SEGMENT_TYPES branch that used to live here
  // was dead code that would also have crashed (getWebsiteSegments was called
  // with no filters arg). Removed.
  if (!SESSION_COLUMNS.includes(type) && !EVENT_COLUMNS.includes(type)) {
    return badRequest();
  }

  const filters = await getQueryFilters(query, websiteId);
  const values = await getValues(websiteId, FILTER_COLUMNS[type], filters);

  return json((values ?? []).filter(n => n).sort());
}
