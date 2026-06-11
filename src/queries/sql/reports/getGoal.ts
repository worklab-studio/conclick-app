import clickhouse from '@/lib/clickhouse';
import { EVENT_TYPE } from '@/lib/constants';
import { CLICKHOUSE, PRISMA, runQuery } from '@/lib/db';
import prisma from '@/lib/prisma';
import { QueryFilters } from '@/lib/types';

export interface GoalParameters {
  startDate: Date;
  endDate: Date;
  type: string;
  value: string;
  timezone?: string;
  operator?: string;
  property?: string;
}

export interface GoalResult {
  num: number; // converting sessions
  total: number; // all sessions in range
  // GROSS payments (type='payment'; refunds/disputes not netted) from the distinct
  // converting sessions, where the payment occurred inside the same date window as the
  // conversion. Attribution is session-level (no payment-after-goal ordering). Populated
  // on the Prisma path only — the ClickHouse path returns just num/total.
  revenue?: number; // minor units
  currency?: string | null;
  series?: { t: string; y: number }[]; // converting sessions per day (PG only)
}

export async function getGoal(
  ...args: [websiteId: string, params: GoalParameters, filters: QueryFilters]
) {
  return runQuery({
    [PRISMA]: () => relationalQuery(...args),
    [CLICKHOUSE]: () => clickhouseQuery(...args),
  });
}

async function relationalQuery(
  websiteId: string,
  parameters: GoalParameters,
  filters: QueryFilters,
): Promise<GoalResult> {
  const { startDate, endDate, type, value, timezone } = parameters;
  const { rawQuery, parseFilters, getDateSQL } = prisma;
  const eventType = type === 'path' ? EVENT_TYPE.pageView : EVENT_TYPE.customEvent;
  const column = type === 'path' ? 'url_path' : 'event_name';
  const { filterQuery, dateQuery, joinSessionQuery, cohortQuery, queryParams } = parseFilters({
    ...filters,
    websiteId,
    value,
    startDate,
    endDate,
    eventType,
  });
  // Denominator = ALL sessions in range (not only sessions that fired a custom
  // event). Re-run parseFilters WITHOUT eventType so the total subquery doesn't
  // inherit `event_type = N`, which would inflate event-goal conversion rates.
  const { filterQuery: totalFilterQuery } = parseFilters({
    ...filters,
    websiteId,
    value,
    startDate,
    endDate,
  });

  // Conversion rate + revenue from the distinct converting sessions (deduped per
  // session, payments only) + a daily series for the card sparkline. One round-trip,
  // kind-discriminated like getClickMap.
  const rows: any[] = await rawQuery(
    `
    with conv as (
      select website_event.session_id, min(website_event.created_at) as first_at
      from website_event
      ${cohortQuery}
      ${joinSessionQuery}
      where website_event.website_id = {{websiteId::uuid}}
        and ${column} = {{value}}
        ${dateQuery}
        ${filterQuery}
      group by website_event.session_id
    ),
    rev as (
      select re.session_id, sum(re.amount_minor) as amount, max(re.currency) as currency
      from revenue_event re
      where re.website_id = {{websiteId::uuid}}
        and re.type = 'payment'
        and re.session_id is not null
        and re.occurred_at between {{startDate}} and {{endDate}}
      group by re.session_id
    )
    select 'summary' as kind, null::text as t,
      (select count(*) from conv)::int as num,
      (
        select count(distinct website_event.session_id)
        from website_event
        ${cohortQuery}
        ${joinSessionQuery}
        where website_event.website_id = {{websiteId::uuid}}
        ${dateQuery}
        ${totalFilterQuery}
      )::int as total,
      coalesce((select sum(r.amount) from conv c join rev r on r.session_id = c.session_id), 0)::float8 as revenue,
      (select max(r.currency) from conv c join rev r on r.session_id = c.session_id) as currency
    union all
    select 'series' as kind,
      ${getDateSQL('first_at', 'day', timezone || 'utc')} as t,
      count(*)::int as num, null::int as total, null::float8 as revenue, null::text as currency
    from conv
    group by 2
    order by kind, t
    `,
    queryParams,
  );

  const summary = rows.find(r => r.kind === 'summary');
  const series = rows
    .filter(r => r.kind === 'series')
    .map(r => ({ t: r.t, y: Number(r.num) || 0 }));

  return {
    num: Number(summary?.num) || 0,
    total: Number(summary?.total) || 0,
    revenue: Number(summary?.revenue) || 0,
    currency: summary?.currency || null,
    series,
  };
}

async function clickhouseQuery(
  websiteId: string,
  parameters: GoalParameters,
  filters: QueryFilters,
) {
  const { startDate, endDate, type, value } = parameters;
  const { rawQuery, parseFilters } = clickhouse;
  const eventType = type === 'path' ? EVENT_TYPE.pageView : EVENT_TYPE.customEvent;
  const column = type === 'path' ? 'url_path' : 'event_name';
  const { filterQuery, dateQuery, cohortQuery, queryParams } = parseFilters({
    ...filters,
    websiteId,
    value,
    startDate,
    endDate,
    eventType,
  });
  // Denominator = all sessions in range (no eventType filter). See PG branch.
  const { filterQuery: totalFilterQuery } = parseFilters({
    ...filters,
    websiteId,
    value,
    startDate,
    endDate,
  });

  return rawQuery(
    `
    select count(distinct session_id) as num,
    (
      select count(distinct session_id)
      from website_event
      ${cohortQuery}
      where website_id = {websiteId:UUID}
        ${dateQuery}
        ${totalFilterQuery}
    ) as total
    from website_event
    ${cohortQuery}
    where website_id = {websiteId:UUID}
      and ${column} = {value:String}
      ${dateQuery}
      ${filterQuery}
    `,
    queryParams,
  ).then(results => results?.[0]);
}
