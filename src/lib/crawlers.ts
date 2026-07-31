import prisma from '@/lib/prisma';

/**
 * Crawler classification: instead of only dropping bot traffic, identify WHO
 * is crawling and WHY, and persist it as its own analytics dimension (never
 * mixed into human metrics).
 *
 * Categories follow the emerging industry taxonomy:
 * - answers:  live fetches made to answer a user's question right now
 *             (ChatGPT browsing, Perplexity answering, …) — closest to a
 *             human visit, often monetizable attention.
 * - indexing: search/AI-search index builders (Googlebot, Bingbot,
 *             OAI-SearchBot…) — SEO/AEO reach.
 * - training: model-training corpus crawlers (GPTBot, ClaudeBot, Amazonbot…).
 * - preview:  link-preview unfurlers (Slack, X, WhatsApp…).
 * - seo:      third-party SEO tools (Ahrefs, Semrush…).
 * - other:    everything else that self-identifies as automated.
 *
 * Sources: 'send' = the bot executed our tracker JS (rendering crawlers like
 * Googlebot); 'script' = the bot fetched /script.js while crawling the page
 * (catches non-JS-executing crawlers — the majority of training bots).
 */

export type CrawlerCategory = 'answers' | 'indexing' | 'training' | 'preview' | 'seo' | 'other';

export interface CrawlerId {
  name: string;
  company: string;
  category: CrawlerCategory;
}

// Order matters: more specific tokens first (Applebot-Extended before Applebot,
// ChatGPT-User before GPTBot never collides but keep the habit).
const RULES: Array<[RegExp, CrawlerId]> = [
  // — AI answers (user-triggered, real-time) —
  [/chatgpt-user/i, { name: 'ChatGPT', company: 'OpenAI', category: 'answers' }],
  [/claude-user|claude-web/i, { name: 'Claude', company: 'Anthropic', category: 'answers' }],
  [/perplexity-user/i, { name: 'Perplexity', company: 'Perplexity', category: 'answers' }],
  [/duckassistbot/i, { name: 'DuckAssist', company: 'DuckDuckGo', category: 'answers' }],
  [/meta-externalfetcher/i, { name: 'Meta AI', company: 'Meta', category: 'answers' }],
  [/mistralai-user/i, { name: 'Le Chat', company: 'Mistral', category: 'answers' }],
  [
    /gemini-deep-research|google-notebooklm/i,
    { name: 'Gemini', company: 'Google', category: 'answers' },
  ],

  // — AI/search indexing —
  [/oai-searchbot/i, { name: 'OpenAI Search', company: 'OpenAI', category: 'indexing' }],
  [/perplexitybot/i, { name: 'PerplexityBot', company: 'Perplexity', category: 'indexing' }],
  [
    /googlebot|google-inspectiontool|storebot-google/i,
    { name: 'Googlebot', company: 'Google', category: 'indexing' },
  ],
  [/bingbot|adidxbot/i, { name: 'Bingbot', company: 'Microsoft', category: 'indexing' }],
  [/duckduckbot|duckduckgo/i, { name: 'DuckDuckBot', company: 'DuckDuckGo', category: 'indexing' }],
  [/applebot-extended/i, { name: 'Applebot-Extended', company: 'Apple', category: 'training' }],
  [/applebot/i, { name: 'Applebot', company: 'Apple', category: 'indexing' }],
  [/yandex(bot|images|metrika)/i, { name: 'YandexBot', company: 'Yandex', category: 'indexing' }],
  [/baiduspider/i, { name: 'Baiduspider', company: 'Baidu', category: 'indexing' }],

  // — model training —
  [/gptbot/i, { name: 'GPTBot', company: 'OpenAI', category: 'training' }],
  [/claudebot|anthropic-ai/i, { name: 'ClaudeBot', company: 'Anthropic', category: 'training' }],
  [/ccbot/i, { name: 'CCBot', company: 'Common Crawl', category: 'training' }],
  [/amazonbot/i, { name: 'Amazonbot', company: 'Amazon', category: 'training' }],
  [
    /meta-externalagent|facebookbot/i,
    { name: 'Meta-External', company: 'Meta', category: 'training' },
  ],
  [/bytespider/i, { name: 'Bytespider', company: 'ByteDance', category: 'training' }],
  [
    /googleother|google-extended|google-cloudvertexbot/i,
    { name: 'GoogleOther', company: 'Google', category: 'training' },
  ],
  [/petalbot/i, { name: 'PetalBot', company: 'Huawei', category: 'training' }],
  [/cohere-ai|cohere-training/i, { name: 'Cohere', company: 'Cohere', category: 'training' }],
  [/diffbot/i, { name: 'Diffbot', company: 'Diffbot', category: 'training' }],
  [/timpibot/i, { name: 'Timpibot', company: 'Timpi', category: 'training' }],
  [/omgili|webzio/i, { name: 'Webz.io', company: 'Webz.io', category: 'training' }],

  // — link previews —
  [/facebookexternalhit/i, { name: 'Facebook preview', company: 'Meta', category: 'preview' }],
  [/twitterbot/i, { name: 'X preview', company: 'X', category: 'preview' }],
  [/linkedinbot/i, { name: 'LinkedIn preview', company: 'LinkedIn', category: 'preview' }],
  [/slackbot|slack-imgproxy/i, { name: 'Slack preview', company: 'Slack', category: 'preview' }],
  [/discordbot/i, { name: 'Discord preview', company: 'Discord', category: 'preview' }],
  [/telegrambot/i, { name: 'Telegram preview', company: 'Telegram', category: 'preview' }],
  [/whatsapp/i, { name: 'WhatsApp preview', company: 'Meta', category: 'preview' }],

  // — SEO tools —
  [/ahrefsbot|ahrefssiteaudit/i, { name: 'AhrefsBot', company: 'Ahrefs', category: 'seo' }],
  [/semrushbot/i, { name: 'SemrushBot', company: 'Semrush', category: 'seo' }],
  [/dataforseobot/i, { name: 'DataForSEO', company: 'DataForSEO', category: 'seo' }],
  [/mj12bot/i, { name: 'MJ12bot', company: 'Majestic', category: 'seo' }],
  [/dotbot/i, { name: 'DotBot', company: 'Moz', category: 'seo' }],
  [/screaming frog/i, { name: 'Screaming Frog', company: 'Screaming Frog', category: 'seo' }],
];

/** Classify a user agent. Returns null when the UA is not a KNOWN crawler —
 *  callers decide what to do with generically-bot-flagged traffic. */
export function classifyCrawler(userAgent: string | null | undefined): CrawlerId | null {
  if (!userAgent) return null;
  for (const [re, id] of RULES) {
    if (re.test(userAgent)) return id;
  }
  return null;
}

/** Generic fallback identity for traffic that tripped bot detection but
 *  matches no known crawler (headless tools, HTTP libraries, blank UAs). */
export function genericBotId(userAgent: string | null | undefined): CrawlerId {
  const token = (userAgent || '').match(/^([a-z0-9_.-]{2,40})/i)?.[1];
  return { name: token || 'Unknown bot', company: 'Unknown', category: 'other' };
}

/* ------------------------- persistence (batched) ------------------------- */

interface PendingHit {
  websiteId: string | null;
  name: string;
  company: string;
  category: string;
  source: 'send' | 'script';
  createdAt: Date;
}

const KEY = '__conclick_crawler_hits__';
const state: { pending: PendingHit[]; timer: ReturnType<typeof setInterval> | null } = (
  globalThis as any
)[KEY] || { pending: [], timer: null };
(globalThis as any)[KEY] = state;

const FLUSH_MS = 15_000;
const MAX_PENDING = 500; // hard cap; drop-oldest under attack rather than grow

async function flush() {
  if (!state.pending.length) return;
  const batch = state.pending.splice(0, state.pending.length);
  try {
    await prisma.client.crawlerHit.createMany({
      data: batch.map(h => ({
        websiteId: h.websiteId,
        botName: h.name.slice(0, 100),
        company: h.company.slice(0, 50),
        category: h.category.slice(0, 20),
        source: h.source,
        createdAt: h.createdAt,
      })),
    });
  } catch {
    // Never let analytics-of-analytics break ingest; drop the batch.
  }
}

/** Queue a crawler hit; flushed to Postgres every 15s (fire-and-forget). */
export function recordCrawlerHit(
  websiteId: string | null,
  id: CrawlerId,
  source: 'send' | 'script',
) {
  if (state.pending.length >= MAX_PENDING) state.pending.shift();
  state.pending.push({
    websiteId,
    name: id.name,
    company: id.company,
    category: id.category,
    source,
    createdAt: new Date(),
  });
  if (!state.timer) {
    state.timer = setInterval(() => void flush(), FLUSH_MS);
    // Don't hold the process open for the flusher in scripts/tests.
    (state.timer as any)?.unref?.();
  }
}

/* -------------------- website attribution by Referer --------------------- */

const domainCache: { map: Map<string, string | null>; at: number } = (globalThis as any)[
  KEY + 'dom'
] || { map: new Map(), at: 0 };
(globalThis as any)[KEY + 'dom'] = domainCache;

/** Resolve a page URL (the crawler's Referer) to a website id via the domain
 *  column. Cached 5 minutes; null when no site matches. */
export async function websiteIdForReferer(referer: string | null): Promise<string | null> {
  if (!referer) return null;
  let host: string;
  try {
    host = new URL(referer).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
  if (!host) return null;
  if (Date.now() - domainCache.at > 300_000) {
    domainCache.map.clear();
    domainCache.at = Date.now();
  }
  if (domainCache.map.has(host)) return domainCache.map.get(host) ?? null;
  try {
    const site = await prisma.client.website.findFirst({
      where: {
        deletedAt: null,
        OR: [{ domain: host }, { domain: `www.${host}` }],
      },
      select: { id: true },
    });
    domainCache.map.set(host, site?.id ?? null);
    return site?.id ?? null;
  } catch {
    return null;
  }
}
