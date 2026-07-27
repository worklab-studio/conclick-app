import { canViewWebsite } from '@/permissions';
import { EVENT_COLUMNS, FILTER_COLUMNS, SESSION_COLUMNS } from '@/lib/constants';
import { getQueryFilters, parseRequest } from '@/lib/request';
import { badRequest, json, unauthorized } from '@/lib/response';
import { getValues } from '@/queries/sql';
import { z } from 'zod';
import { dateRangeParams, fieldsParam, searchParams } from '@/lib/schema';
import { cleanValues } from '@/lib/event-noise';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const schema = z.object({
    type: fieldsParam,
    ...dateRangeParams,
    ...searchParams,
    // clean=1: picker/suggestion hygiene — internal events (`engagement`)
    // dropped, `/#hash` + trailing-slash path variants merged. Off by default
    // so generic filter dropdowns keep raw values.
    clean: z.string().optional(),
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

  // Drop rows with no value (e.g. null event_name from pageview rows) so consumers
  // never receive `{ value: null }` (which broke auto-funnel scoring).
  let result = (values ?? []).filter((n: any) => n && n.value);

  if (query.clean && (type === 'path' || type === 'event')) {
    result = cleanValues(type, result);
  }

  return json(result);
}
