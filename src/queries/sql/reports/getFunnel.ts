import clickhouse from '@/lib/clickhouse';
import { CLICKHOUSE, PRISMA, runQuery } from '@/lib/db';
import prisma from '@/lib/prisma';
import { QueryFilters } from '@/lib/types';

export interface FunnelParameters {
  startDate: Date;
  endDate: Date;
  window: number;
  steps: { type: string; value: string }[];
}

export interface FunnelResult {
  value: string;
  visitors: number;
  previous?: number;
  dropped?: number;
  dropoff: number;
  remaining?: number;
  revenue?: number; // minor units; payments from the distinct sessions reaching this step
  revenuePerVisitor?: number; // minor units
  medianMs?: number | null; // median time from step 1 to this step (ms)
}

export async function getFunnel(
  ...args: [websiteId: string, parameters: FunnelParameters, filters: QueryFilters]
) {
  return runQuery({
    [PRISMA]: () => relationalQuery(...args),
    [CLICKHOUSE]: () => clickhouseQuery(...args),
  });
}

async function relationalQuery(
  websiteId: string,
  parameters: FunnelParameters,
  filters: QueryFilters,
): Promise<FunnelResult[]> {
  const { startDate, endDate, window, steps } = parameters;
  const { rawQuery, getAddIntervalQuery, parseFilters } = prisma;
  const { filterQuery, joinSessionQuery, cohortQuery, queryParams } = parseFilters({
    ...filters,
    websiteId,
    startDate,
    endDate,
  });
  const { levelOneQuery, levelQuery, sumQuery, params } = getFunnelQuery(steps, window);

  function getFunnelQuery(
    steps: { type: string; value: string }[],
    window: number,
  ): {
    levelOneQuery: string;
    levelQuery: string;
    sumQuery: string;
    params: string[];
  } {
    return steps.reduce(
      (pv, cv, i) => {
        const levelNumber = i + 1;
        const startSum = i > 0 ? 'union ' : '';
        const isURL = cv.type === 'path';
        const column = isURL ? 'url_path' : 'event_name';
        const isWildcard = cv.value.startsWith('*') || cv.value.endsWith('*');

        let operator = '=';
        let paramValue = cv.value;

        if (isWildcard) {
          operator = 'like';
          // Escape LIKE metacharacters (\ % _) in the user-supplied value FIRST
          // so an interior % or _ is matched literally, THEN map the leading/
          // trailing '*' wildcard to '%'. Previously interior %/_ stayed live,
          // producing incorrect funnel cohorts (e.g. "/foo%bar" matched "/fooXbar").
          paramValue = cv.value.replace(/[\\%_]/g, '\\$&').replace(/^\*|\*$/g, '%');
        }

        // Plain path steps match hash-anchor and trailing-slash variants: a
        // step "/" must count "/#pricing" rows (scroll anchors, not pages),
        // and "/docs" must count "/docs/". The pickers merge those variants,
        // so matching has to as well or cohorts silently undercount. An
        // explicit "#" in the value opts back into exact anchor targeting.
        const normalizedPathEq = isURL && !isWildcard && !cv.value.includes('#');
        const stepCondition = (prefix: string) =>
          normalizedPathEq
            ? `rtrim(split_part(${prefix}${column}, '#', 1), '/') = rtrim({{${i}}}, '/')`
            : `${prefix}${column} ${operator} {{${i}}}`;

        if (levelNumber === 1) {
          pv.levelOneQuery = `
          WITH level1 AS (
            select distinct website_event.session_id, website_event.created_at
            from website_event
            ${cohortQuery}
            ${joinSessionQuery}
            where website_event.website_id = {{websiteId::uuid}}
              and website_event.created_at between {{startDate}} and {{endDate}}
              and ${stepCondition('website_event.')}
              ${filterQuery}
          )`;
        } else {
          pv.levelQuery += `
          , level${levelNumber} AS (
            select distinct we.session_id, we.created_at
            from level${i} l
            join website_event we
                on l.session_id = we.session_id
            where we.website_id = {{websiteId::uuid}}
                and we.created_at between l.created_at and ${getAddIntervalQuery(
                  `l.created_at `,
                  `${window} minute`,
                )}
                and ${stepCondition('we.')}
                and we.created_at <= {{endDate}}
          )`;
        }

        // Per-level rollup: visitor count, revenue (deduped to distinct sessions so a
        // buyer's payment isn't multiplied by repeat events), and median time from step 1.
        const medianExpr =
          levelNumber === 1
            ? '0::float8'
            : `(select percentile_cont(0.5) within group (order by ms)::float8
                from (select extract(epoch from (min(n.created_at) - t1.t)) * 1000 as ms
                      from level${levelNumber} n join t1 on t1.session_id = n.session_id
                      group by n.session_id, t1.t) d)`;
        pv.sumQuery += `\n${startSum}select ${levelNumber} as level,
          (select count(distinct session_id) from level${levelNumber}) as count,
          coalesce((select sum(r.paid_minor)::float8
                    from (select distinct session_id from level${levelNumber}) z
                    left join rev r on r.session_id = z.session_id), 0)::float8 as revenue,
          ${medianExpr} as median_ms`;
        pv.params.push(paramValue);

        return pv;
      },
      {
        levelOneQuery: '',
        levelQuery: '',
        sumQuery: '',
        params: [],
      },
    );
  }

  return rawQuery(
    `
    ${levelOneQuery}
    ${levelQuery}
    , rev as (
      select session_id,
             sum(case when type = 'payment' then amount_minor else 0 end)::float8 as paid_minor
      from revenue_event
      where website_id = {{websiteId::uuid}}
        and session_id is not null
        and occurred_at between {{startDate}} and {{endDate}}
      group by session_id
    )
    , t1 as ( select session_id, min(created_at) as t from level1 group by session_id )
    ${sumQuery}
    ORDER BY level;
    `,
    {
      ...params,
      ...queryParams,
    },
  ).then(formatResults(steps));
}

async function clickhouseQuery(
  websiteId: string,
  parameters: FunnelParameters,
  filters: QueryFilters,
): Promise<
  {
    value: string;
    visitors: number;
    dropoff: number;
  }[]
> {
  const { startDate, endDate, window, steps } = parameters;
  const { rawQuery, parseFilters } = clickhouse;
  const { levelOneQuery, levelQuery, sumQuery, stepFilterQuery, params } = getFunnelQuery(
    steps,
    window,
  );
  const { filterQuery, cohortQuery, queryParams } = parseFilters({
    ...filters,
    websiteId,
    startDate,
    endDate,
  });

  function getFunnelQuery(
    steps: { type: string; value: string }[],
    window: number,
  ): {
    levelOneQuery: string;
    levelQuery: string;
    sumQuery: string;
    stepFilterQuery: string;
    params: Record<string, string>;
  } {
    return steps.reduce(
      (pv, cv, i) => {
        const levelNumber = i + 1;
        const startSum = i > 0 ? 'union all ' : '';
        const startFilter = i > 0 ? 'or' : '';
        const isURL = cv.type === 'path';
        const column = isURL ? 'url_path' : 'event_name';

        let operator = '=';
        let paramValue = cv.value;

        if (cv.value.startsWith('*') || cv.value.endsWith('*')) {
          operator = 'like';
          // Escape LIKE metacharacters (\ % _) in the user-supplied value FIRST
          // so an interior % or _ is matched literally, THEN map the leading/
          // trailing '*' wildcard to '%'. Previously interior %/_ stayed live,
          // producing incorrect funnel cohorts (e.g. "/foo%bar" matched "/fooXbar").
          paramValue = cv.value.replace(/[\\%_]/g, '\\$&').replace(/^\*|\*$/g, '%');
        }

        if (levelNumber === 1) {
          pv.levelOneQuery = `\n
          level1 AS (
            select *
            from level0
            where ${column} ${operator} {param${i}:String}
          )`;
        } else {
          pv.levelQuery += `\n
          , level${levelNumber} AS (
            select distinct y.session_id as session_id,
                y.url_path as url_path,
                y.referrer_path as referrer_path,
                y.event_name,
                y.created_at as created_at
            from level${i} x
            join level0 y
            on x.session_id = y.session_id
            where y.created_at between x.created_at and x.created_at + interval ${window} minute
                and y.${column} ${operator} {param${i}:String}
          )`;
        }

        pv.sumQuery += `\n${startSum}select ${levelNumber} as level, count(distinct(session_id)) as count from level${levelNumber}`;
        pv.stepFilterQuery += `${startFilter} ${column} ${operator} {param${i}:String} `;
        pv.params[`param${i}`] = paramValue;

        return pv;
      },
      {
        levelOneQuery: '',
        levelQuery: '',
        sumQuery: '',
        stepFilterQuery: '',
        params: {},
      },
    );
  }

  return rawQuery(
    `
    WITH level0 AS (
      select distinct session_id, url_path, referrer_path, event_name, created_at
      from website_event
      ${cohortQuery}
      where (${stepFilterQuery})
        and website_id = {websiteId:UUID}
        and created_at between {startDate:DateTime64} and {endDate:DateTime64}
       ${filterQuery}
    ),
    ${levelOneQuery}
    ${levelQuery}
    select *
    from (
      ${sumQuery} 
    ) ORDER BY level;
    `,
    {
      ...params,
      ...queryParams,
    },
  ).then(formatResults(steps));
}

const formatResults = (steps: { type: string; value: string }[]) => (results: unknown) => {
  // Empty results (e.g. zero matching events for the first step) used to crash
  // on `results[0].count`; the dropoff/remaining ratios also produced NaN/Infinity
  // when previous or the first-step count was zero. Guard all three divisions.
  const firstCount = Number(results[0]?.count) || 0;

  return steps.map((step: { type: string; value: string }, i: number) => {
    const visitors = Number(results[i]?.count) || 0;
    const previous = Number(results[i - 1]?.count) || 0;
    const dropped = previous > 0 ? previous - visitors : 0;
    const dropoff = previous > 0 ? 1 - visitors / previous : 0;
    const remaining = firstCount > 0 ? visitors / firstCount : 0;
    // Revenue + median time are present on the PG path; the ClickHouse path omits
    // these columns, so they default to 0 / null (null-guarded).
    const revenue = Number(results[i]?.revenue) || 0;
    const revenuePerVisitor = visitors > 0 ? revenue / visitors : 0;
    const medianMs = results[i]?.median_ms != null ? Number(results[i]?.median_ms) : null;

    return {
      ...step,
      visitors,
      previous,
      dropped,
      dropoff,
      remaining,
      revenue,
      revenuePerVisitor,
      medianMs,
    };
  });
};
