import prisma from '@/lib/prisma';
import { QueryFilters } from '@/lib/types';

const FUNCTION_NAME = 'getCampaigns';

export interface CampaignRow {
  campaign: string;
  visitors: number;
  paying: number;
  revenue: number;
  currency: string;
}

// Per-campaign rollup: utm_campaign → visitors, paying, revenue (join revenue_event).
// Postgres-only (revenue_event is relational).
export async function getCampaigns(
  websiteId: string,
  filters: QueryFilters,
): Promise<CampaignRow[]> {
  const { rawQuery, parseFilters } = prisma;
  const { queryParams, filterQuery, joinSessionQuery, cohortQuery, dateQuery } = parseFilters({
    ...filters,
    websiteId,
  });

  return rawQuery(
    `
    with campaign_sessions as (
      select distinct
        website_event.session_id,
        website_event.utm_campaign as campaign
      from website_event
      ${cohortQuery}
      ${joinSessionQuery}
      where website_event.website_id = {{websiteId::uuid}}
        and website_event.event_type != 2
        ${dateQuery}
        ${filterQuery}
        and coalesce(website_event.utm_campaign, '') != ''
    )
    select
      c.campaign,
      count(distinct c.session_id) as visitors,
      count(distinct case when rev.session_id is not null then c.session_id end) as paying,
      coalesce(sum(rev.amount_minor), 0)::float8 as revenue,
      max(rev.currency) as currency
    from campaign_sessions c
    left join revenue_event rev
      on rev.session_id = c.session_id
      and rev.website_id = {{websiteId::uuid}}
      and rev.type = 'payment'
    group by c.campaign
    order by visitors desc
    `,
    queryParams,
    FUNCTION_NAME,
  ).then((rows: any[]) =>
    rows.map(r => ({
      campaign: r.campaign,
      visitors: Number(r.visitors) || 0,
      paying: Number(r.paying) || 0,
      revenue: Number(r.revenue) || 0,
      currency: r.currency || 'USD',
    })),
  );
}
