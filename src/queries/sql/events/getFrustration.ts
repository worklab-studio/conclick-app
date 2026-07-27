import prisma from '@/lib/prisma';
import { QueryFilters } from '@/lib/types';

const FUNCTION_NAME = 'getFrustration';

export interface FrustrationRow {
  type: string;
  selector: string;
  text: string | null;
  count: number;
  /** Distinct sessions that hit this — the evidence weight. One session can
      be one confused person; several sessions is a real problem. */
  sessions: number;
}

// Privacy-first frustration signals from the tracker's "frustration" event
// (type rage|dead|form_abandon, element selector/label only — never input).
// Pivots event_data per event, then ranks by element. Postgres-only.
export async function getFrustration(
  websiteId: string,
  filters: QueryFilters,
): Promise<FrustrationRow[]> {
  const { rawQuery, parseFilters } = prisma;
  const { filterQuery, joinSessionQuery, cohortQuery, queryParams } = parseFilters({
    ...filters,
    websiteId,
  });

  return rawQuery(
    `
    with ev as (
      select
        event_data.website_event_id as id,
        max(website_event.session_id::text) as session_id,
        max(case when event_data.data_key = 'type' then event_data.string_value end) as type,
        max(case when event_data.data_key = 'selector' then event_data.string_value end) as selector,
        max(case when event_data.data_key = 'text' then event_data.string_value end) as text
      from event_data
      join website_event on website_event.event_id = event_data.website_event_id
        and website_event.website_id = {{websiteId::uuid}}
        and website_event.created_at between {{startDate}} and {{endDate}}
        and website_event.event_name = 'frustration'
      ${cohortQuery}
      ${joinSessionQuery}
      where event_data.website_id = {{websiteId::uuid}}
        and event_data.created_at between {{startDate}} and {{endDate}}
      ${filterQuery}
      group by event_data.website_event_id
    )
    select type, selector, max(text) as text, count(*)::int as count,
      count(distinct session_id)::int as sessions
    from ev
    where type is not null and selector is not null
    group by type, selector
    order by sessions desc, count desc
    limit 50
    `,
    queryParams,
    FUNCTION_NAME,
  ).then((rows: any[]) =>
    rows.map(r => ({
      type: r.type,
      selector: r.selector,
      text: r.text || null,
      count: Number(r.count) || 0,
      sessions: Number(r.sessions) || 0,
    })),
  );
}
