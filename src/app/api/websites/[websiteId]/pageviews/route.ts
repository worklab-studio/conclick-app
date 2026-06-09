import { z } from 'zod';
import { canViewWebsite } from '@/permissions';
import { getQueryFilters, parseRequest } from '@/lib/request';
import { dateRangeParams, filterParams } from '@/lib/schema';
import { getCompareDate } from '@/lib/date';
import { unauthorized, json } from '@/lib/response';
import { getPageviewStats, getSessionStats } from '@/queries/sql';
import { websiteHasPaidOwner } from '@/lib/website-access';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const schema = z.object({
    ...dateRangeParams,
    ...filterParams,
  });

  const { auth, query, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const { websiteId } = await params;

  // Share tokens authenticate the request without a user, and the website
  // owner has already paid. Only gate on subscription when this is a user
  // session that does NOT have a matching share token for this website.
  const hasMatchingShareToken = auth.shareToken?.websiteId === websiteId;

  if (!hasMatchingShareToken && !(await websiteHasPaidOwner(websiteId))) {
    return unauthorized({ message: 'Subscription required to view analytics.' });
  }

  if (!(await canViewWebsite(auth, websiteId))) {
    return unauthorized();
  }

  const filters = await getQueryFilters(query, websiteId);

  const [pageviews, sessions] = await Promise.all([
    getPageviewStats(websiteId, filters),
    getSessionStats(websiteId, filters),
  ]);

  if (filters.compare) {
    const { startDate: compareStartDate, endDate: compareEndDate } = getCompareDate(
      filters.compare,
      filters.startDate,
      filters.endDate,
    );

    const [comparePageviews, compareSessions] = await Promise.all([
      getPageviewStats(websiteId, {
        ...filters,
        startDate: compareStartDate,
        endDate: compareEndDate,
      }),
      getSessionStats(websiteId, {
        ...filters,
        startDate: compareStartDate,
        endDate: compareEndDate,
      }),
    ]);

    return json({
      pageviews,
      sessions,
      startDate: filters.startDate,
      endDate: filters.endDate,
      compare: {
        pageviews: comparePageviews,
        sessions: compareSessions,
        startDate: compareStartDate,
        endDate: compareEndDate,
      },
    });
  }

  return json({ pageviews, sessions });
}
