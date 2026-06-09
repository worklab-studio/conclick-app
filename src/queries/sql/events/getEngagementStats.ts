import prisma from '@/lib/prisma';
import { QueryFilters } from '@/lib/types';

const FUNCTION_NAME = 'getEngagementStats';

// Aggregate engagement from the tracker's "engagement" event
// (event_data: scroll 0-100, clicks count). Postgres-only (no ClickHouse here).
export async function getEngagementStats(
  websiteId: string,
  filters: QueryFilters,
): Promise<{ avgScroll: any; totalClicks: any; visits: any; sessions: any }> {
  const { rawQuery, parseFilters } = prisma;
  const { filterQuery, joinSessionQuery, cohortQuery, queryParams } = parseFilters({
    ...filters,
    websiteId,
  });

  return rawQuery(
    `
    select
      avg(case when event_data.data_key = 'scroll' then event_data.number_value end) as "avgScroll",
      sum(case when event_data.data_key = 'clicks' then event_data.number_value end) as "totalClicks",
      count(distinct website_event.visit_id) as "visits",
      count(distinct website_event.session_id) as "sessions"
    from event_data
    join website_event on website_event.event_id = event_data.website_event_id
      and website_event.website_id = {{websiteId::uuid}}
      and website_event.created_at between {{startDate}} and {{endDate}}
      and website_event.event_name = 'engagement'
    ${cohortQuery}
    ${joinSessionQuery}
    where event_data.website_id = {{websiteId::uuid}}
      and event_data.created_at between {{startDate}} and {{endDate}}
    ${filterQuery}
    `,
    queryParams,
    FUNCTION_NAME,
  ).then((r: any) => r?.[0] || {});
}
