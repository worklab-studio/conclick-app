import prisma from '@/lib/prisma';
import { AI_DOMAINS } from '@/lib/constants';
import { QueryFilters } from '@/lib/types';

const FUNCTION_NAME = 'getAiTraffic';

const aiClause = (column: string) =>
  AI_DOMAINS.map(d => `${column} ilike '%${d.replace(/'/g, "''")}%'`).join(' OR\n        ');

export interface AiTrafficRow {
  source: string;
  visitors: number;
  paying: number;
  revenue: number;
  currency: string;
}

// Visitors who arrived FROM an AI assistant / answer engine (ChatGPT, Perplexity,
// Gemini, Copilot, Claude…), with how many paid and how much revenue they drove.
// Postgres-only (revenue_event is relational; no ClickHouse branch).
export async function getAiTraffic(
  websiteId: string,
  filters: QueryFilters,
): Promise<AiTrafficRow[]> {
  const { rawQuery, parseFilters } = prisma;
  const { queryParams, filterQuery, joinSessionQuery, cohortQuery, dateQuery } = parseFilters({
    ...filters,
    websiteId,
  });

  return rawQuery(
    `
    with ai_sessions as (
      select distinct
        website_event.session_id,
        lower(website_event.referrer_domain) as source
      from website_event
      ${cohortQuery}
      ${joinSessionQuery}
      where website_event.website_id = {{websiteId::uuid}}
        and website_event.event_type != 2
        ${dateQuery}
        ${filterQuery}
        and (${aiClause('website_event.referrer_domain')})
    )
    select
      s.source,
      count(distinct s.session_id) as visitors,
      count(distinct case when rev.session_id is not null then s.session_id end) as paying,
      coalesce(sum(rev.amount_minor), 0)::float8 as revenue,
      max(rev.currency) as currency
    from ai_sessions s
    left join revenue_event rev
      on rev.session_id = s.session_id
      and rev.website_id = {{websiteId::uuid}}
      and rev.type = 'payment'
    group by s.source
    order by visitors desc
    `,
    queryParams,
    FUNCTION_NAME,
  ).then((rows: any[]) =>
    rows.map(r => ({
      source: r.source,
      visitors: Number(r.visitors) || 0,
      paying: Number(r.paying) || 0,
      revenue: Number(r.revenue) || 0,
      currency: r.currency || 'USD',
    })),
  );
}
