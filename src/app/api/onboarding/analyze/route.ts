import { NextRequest, NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import { analyzeSite } from '@/lib/site-analyzer';
import { detectTech, type DetectedTech } from '@/lib/tech-detect';

/**
 * The onboarding analysis: everything Conclick can tell a new user about their
 * own site before they install anything.
 *
 * Composed from three independent sources, each of which can fail on its own
 * without taking the screen down:
 *   1. analyzeSite  goals and funnels from their real CTAs and pages
 *   2. detectTech   platform and stack, from one HTML fetch
 * Backlink data is fetched separately by the client (see /onboarding/seo).
 *
 * The response always carries an explicit `state` so the client renders a
 * designed screen rather than guessing from empty arrays:
 *   rich        the analyzer found real CTAs or pages
 *   thin        site reachable but little structure (typical of Framer/SPAs)
 *   unreachable could not read the site (firewall, bot protection, offline)
 *   invalid     not a usable public domain
 */

export type AnalyzeState = 'rich' | 'thin' | 'unreachable' | 'invalid';

const DOMAIN_RE = /^([a-z0-9-]+\.)+[a-z]{2,}$/;

function normalizeDomain(raw: string): string {
  return (raw || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .split('?')[0]
    .split('#')[0];
}

export interface SiteBrand {
  title: string | null;
  description: string | null;
  /** og:image, absolute. Loaded by the browser, so it costs us nothing and is
   *  instant, unlike a server-side screenshot capture. */
  image: string | null;
}

function absolute(url: string, domain: string): string | null {
  try {
    return new URL(url, `https://${domain}/`).toString();
  } catch {
    return null;
  }
}

/** Pull the site's own branding out of HTML we already have in hand. */
function extractBrand(html: string, domain: string): SiteBrand {
  const meta = (prop: string) => {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`,
      'i',
    );
    const alt = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`,
      'i',
    );
    return html.match(re)?.[1] || html.match(alt)?.[1] || null;
  };

  const rawImage = meta('og:image') || meta('twitter:image');
  const title =
    meta('og:site_name') || meta('og:title') || html.match(/<title[^>]*>([^<]+)</i)?.[1];
  const description = meta('og:description') || meta('description');

  const clean = (s?: string | null) =>
    s ? s.replace(/\s+/g, ' ').trim().slice(0, 160) || null : null;

  return {
    title: clean(title),
    description: clean(description),
    image: rawImage ? absolute(rawImage, domain) : null,
  };
}

/** One fetch used for tech detection and branding; kept separate from the
 *  analyzer so a failure here never costs us the goals and funnels. */
async function fetchForTech(
  domain: string,
): Promise<{ tech: DetectedTech | null; brand: SiteBrand | null; reachable: boolean }> {
  try {
    const res = await fetch(`https://${domain}/`, {
      signal: AbortSignal.timeout(7000),
      redirect: 'follow',
      headers: { 'user-agent': 'ConclickBot/1.0 (+https://conclick.io)' },
    });
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => (headers[k.toLowerCase()] = v));
    const html = (await res.text()).slice(0, 1_000_000);
    return {
      tech: detectTech(html, headers),
      brand: extractBrand(html, domain),
      reachable: res.ok,
    };
  } catch {
    return { tech: null, brand: null, reachable: false };
  }
}

export async function POST(request: NextRequest) {
  const auth = await checkAuth(request);
  if (!auth?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const domain = normalizeDomain(body?.domain || '');

  if (!domain || !DOMAIN_RE.test(domain) || domain.length > 253) {
    return NextResponse.json({ state: 'invalid' as AnalyzeState, domain }, { status: 200 });
  }

  // Block private and loopback targets: this endpoint fetches a user-supplied
  // URL from our server, so it must never be pointed inward.
  if (/^(localhost|\d+\.\d+\.\d+\.\d+|.*\.local|.*\.internal)$/.test(domain)) {
    return NextResponse.json({ state: 'invalid' as AnalyzeState, domain }, { status: 200 });
  }

  // Both run together; neither can block the other. SEO enrichment is
  // deliberately NOT here: it is fetched separately by the client so a slow
  // third party can never delay or silently drop the main result.
  const [suggestions, techResult] = await Promise.all([
    analyzeSite(domain).catch(() => null),
    fetchForTech(domain),
  ]);

  const goals = suggestions?.goals || [];
  const funnels = suggestions?.funnels || [];
  const reachable = techResult.reachable || !!suggestions?.goals?.length;

  const state: AnalyzeState = !reachable
    ? 'unreachable'
    : goals.length >= 2 || funnels.length >= 1
      ? 'rich'
      : 'thin';

  return NextResponse.json({
    state,
    domain,
    goals: goals.slice(0, 6),
    funnels: funnels.slice(0, 2),
    tech: techResult.tech,
    brand: techResult.brand,
  });
}
