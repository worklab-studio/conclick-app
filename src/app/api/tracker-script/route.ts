import { promises as fs } from 'fs';
import path from 'path';
import { classifyCrawler, recordCrawlerHit, websiteIdForReferer } from '@/lib/crawlers';

/**
 * Serves the tracker (rewritten from /script.js in next.config) EXACTLY as the
 * static file did — same bytes, same cache headers — while logging crawler
 * fetches. This is the only signal for crawlers that never execute JS (GPTBot,
 * ClaudeBot, Amazonbot, CCBot…): they fetch page subresources while crawling,
 * so the script request itself is the beacon. Attribution comes from the
 * Referer header (the customer page being crawled) → website domain match.
 * Human browsers hit this constantly — nothing is recorded for them.
 */

export const dynamic = 'force-dynamic';

let cached: { body: Buffer; mtime: number } | null = null;

async function loadScript(): Promise<Buffer | null> {
  try {
    const file = path.join(process.cwd(), 'public', 'script.js');
    const stat = await fs.stat(file);
    if (!cached || cached.mtime !== stat.mtimeMs) {
      cached = { body: await fs.readFile(file), mtime: stat.mtimeMs };
    }
    return cached.body;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const body = await loadScript();
  if (!body) {
    return new Response('// tracker unavailable', { status: 404 });
  }

  const userAgent = request.headers.get('user-agent');
  const crawler = classifyCrawler(userAgent);
  if (crawler) {
    // Fire-and-forget; never delay the response for logging.
    void websiteIdForReferer(request.headers.get('referer'))
      .then(websiteId => recordCrawlerHit(websiteId, crawler, 'script'))
      .catch(() => undefined);
  }

  return new Response(new Uint8Array(body), {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
