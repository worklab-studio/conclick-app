import { z } from 'zod';
import { parseRequest } from '@/lib/request';
import { json, unauthorized } from '@/lib/response';
import { dateRangeParams } from '@/lib/schema';
import { getCompareDate } from '@/lib/date';
import { isPaidOrTrialUser } from '@/lib/billing';
import prisma from '@/lib/prisma';
import { getTeamOwner } from '@/queries/prisma/teamUser';

/**
 * Fleet overview: stats + comparison + visitors series for MANY websites in
 * ONE request — and a fixed number of DB queries no matter the fleet size.
 *
 * GET /api/websites/overview?websiteIds=a,b,c&startAt=&endAt=&unit=&timezone=
 *
 * The /websites page used to make 2 HTTP calls per site (22 for 11 sites),
 * each paying the full per-request tax (Clerk parse, permission lookups,
 * subscription check) before running 4+ aggregates. On a 1-vCPU Postgres all
 * that concurrency just time-slices one core: the fleet took 9-15s to settle.
 * A first batch version (one HTTP call, per-site queries inside) still ran
 * ~35 aggregate queries and clocked 11.5s for 11 sites. This version groups
 * by website_id so the whole fleet costs:
 *   1 permission query + owner subscription lookups (1 per distinct owner)
 *   + 3 grouped aggregates (stats current, stats compare, sessions series).
 *
 * Response: { data: [{ websiteId, stats: {..., comparison}, sessions }] }
 * - stats mirrors /websites/{id}/stats EXACTLY (same subquery semantics from
 *   getWebsiteStats), so numbers agree with the per-site dashboards.
 * - sessions mirrors the sessions series of /websites/{id}/pageviews (the
 *   card sparkline input). Unpaid-owner sites get [] — same as the per-site
 *   endpoint, which 401s the series but not the stats.
 * - Sites the caller can't view are silently omitted.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UNITS = new Set(['minute', 'hour', 'day', 'month', 'year']);
const MAX_WEBSITES = 50;

function safeTimezone(tz: string | undefined): string {
  if (!tz) return 'utc';
  try {
    // Throws on anything that isn't a real IANA zone — this string is
    // interpolated into SQL by getDateSQL, so it must be provably safe.
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    return 'utc';
  }
}

export async function GET(request: Request) {
  const schema = z.object({
    ...dateRangeParams,
    websiteIds: z.string(),
  });

  const { auth, query, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  if (!auth.user) {
    return unauthorized();
  }

  const requested = [...new Set(String(query.websiteIds).split(','))]
    .filter(id => UUID_RE.test(id))
    .slice(0, MAX_WEBSITES);

  if (requested.length === 0) {
    return json({ data: [] });
  }

  // ONE permission query for the whole fleet: sites the user owns, sites on
  // teams the user belongs to — or everything requested, for admins.
  const websites = await prisma.client.website.findMany({
    where: {
      id: { in: requested },
      deletedAt: null,
      ...(auth.user.isAdmin
        ? {}
        : {
            OR: [
              { userId: auth.user.id },
              { team: { members: { some: { userId: auth.user.id } } } },
            ],
          }),
    },
    select: { id: true, userId: true, teamId: true },
  });

  if (websites.length === 0) {
    return json({ data: [] });
  }

  // Subscription state per EFFECTIVE OWNER (same rule as websiteHasPaidOwner:
  // team sites inherit the team owner's plan), one lookup per distinct owner
  // instead of one chain per site.
  const ownerIds = [...new Set(websites.map(w => w.userId).filter(Boolean))] as string[];
  const teamIds = [...new Set(websites.map(w => w.teamId).filter(Boolean))] as string[];

  const [owners, teamOwners] = await Promise.all([
    ownerIds.length
      ? prisma.client.user.findMany({ where: { id: { in: ownerIds } } })
      : Promise.resolve([]),
    Promise.all(teamIds.map(async teamId => ({ teamId, owner: await getTeamOwner(teamId) }))),
  ]);

  const paidUsers = new Map(owners.map(u => [u.id, isPaidOrTrialUser(u as any)]));
  const paidTeams = new Map(
    teamOwners.map(({ teamId, owner }) => [
      teamId,
      owner?.user ? isPaidOrTrialUser(owner.user as any) : false,
    ]),
  );
  const isPaid = (w: { userId: string | null; teamId: string | null }) =>
    w.teamId ? !!paidTeams.get(w.teamId) : w.userId ? !!paidUsers.get(w.userId) : false;

  // Grouped aggregates — one scan each for the whole fleet. Ids are strictly
  // UUID-validated above, so inlining them as literals is safe (rawQuery's
  // mustache binding has no array support).
  const { rawQuery, getDateSQL, getTimestampDiffSQL } = prisma;
  const idList = websites.map(w => `'${w.id}'::uuid`).join(', ');

  const startDate = new Date(Number(query.startAt));
  const endDate = new Date(Number(query.endAt));

  if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime())) {
    return json({ data: [] });
  }

  const unit = UNITS.has(String(query.unit)) ? String(query.unit) : 'day';
  const timezone = safeTimezone(query.timezone as string);

  const { startDate: compareStart, endDate: compareEnd } = getCompareDate(
    'prev',
    startDate,
    endDate,
  );

  // Same shape as getWebsiteStats' relational query, grouped by website_id.
  const statsSQL = (from: string, to: string) => `
    select
      t.website_id as "websiteId",
      cast(coalesce(sum(t.c), 0) as bigint) as "pageviews",
      count(distinct t.session_id) as "visitors",
      count(distinct t.visit_id) as "visits",
      cast(coalesce(sum(case when t.c = 1 then 1 else 0 end), 0) as bigint) as "bounces",
      cast(coalesce(sum(${getTimestampDiffSQL('t.min_time', 't.max_time')}), 0) as bigint) as "totaltime"
    from (
      select
        website_id,
        session_id,
        visit_id,
        count(*) as "c",
        min(created_at) as "min_time",
        max(created_at) as "max_time"
      from website_event
      where website_id in (${idList})
        and created_at between {{${from}}} and {{${to}}}
        and event_type != 2
      group by 1, 2, 3
    ) as t
    group by 1
  `;

  const [statsRows, compareRows, seriesRows] = await Promise.all([
    rawQuery(statsSQL('startDate', 'endDate'), { startDate, endDate }, 'overviewStats'),
    rawQuery(
      statsSQL('compareStart', 'compareEnd'),
      { compareStart, compareEnd },
      'overviewCompare',
    ),
    // Same shape as getSessionStats' relational query, grouped by website_id.
    rawQuery(
      `
      select
        website_id as "websiteId",
        ${getDateSQL('created_at', unit, timezone)} x,
        count(distinct session_id) y
      from website_event
      where website_id in (${idList})
        and created_at between {{startDate}} and {{endDate}}
        and event_type != 2
      group by 1, 2
      order by 2
      `,
      { startDate, endDate },
      'overviewSeries',
    ),
  ]);

  const zero = { pageviews: 0, visitors: 0, visits: 0, bounces: 0, totaltime: 0 };
  const statsById = new Map(statsRows.map((r: any) => [r.websiteId, r]));
  const compareById = new Map(compareRows.map((r: any) => [r.websiteId, r]));
  const seriesById = new Map<string, { x: string; y: number }[]>();
  for (const row of seriesRows as any[]) {
    const list = seriesById.get(row.websiteId) || [];
    list.push({ x: row.x, y: row.y });
    seriesById.set(row.websiteId, list);
  }

  const strip = (row: any) => {
    if (!row) return { ...zero };
    const rest = { ...row };
    delete rest.websiteId;
    return rest;
  };

  const data = websites.map(w => ({
    websiteId: w.id,
    stats: { ...strip(statsById.get(w.id)), comparison: strip(compareById.get(w.id)) },
    sessions: isPaid(w) ? seriesById.get(w.id) || [] : [],
  }));

  return json({ data });
}
