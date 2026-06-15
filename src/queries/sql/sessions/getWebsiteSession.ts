import prisma from '@/lib/prisma';
import clickhouse from '@/lib/clickhouse';
import { runQuery, PRISMA, CLICKHOUSE } from '@/lib/db';

const FUNCTION_NAME = 'getWebsiteSession';

export async function getWebsiteSession(...args: [websiteId: string, sessionId: string]) {
  return runQuery({
    [PRISMA]: () => relationalQuery(...args),
    [CLICKHOUSE]: () => clickhouseQuery(...args),
  });
}

async function relationalQuery(websiteId: string, sessionId: string) {
  const { rawQuery, getTimestampDiffSQL } = prisma;

  return rawQuery(
    `
    select id,
      distinct_id as "distinctId",
      website_id as "websiteId",
      browser,
      os,
      device,
      screen,
      language,
      country,
      region,
      city,
      min(min_time) as "firstAt",
      max(max_time) as "lastAt",
      count(distinct visit_id) as visits,
      sum(views) as views,
      sum(events) as events,
      sum(${getTimestampDiffSQL('min_time', 'max_time')}) as "totaltime",
      (select max(ed.number_value) from event_data ed
        join website_event we on we.event_id = ed.website_event_id
        where we.session_id = {{sessionId::uuid}} and we.event_name = 'engagement' and ed.data_key = 'scroll') as "maxScroll",
      (select sum(ed.number_value) from event_data ed
        join website_event we on we.event_id = ed.website_event_id
        where we.session_id = {{sessionId::uuid}} and we.event_name = 'engagement' and ed.data_key = 'clicks') as "clicks",
      (select we.referrer_domain from website_event we
        where we.session_id = {{sessionId::uuid}}
          and we.referrer_domain is not null and we.referrer_domain <> ''
          and we.referrer_domain <> coalesce(we.hostname, '')
        order by we.created_at asc limit 1) as "referrerDomain",
      (select we.url_path from website_event we
        where we.session_id = {{sessionId::uuid}} and we.event_type = 1
        order by we.created_at asc limit 1) as "entryUrl",
      (select we.utm_source from website_event we
        where we.session_id = {{sessionId::uuid}} and we.utm_source is not null and we.utm_source <> ''
        order by we.created_at asc limit 1) as "utmSource",
      (select we.utm_medium from website_event we
        where we.session_id = {{sessionId::uuid}} and we.utm_medium is not null and we.utm_medium <> ''
        order by we.created_at asc limit 1) as "utmMedium",
      (select we.utm_campaign from website_event we
        where we.session_id = {{sessionId::uuid}} and we.utm_campaign is not null and we.utm_campaign <> ''
        order by we.created_at asc limit 1) as "utmCampaign"
    from (select
          session.session_id as id,
          session.distinct_id,
          website_event.visit_id,
          session.website_id,
          session.browser,
          session.os,
          session.device,
          session.screen,
          session.language,
          session.country,
          session.region,
          session.city,
          min(website_event.created_at) as min_time,
          max(website_event.created_at) as max_time,
          sum(case when website_event.event_type = 1 then 1 else 0 end) as views,
          sum(case when website_event.event_type = 2 then 1 else 0 end) as events
    from session
    join website_event on website_event.session_id = session.session_id
    where session.website_id = {{websiteId::uuid}}
      and session.session_id = {{sessionId::uuid}}
    group by session.session_id, session.distinct_id, visit_id, session.website_id, session.browser, session.os, session.device, session.screen, session.language, session.country, session.region, session.city) t
    group by id, distinct_id, website_id, browser, os, device, screen, language, country, region, city;
    `,
    { websiteId, sessionId },
    FUNCTION_NAME,
  ).then(result => result?.[0]);
}

async function clickhouseQuery(websiteId: string, sessionId: string) {
  const { rawQuery, getDateStringSQL } = clickhouse;

  return rawQuery(
    `
    select id,
      websiteId,
      distinctId,
      browser,
      os,
      device,
      screen,
      language,
      country,
      region,
      city,
      ${getDateStringSQL('min(min_time)')} as firstAt,
      ${getDateStringSQL('max(max_time)')} as lastAt,
      uniq(visit_id) visits,
      sum(views) as views,
      sum(events) as events,
      sum(max_time-min_time) as totaltime
    from (select
              session_id as id,
              distinct_id as distinctId,
              visit_id,
              website_id as websiteId,
              browser,
              os,
              device,
              screen,
              language,
              country,
              region,
              city,
              min(min_time) as min_time,
              max(max_time) as max_time,
              sum(views) as views,
              length(groupArrayArray(event_name)) as events
        from website_event_stats_hourly
        where website_id = {websiteId:UUID}
          and session_id = {sessionId:UUID}
        group by session_id, distinct_id, visit_id, website_id, browser, os, device, screen, language, country, region, city) t
    group by id, websiteId, distinctId, browser, os, device, screen, language, country, region, city;
    `,
    { websiteId, sessionId },
    FUNCTION_NAME,
  ).then(result => result?.[0]);
}
