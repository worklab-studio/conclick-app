import { z } from 'zod';
import { parseRequest, getQueryFilters } from '@/lib/request';
import { json } from '@/lib/response';
import { canViewWebsite } from '@/permissions';
import { dateRangeParams } from '@/lib/schema';
import { getWebsiteStats, getSessionStats } from '@/queries/sql';
import { getCompareDate } from '@/lib/date';
import { websiteHasPaidOwner } from '@/lib/website-access';

/**
 * Fleet overview: stats + comparison + visitors series for MANY websites in
 * ONE request. The /websites page used to make 2 HTTP calls per site (22 for
 * 11 sites), and every one of them paid the full per-request tax — Clerk
 * session parse, user lookup, permission check, subscription check — before
 * running its aggregates through the connection pool. Batching pays the tax
 * once and runs the aggregates server-side on a warm pool.
 *
 * GET /api/websites/overview?websiteIds=a,b,c&startAt=&endAt=&unit=&timezone=
 *
 * Response: { data: [{ websiteId, stats: {..., comparison}, sessions }] }
 * - stats matches /websites/{id}/stats exactly (same queries), so numbers
 *   here always agree with the per-site dashboards.
 * - sessions matches the sessions series of /websites/{id}/pageviews (the
 *   card sparkline's input). Unpaid sites get [] — same as the per-site
 *   endpoint, which 401s the series but not the stats.
 * - Sites the caller can't view (or that error) are silently omitted; one
 *   broken site must not take down the whole fleet page.
 */
export async function GET(request: Request) {
  const MAX_WEBSITES = 50;

  const schema = z.object({
    ...dateRangeParams,
    websiteIds: z.string(),
  });

  const { auth, query, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const ids = [...new Set(String(query.websiteIds).split(','))]
    .filter(Boolean)
    .slice(0, MAX_WEBSITES);

  const results = await Promise.all(
    ids.map(async websiteId => {
      try {
        if (!(await canViewWebsite(auth, websiteId))) {
          return null;
        }

        const filters = await getQueryFilters(query, websiteId);
        const { startDate, endDate } = getCompareDate('prev', filters.startDate, filters.endDate);

        const [stats, comparison, paid] = await Promise.all([
          getWebsiteStats(websiteId, filters),
          getWebsiteStats(websiteId, { ...filters, startDate, endDate }),
          websiteHasPaidOwner(websiteId),
        ]);

        const sessions = paid ? await getSessionStats(websiteId, filters) : [];

        return { websiteId, stats: { ...stats, comparison }, sessions };
      } catch {
        return null;
      }
    }),
  );

  return json({ data: results.filter(Boolean) });
}
