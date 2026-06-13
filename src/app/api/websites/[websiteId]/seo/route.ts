import { z } from 'zod';
import { parseRequest } from '@/lib/request';
import { json, badRequest, unauthorized } from '@/lib/response';
import { canViewWebsite } from '@/permissions';
import { getConnection, getServiceAccountToken, gscQuery } from '@/lib/google';

// SEO tab data — live from Google Search Console for the dashboard date range.
// Three parallel queries: totals (current + previous period for deltas), top
// queries, top pages. GSC dates are YYYY-MM-DD in Pacific Time; day precision
// is plenty for this view.

const toDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const schema = z.object({
    startAt: z.coerce.number(),
    endAt: z.coerce.number(),
  });

  const { auth, query, error } = await parseRequest(request, schema);
  if (error) return error();

  const { websiteId } = await params;
  // Owner-session only: live Search Console data must never leak through a
  // public share token.
  if (!auth?.user || !(await canViewWebsite(auth, websiteId))) return unauthorized();

  const conn = await getConnection(websiteId);
  if (!conn?.gscSiteUrl) {
    return json({ connected: false });
  }

  const token = await getServiceAccountToken();
  if (!token) {
    return badRequest({ message: 'Google reader isn’t configured on the server yet.' });
  }

  const startDate = toDay(query.startAt);
  const endDate = toDay(query.endAt);
  const spanMs = query.endAt - query.startAt;
  const prevStart = toDay(query.startAt - spanMs);
  const prevEnd = toDay(query.startAt - 86_400_000);

  try {
    const [totals, prevTotals, queries, pages] = await Promise.all([
      gscQuery(token, conn.gscSiteUrl, { startDate, endDate }),
      gscQuery(token, conn.gscSiteUrl, { startDate: prevStart, endDate: prevEnd }),
      gscQuery(token, conn.gscSiteUrl, {
        startDate,
        endDate,
        dimensions: ['query'],
        rowLimit: 50,
      }),
      gscQuery(token, conn.gscSiteUrl, {
        startDate,
        endDate,
        dimensions: ['page'],
        rowLimit: 25,
      }),
    ]);

    const sum = (rows: any[]) => rows[0] || { clicks: 0, impressions: 0, ctr: 0, position: 0 };

    return json({
      connected: true,
      siteUrl: conn.gscSiteUrl,
      totals: sum(totals),
      prevTotals: sum(prevTotals),
      queries: queries.map(r => ({
        query: r.keys[0],
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: r.ctr,
        position: r.position,
      })),
      pages: pages.map(r => {
        let page = r.keys[0];
        try {
          page = new URL(page).pathname || page;
        } catch {
          /* keep raw */
        }
        return {
          page,
          clicks: r.clicks,
          impressions: r.impressions,
          position: r.position,
        };
      }),
    });
  } catch (e: any) {
    return badRequest({ message: `Search Console error: ${String(e?.message).slice(0, 160)}` });
  }
}
