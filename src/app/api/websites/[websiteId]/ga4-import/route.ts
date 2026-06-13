import { z } from 'zod';
import { parseRequest } from '@/lib/request';
import { json, badRequest, unauthorized } from '@/lib/response';
import { canUpdateWebsite, canViewWebsite } from '@/permissions';
import prisma from '@/lib/prisma';
import { getConnection, getServiceAccountToken, ga4RunReport } from '@/lib/google';

// One-time GA4 history import: daily sessions / activeUsers / screenPageViews
// land in imported_stat (source 'ga4') and surface as the "Imported" overlay on
// the Overview chart. One runReport call covers the whole history (row limit
// 100k ≫ any realistic day count). Re-running replaces the previous import.

export async function POST(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const { auth, error } = await parseRequest(request);
  if (error) return error();

  const { websiteId } = await params;
  if (!(await canUpdateWebsite(auth, websiteId))) return unauthorized();

  const conn = await getConnection(websiteId);
  if (!conn?.ga4PropertyId) {
    return badRequest({ message: 'Pick a GA4 property first.' });
  }

  const token = await getServiceAccountToken();
  if (!token) {
    return badRequest({ message: 'Google reader isn’t configured on the server yet.' });
  }

  let report: any;
  try {
    report = await ga4RunReport(token, conn.ga4PropertyId, {
      // GA4 properties can't predate 2019 — a wide-open range imports everything.
      dateRanges: [{ startDate: '2019-01-01', endDate: 'yesterday' }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'sessions' }, { name: 'activeUsers' }, { name: 'screenPageViews' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
      limit: 100000,
    });
  } catch (e: any) {
    return badRequest({ message: `GA4 error: ${String(e?.message).slice(0, 160)}` });
  }

  // `date` comes back as YYYYMMDD; metric values are strings.
  const rows = (report.rows || [])
    .map((r: any) => {
      const raw = r.dimensionValues?.[0]?.value || '';
      const date = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
      const [sessions, visitors, pageviews] = (r.metricValues || []).map(
        (m: any) => parseInt(m.value, 10) || 0,
      );
      return { date, sessions, visitors, pageviews };
    })
    .filter((r: any) => r.date.length === 10 && (r.visitors || r.pageviews || r.sessions));

  if (!rows.length) {
    return json({ ok: true, days: 0, message: 'That property has no historical data.' });
  }

  // Replace any previous GA4 import atomically-enough (delete + batched insert).
  await prisma.client.importedStat.deleteMany({ where: { websiteId, source: 'ga4' } });
  await prisma.client.importedStat.createMany({
    data: rows.map((r: any) => ({
      websiteId,
      date: new Date(r.date),
      source: 'ga4',
      visitors: r.visitors,
      pageviews: r.pageviews,
      sessions: r.sessions,
    })),
    skipDuplicates: true,
  });

  return json({
    ok: true,
    days: rows.length,
    from: rows[0].date,
    to: rows[rows.length - 1].date,
  });
}

// GET — overlay series for the Overview chart, bucketed to the chart unit.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const schema = z.object({
    startAt: z.coerce.number(),
    endAt: z.coerce.number(),
    unit: z.string().optional(),
  });

  const { auth, query, error } = await parseRequest(request, schema);
  if (error) return error();

  const { websiteId } = await params;
  if (!(await canViewWebsite(auth, websiteId))) return unauthorized();

  // The DATE column holds plain calendar days — widen the ms-range to UTC day
  // boundaries so edge days never drop out for viewers west/east of UTC.
  const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  const rows = await prisma.client.importedStat.findMany({
    where: {
      websiteId,
      source: 'ga4',
      date: {
        gte: new Date(`${day(query.startAt)}T00:00:00Z`),
        lte: new Date(`${day(query.endAt)}T00:00:00Z`),
      },
    },
    orderBy: { date: 'asc' },
  });

  if (!rows.length) return json({ visitors: [], pageviews: [] });

  // Bucket by chart unit, emitting PLAIN calendar keys ('2026-06-15' / '2026-06')
  // — the chart matches them as strings, no timezone math anywhere.
  const bucketKey = (d: Date) =>
    query.unit === 'month' ? d.toISOString().slice(0, 7) : d.toISOString().slice(0, 10);

  const visitors = new Map<string, number>();
  const pageviews = new Map<string, number>();
  for (const r of rows) {
    const k = bucketKey(r.date);
    visitors.set(k, (visitors.get(k) || 0) + r.visitors);
    pageviews.set(k, (pageviews.get(k) || 0) + r.pageviews);
  }

  const toSeries = (m: Map<string, number>) => [...m.entries()].map(([x, y]) => ({ x, y }));

  return json({ visitors: toSeries(visitors), pageviews: toSeries(pageviews) });
}
