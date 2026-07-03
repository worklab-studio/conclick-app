import { z } from 'zod';
import { isbot } from 'isbot';
import { startOfHour, startOfMonth } from 'date-fns';
import clickhouse from '@/lib/clickhouse';
import { parseRequest } from '@/lib/request';
import { badRequest, json, forbidden, serverError } from '@/lib/response';
import { fetchWebsite } from '@/lib/load';
import { getClientInfo, hasBlockedIp, isDatacenterIp } from '@/lib/detect';
import { recordBotBlock } from '@/lib/botBlocks';
import { createToken, parseToken } from '@/lib/jwt';
import { secret, uuid, hash } from '@/lib/crypto';
import { COLLECTION_TYPE, EVENT_TYPE } from '@/lib/constants';
import { anyObjectParam, urlOrPathParam } from '@/lib/schema';
import { safeDecodeURI, safeDecodeURIComponent } from '@/lib/url';
import { createSession, saveEvent, saveSessionData } from '@/queries/sql';
import { serializeError } from 'serialize-error';

interface Cache {
  websiteId: string;
  sessionId: string;
  visitId: string;
  iat: number;
}

const schema = z.object({
  type: z.enum(['event', 'identify']),
  payload: z
    .object({
      website: z.uuid().optional(),
      link: z.uuid().optional(),
      pixel: z.uuid().optional(),
      data: anyObjectParam.optional(),
      hostname: z.string().max(100).optional(),
      language: z.string().max(35).optional(),
      referrer: urlOrPathParam.optional(),
      screen: z.string().max(11).optional(),
      title: z.string().optional(),
      url: urlOrPathParam.optional(),
      name: z.string().max(50).optional(),
      tag: z.string().max(50).optional(),
      ip: z.string().optional(),
      userAgent: z.string().optional(),
      timestamp: z.coerce.number().int().optional(),
      id: z.string().optional(),
    })
    .refine(
      data => {
        const keys = [data.website, data.link, data.pixel];
        const count = keys.filter(Boolean).length;
        return count === 1;
      },
      {
        message: 'Exactly one of website, link, or pixel must be provided',
        path: ['website'],
      },
    ),
});

export async function POST(request: Request) {
  try {
    const { body, error } = await parseRequest(request, schema, { skipAuth: true });

    if (error) {
      return error();
    }

    const { type, payload } = body;

    const {
      website: websiteId,
      pixel: pixelId,
      link: linkId,
      hostname,
      screen,
      language,
      url,
      referrer,
      name,
      data,
      title,
      tag,
      timestamp,
      id,
    } = payload;

    const sourceId = websiteId || pixelId || linkId;

    // Cache check
    let cache: Cache | null = null;
    let website: any = null;

    if (websiteId) {
      const cacheHeader = request.headers.get('x-umami-cache');

      if (cacheHeader) {
        const result = await parseToken(cacheHeader, secret());

        if (result) {
          cache = result;
        }

        // A replayed token for a DIFFERENT website must not vouch for this
        // payload's websiteId — drop it so the website lookup below still runs
        // (and 400s on unknown ids before any bot accounting).
        if (cache?.websiteId && cache.websiteId !== websiteId) {
          cache = null;
        }
      }

      // Find website (only on the first, uncached send — no extra hot-path query)
      if (!cache?.websiteId) {
        website = await fetchWebsite(websiteId);

        if (!website) {
          return badRequest({ message: 'Website not found.' });
        }
      }
    }

    // Client info
    const { ip, userAgent, device, browser, os, country, region, city, latitude, longitude } =
      await getClientInfo(request, payload);

    // Bot check — isbot catches self-identifying bots; the extra patterns + the
    // empty-UA guard catch headless/automation tools and raw HTTP clients that
    // spoof or omit a User-Agent (the client-side tracker also drops automation).
    const EXTRA_BOT =
      /headless|phantomjs|playwright|puppeteer|selenium|python-requests|aiohttp|node-fetch|go-http-client|okhttp|libwww|scrapy|java\/|\bwget\b/i;
    if (
      !process.env.DISABLE_BOT_CHECK &&
      (!userAgent || isbot(userAgent) || EXTRA_BOT.test(userAgent))
    ) {
      recordBotBlock(websiteId);
      return json({ beep: 'boop' });
    }

    // Datacenter / hosting IP — catches stealth bots that send a clean browser UA
    // from a cloud IP (the kind the UA check above can't see). Real visitors are
    // on residential/mobile networks.
    if (await isDatacenterIp(ip)) {
      recordBotBlock(websiteId);
      return json({ beep: 'boop' });
    }

    // IP block
    if (hasBlockedIp(ip)) {
      return forbidden();
    }

    const createdAt = timestamp ? new Date(timestamp * 1000) : new Date();
    const now = Math.floor(new Date().getTime() / 1000);

    const sessionSalt = hash(startOfMonth(createdAt).toUTCString());
    const visitSalt = hash(startOfHour(createdAt).toUTCString());

    const sessionId = id ? uuid(sourceId, id) : uuid(sourceId, ip, userAgent, sessionSalt);

    // Create a session if not found
    if (!clickhouse.enabled && !cache?.sessionId) {
      await createSession({
        id: sessionId,
        websiteId: sourceId,
        browser,
        os,
        device,
        screen,
        language,
        country,
        region,
        city,
        latitude,
        longitude,
        distinctId: id,
        createdAt,
      });
    }

    // Visit info
    let visitId = cache?.visitId || uuid(sessionId, visitSalt);
    let iat = cache?.iat || now;

    // Expire visit after 30 minutes
    if (!timestamp && now - iat > 1800) {
      visitId = uuid(sessionId, visitSalt);
      iat = now;
    }

    if (type === COLLECTION_TYPE.event) {
      const base = hostname ? `https://${hostname}` : 'https://localhost';
      const currentUrl = new URL(url, base);

      let urlPath =
        currentUrl.pathname === '/undefined' ? '' : currentUrl.pathname + currentUrl.hash;
      const urlQuery = currentUrl.search.substring(1);
      const urlDomain = currentUrl.hostname.replace(/^www./, '');

      let referrerPath: string;
      let referrerQuery: string;
      let referrerDomain: string;

      // UTM Params
      const utmSource = currentUrl.searchParams.get('utm_source');
      const utmMedium = currentUrl.searchParams.get('utm_medium');
      const utmCampaign = currentUrl.searchParams.get('utm_campaign');
      const utmContent = currentUrl.searchParams.get('utm_content');
      const utmTerm = currentUrl.searchParams.get('utm_term');

      // Click IDs
      const gclid = currentUrl.searchParams.get('gclid');
      const fbclid = currentUrl.searchParams.get('fbclid');
      const msclkid = currentUrl.searchParams.get('msclkid');
      const ttclid = currentUrl.searchParams.get('ttclid');
      const lifatid = currentUrl.searchParams.get('li_fat_id');
      const twclid = currentUrl.searchParams.get('twclid');

      if (process.env.REMOVE_TRAILING_SLASH) {
        urlPath = urlPath.replace(/\/(?=(#.*)?$)/, '');
      }

      if (referrer) {
        const referrerUrl = new URL(referrer, base);

        referrerPath = referrerUrl.pathname;
        referrerQuery = referrerUrl.search.substring(1);
        referrerDomain = referrerUrl.hostname.replace(/^www\./, '');
      }

      const eventType = linkId
        ? EVENT_TYPE.linkEvent
        : pixelId
          ? EVENT_TYPE.pixelEvent
          : name
            ? EVENT_TYPE.customEvent
            : EVENT_TYPE.pageView;

      await saveEvent({
        websiteId: sourceId,
        sessionId,
        visitId,
        eventType,
        createdAt,

        // Page
        pageTitle: safeDecodeURIComponent(title),
        hostname: hostname || urlDomain,
        urlPath: safeDecodeURI(urlPath),
        urlQuery,
        referrerPath: safeDecodeURI(referrerPath),
        referrerQuery,
        referrerDomain,

        // Session
        distinctId: id,
        browser,
        os,
        device,
        screen,
        language,
        country,
        region,
        city,

        // Events
        eventName: name,
        eventData: data,
        tag,

        // UTM
        utmSource,
        utmMedium,
        utmCampaign,
        utmContent,
        utmTerm,

        // Click IDs
        gclid,
        fbclid,
        msclkid,
        ttclid,
        lifatid,
        twclid,
      });
    } else if (type === COLLECTION_TYPE.identify) {
      if (data) {
        await saveSessionData({
          websiteId,
          sessionId,
          sessionData: data,
          distinctId: id,
          createdAt,
        });
      }
    }

    const token = createToken({ websiteId, sessionId, visitId, iat }, secret());

    return json({
      cache: token,
      sessionId,
      visitId,
      // Only present on the first (uncached) send; the tracker reads it once to
      // decide whether to start autocapture. Opt-in, off by default.
      ...(website ? { autocapture: !!website.autocaptureEnabled } : {}),
    });
  } catch (e) {
    const error = serializeError(e);

    // eslint-disable-next-line no-console
    console.log(error);

    return serverError({ errorObject: error });
  }
}
