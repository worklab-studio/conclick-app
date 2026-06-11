import prisma from '@/lib/prisma';
import { QueryFilters } from '@/lib/types';

const FUNCTION_NAME = 'getClickMap';

export type ClickMapCohort =
  | 'all'
  | 'paid'
  | 'non_buyer'
  | 'refunded'
  | 'high_ltv'
  | 'abandoner'
  | 'trial';

export interface ClickMapDepthBucket {
  bucket: number; // 0..9 → 0–10% .. 90–100% down the page
  clicks: number;
  sessions: number;
  revenue: number; // minor units, distinct-session sum
}

export interface ClickMapElement {
  selector: string;
  label: string | null;
  clicks: number;
  sessions: number;
  revenue: number; // minor units, distinct-session sum
  medianY?: number | null; // median page-depth 0..100 of this element's clicks; null when no tracked y
}

export interface ClickMapResult {
  cohort: ClickMapCohort;
  estimated: boolean; // trial blends explicit identify({plan}) + a heuristic fallback
  currency: string;
  hasRevenueData: boolean; // any payment events in range — buyer cohorts are locked without it
  total: { clicks: number; sessions: number; revenue: number };
  depth: ClickMapDepthBucket[]; // always length 10
  elements: ClickMapElement[];
}

// `page_sessions` = the distinct sessions that clicked on the chosen page. Each
// fragment narrows that set to a buyer cohort. These are SERVER-SIDE CONSTANTS
// (never user input), so inlining them into the SQL is safe. The placeholders
// ({{websiteId::uuid}}, {{startDate}}, {{endDate}}) are bound by rawQuery.
const COHORT_FRAGMENTS: Record<ClickMapCohort, string> = {
  all: `select session_id from page_sessions`,
  paid: `select ps.session_id from page_sessions ps
         join rev r on r.session_id = ps.session_id and r.paid_minor > 0`,
  non_buyer: `select ps.session_id from page_sessions ps
         left join rev r on r.session_id = ps.session_id
         where coalesce(r.paid_minor, 0) <= 0`,
  refunded: `select ps.session_id from page_sessions ps
         join rev r on r.session_id = ps.session_id and r.refunds > 0`,
  high_ltv: `select ps.session_id from page_sessions ps
         join rev r on r.session_id = ps.session_id
         where r.paid_minor > 0
           and r.paid_minor >= (
             select percentile_cont(0.75) within group (order by paid_minor)
             from rev where paid_minor > 0
           )`,
  abandoner: `select ps.session_id from page_sessions ps
         where exists (
             select 1 from website_event we2
             where we2.session_id = ps.session_id
               and we2.website_id = {{websiteId::uuid}}
               and we2.created_at between {{startDate}} and {{endDate}}
               and we2.url_path ~* '(checkout|billing|payment|/pay|subscribe|upgrade|cart)'
           )
           and not exists (
             select 1 from rev r where r.session_id = ps.session_id and r.paid_minor > 0
           )`,
  // Explicit identify({plan:'trial'}) takes precedence; the heuristic fallback is
  // "identified (has any session_data) AND never paid" — labeled estimated in the UI.
  trial: `select ps.session_id from page_sessions ps
         where exists (
             select 1 from session_data sd
             where sd.session_id = ps.session_id
               and sd.website_id = {{websiteId::uuid}}
               and sd.data_key = 'plan' and lower(sd.string_value) = 'trial'
           )
           or (
             exists (
               select 1 from session_data sd2
               where sd2.session_id = ps.session_id and sd2.website_id = {{websiteId::uuid}}
             )
             and not exists (
               select 1 from rev r where r.session_id = ps.session_id and r.paid_minor > 0
             )
           )`,
};

/**
 * Revenue-weighted click map for one page: clicks bucketed by coarse page-depth
 * (the tracker's `y` 0–100) and by element, scoped to a buyer cohort and weighted
 * by the revenue of the distinct sessions that clicked. Postgres-only (revenue_event
 * + event_data are relational). Revenue is deduped per session per bucket/element so
 * a single buyer clicking many times isn't counted many times.
 */
export async function getClickMap(
  websiteId: string,
  filters: QueryFilters,
  { urlPath, cohort }: { urlPath: string; cohort: ClickMapCohort },
): Promise<ClickMapResult> {
  const { rawQuery, parseFilters } = prisma;
  const { queryParams } = parseFilters({ ...filters, websiteId });
  queryParams.urlPath = urlPath;

  const cohortSql = COHORT_FRAGMENTS[cohort] || COHORT_FRAGMENTS.all;

  const rows: any[] = await rawQuery(
    `
    with rev as (
      select session_id,
             sum(amount_minor)::float8 as revenue,
             sum(case when type = 'payment' then amount_minor else 0 end)::float8 as paid_minor,
             sum(case when type in ('refund','dispute') then 1 else 0 end)::int as refunds,
             max(currency) as currency
      from revenue_event
      where website_id = {{websiteId::uuid}}
        and session_id is not null
        and occurred_at between {{startDate}} and {{endDate}}
      group by session_id
    ),
    clicks as (
      select we.session_id,
             we.event_id,
             max(case when ed.data_key = 'selector' then ed.string_value end) as selector,
             max(case when ed.data_key = 'text' then ed.string_value end) as label,
             max(case when ed.data_key = 'y' then ed.number_value end) as y
      from website_event we
      join event_data ed on ed.website_event_id = we.event_id
        and ed.website_id = {{websiteId::uuid}}
        and ed.created_at between {{startDate}} and {{endDate}}
      where we.website_id = {{websiteId::uuid}}
        and we.created_at between {{startDate}} and {{endDate}}
        and we.url_path = {{urlPath}}
        and we.event_type = 2
        and we.event_name like 'Clicked: %'
      group by we.session_id, we.event_id
    ),
    page_sessions as (
      select distinct session_id from clicks
    ),
    cohort_sessions as (
      ${cohortSql}
    ),
    cohort_clicks as (
      select c.session_id, c.event_id, c.selector, c.label, c.y
      from clicks c
      join cohort_sessions cs on cs.session_id = c.session_id
    ),
    depth_clicks as (
      select least(9, floor(c.y / 10))::int as bucket, c.session_id, c.event_id
      from cohort_clicks c
      where c.y is not null
    ),
    depth_agg as (
      select bucket, count(*)::int as clicks, count(distinct session_id)::int as sessions
      from depth_clicks group by bucket
    ),
    depth_rev as (
      select d.bucket,
             coalesce(sum(r.revenue), 0)::float8 as revenue,
             max(r.currency) as currency
      from (select distinct bucket, session_id from depth_clicks) d
      left join rev r on r.session_id = d.session_id
      group by d.bucket
    ),
    elem_clicks as (
      select c.selector, c.label, c.session_id, c.event_id, c.y
      from cohort_clicks c
      where c.selector is not null
    ),
    elem_depth as (
      select selector, percentile_cont(0.5) within group (order by y)::float8 as median_y
      from elem_clicks
      where y is not null
      group by selector
    ),
    elem_agg as (
      select selector, max(label) as label,
             count(*)::int as clicks, count(distinct session_id)::int as sessions
      from elem_clicks group by selector
    ),
    elem_rev as (
      select e.selector,
             coalesce(sum(r.revenue), 0)::float8 as revenue,
             max(r.currency) as currency
      from (select distinct selector, session_id from elem_clicks) e
      left join rev r on r.session_id = e.session_id
      group by e.selector
    )
    select 'depth' as kind, da.bucket as bucket, null::text as selector, null::text as label,
           da.clicks, da.sessions, dr.revenue, dr.currency, null::float8 as pos
    from depth_agg da join depth_rev dr on dr.bucket = da.bucket
    union all
    select 'element' as kind, null::int as bucket, ea.selector, ea.label,
           ea.clicks, ea.sessions, er.revenue, er.currency, ed.median_y as pos
    from elem_agg ea
      join elem_rev er on er.selector = ea.selector
      left join elem_depth ed on ed.selector = ea.selector
    union all
    select 'total' as kind, null::int as bucket, null::text as selector, null::text as label,
           (select count(*)::int from cohort_clicks) as clicks,
           (select count(*)::int from cohort_sessions) as sessions,
           coalesce((
             select sum(r.revenue) from cohort_sessions cs
             left join rev r on r.session_id = cs.session_id
           ), 0)::float8 as revenue,
           (select max(currency) from rev) as currency,
           -- pos on the total row carries "any payment data in range?" (site-wide,
           -- regardless of session linkage) — the UI locks buyer cohorts without it.
           (select count(*)::float8 from revenue_event re2
             where re2.website_id = {{websiteId::uuid}}
               and re2.occurred_at between {{startDate}} and {{endDate}}) as pos
    order by kind, clicks desc
    `,
    queryParams,
    FUNCTION_NAME,
  );

  const totalRow = rows.find(r => r.kind === 'total');
  const depthRaw = rows.filter(r => r.kind === 'depth');

  const elements: ClickMapElement[] = rows
    .filter(r => r.kind === 'element')
    .map(r => ({
      selector: r.selector,
      label: r.label || null,
      clicks: Number(r.clicks) || 0,
      sessions: Number(r.sessions) || 0,
      revenue: Number(r.revenue) || 0,
      medianY: r.pos == null ? null : Number(r.pos),
    }))
    .slice(0, 30);

  // Always render all 10 depth buckets (0..9), even the empty ones.
  const byBucket = new Map<number, any>();
  for (const r of depthRaw) byBucket.set(Number(r.bucket), r);
  const depth: ClickMapDepthBucket[] = Array.from({ length: 10 }, (_, i) => {
    const r = byBucket.get(i);
    return {
      bucket: i,
      clicks: r ? Number(r.clicks) || 0 : 0,
      sessions: r ? Number(r.sessions) || 0 : 0,
      revenue: r ? Number(r.revenue) || 0 : 0,
    };
  });

  const currency = totalRow?.currency || depthRaw.find(r => r.currency)?.currency || 'USD';

  return {
    cohort,
    estimated: cohort === 'trial',
    currency,
    hasRevenueData: Number(totalRow?.pos) > 0,
    total: {
      clicks: Number(totalRow?.clicks) || 0,
      sessions: Number(totalRow?.sessions) || 0,
      revenue: Number(totalRow?.revenue) || 0,
    },
    depth,
    elements,
  };
}
