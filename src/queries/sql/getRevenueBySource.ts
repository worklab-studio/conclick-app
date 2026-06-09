import prisma from '@/lib/prisma';
import { QueryFilters } from '@/lib/types';

const FUNCTION_NAME = 'getRevenueBySource';

export interface RevenueBySourceRow {
  source: string;
  customers: number;
  revenue: number;
  currency: string;
}

// Revenue grouped by the FIRST-touch source of each paying session — i.e. where
// your buyers *originally* came from. Postgres-only (revenue_event is relational).
export async function getRevenueBySource(
  websiteId: string,
  filters: QueryFilters,
): Promise<RevenueBySourceRow[]> {
  const { rawQuery, parseFilters } = prisma;
  const { queryParams } = parseFilters({ ...filters, websiteId });

  return rawQuery(
    `
    with paying as (
      select rev.session_id,
             sum(rev.amount_minor) as revenue,
             max(rev.currency) as currency
      from revenue_event rev
      where rev.website_id = {{websiteId::uuid}}
        and rev.type = 'payment'
        and rev.session_id is not null
        and rev.occurred_at between {{startDate}} and {{endDate}}
      group by rev.session_id
    ),
    first_touch as (
      select distinct on (we.session_id)
             we.session_id,
             case when coalesce(we.referrer_domain, '') = '' then 'Direct'
                  else we.referrer_domain end as source
      from website_event we
      where we.website_id = {{websiteId::uuid}}
        and we.session_id in (select session_id from paying)
        and we.event_type != 2
      order by we.session_id, we.created_at asc
    )
    select ft.source,
           count(*)::int as customers,
           coalesce(sum(p.revenue), 0)::float8 as revenue,
           max(p.currency) as currency
    from paying p
    join first_touch ft on ft.session_id = p.session_id
    group by ft.source
    order by revenue desc
    `,
    queryParams,
    FUNCTION_NAME,
  ).then((rows: any[]) =>
    rows.map(r => ({
      source: r.source,
      customers: Number(r.customers) || 0,
      revenue: Number(r.revenue) || 0,
      currency: r.currency || 'USD',
    })),
  );
}
