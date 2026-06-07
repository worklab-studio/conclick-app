import { PRISMA, runQuery } from '@/lib/db';
import prisma from '@/lib/prisma';
import { QueryFilters } from '@/lib/types';

const FUNCTION_NAME = 'getPaymentCustomers';

/**
 * Paying customers for the "Journey for payment" view: one row per session that
 * has at least one attributed `payment` RevenueEvent, with what they spent, when
 * they first paid, and how long they took to convert (first touch -> payment).
 *
 * Relational-only: revenue_event lives in the relational store (not ClickHouse),
 * so this query has no ClickHouse branch. On this deployment CLICKHOUSE_URL is
 * unset, so runQuery always takes the PRISMA path.
 */
export async function getPaymentCustomers(...args: [websiteId: string, filters: QueryFilters]) {
  return runQuery({
    [PRISMA]: () => relationalQuery(...args),
  });
}

async function relationalQuery(websiteId: string, filters: QueryFilters) {
  const { pagedRawQuery, parseFilters } = prisma;
  const { queryParams } = parseFilters({ ...filters, websiteId });

  // Constrain to payments in the selected range (by payment time).
  const dateClause =
    filters.startDate && filters.endDate
      ? 'and occurred_at between {{startDate}} and {{endDate}}'
      : '';

  return pagedRawQuery(
    `
    select
      s.session_id as "id",
      s.distinct_id as "distinctId",
      s.country,
      s.device,
      s.os,
      s.browser,
      coalesce(rev.spent_minor, 0)::float8 as "spentMinor",
      rev.spent_currency as "spentCurrency",
      rev.paid_at as "completedAt",
      fe.first_at as "firstAt",
      extract(epoch from (rev.paid_at - fe.first_at))::float8 as "secondsToComplete"
    from (
      select session_id,
             sum(amount_minor) as spent_minor,
             max(currency) as spent_currency,
             min(occurred_at) as paid_at
      from revenue_event
      where website_id = {{websiteId::uuid}}
        and type = 'payment'
        and session_id is not null
        ${dateClause}
      group by session_id
    ) rev
    join session s
      on s.session_id = rev.session_id
      and s.website_id = {{websiteId::uuid}}
    left join (
      select session_id, min(created_at) as first_at
      from website_event
      where website_id = {{websiteId::uuid}}
      group by session_id
    ) fe on fe.session_id = rev.session_id
    order by rev.paid_at desc
    `,
    queryParams,
    filters,
    FUNCTION_NAME,
  );
}
