import { canViewWebsite } from '@/permissions';
import { unauthorized, json } from '@/lib/response';
import { getQueryFilters, parseRequest, setWebsiteDate } from '@/lib/request';
import { getJourney } from '@/queries/sql';
import { reportResultSchema } from '@/lib/schema';

export async function POST(request: Request) {
  const { auth, body, error } = await parseRequest(request, reportResultSchema);

  if (error) {
    return error();
  }

  const { websiteId, filters } = body;

  if (!(await canViewWebsite(auth, websiteId))) {
    return unauthorized();
  }

  // Clamp startDate to >= website.resetAt to match the other report endpoints.
  // setWebsiteDate widens the type to Record<string,any> — cast back to the
  // original shape since the underlying fields are unchanged.
  const parameters = (await setWebsiteDate(
    websiteId,
    body.parameters,
  )) as typeof body.parameters;

  const queryFilters = await getQueryFilters(filters, websiteId);

  const data = await getJourney(websiteId, parameters, queryFilters);

  return json(data);
}
