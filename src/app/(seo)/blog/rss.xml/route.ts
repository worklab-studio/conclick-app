import type { ContentEntry } from '@/content/schema';
import { entriesByType, pathFor } from '@/content';
import { siteUrl } from '@/lib/seo';

export const revalidate = 86400;

// rss.xml — the editorial feed for /blog and /guides. Feed readers, Google's
// "Follow" surface, and several AI/answer-engine crawlers use RSS as a cheap
// change-detection channel, so this is the fastest freshness ping we get for
// free. Generated from the content registry so it always reflects the live page
// set. Served at conclick.io/blog/rss.xml via the Cloudflare Worker route.

// CDATA is a raw span: the ONLY thing that can terminate it early is a literal
// `]]>` inside the payload. Split that sequence across two CDATA sections so the
// feed stays well-formed no matter what a copywriter types.
const cdata = (s: string) => `<![CDATA[${String(s ?? '').replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;

// RSS 2.0 requires RFC-822 dates. Entry dates are ISO day strings ("2026-06-18"),
// which Date parses as UTC midnight — toUTCString() is already RFC-822 shaped.
const rfc822 = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? new Date(0).toUTCString() : d.toUTCString();
};

export async function GET() {
  const base = siteUrl();
  const self = `${base}/blog/rss.xml`;

  const items = [...entriesByType('blog'), ...entriesByType('guide')].sort((a, b) =>
    (b.datePublished || b.dateModified).localeCompare(a.datePublished || a.dateModified),
  );

  const item = (e: ContentEntry) => {
    const url = `${base}/${pathFor(e)}`;
    return `    <item>
      <title>${cdata(e.h1)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${cdata(e.metaDescription)}</description>
      <content:encoded>${cdata(`<p>${e.tldr}</p><p>${e.intro}</p>`)}</content:encoded>
      <category>${cdata(e.type === 'guide' ? 'Guides' : 'Blog')}</category>
      <pubDate>${rfc822(e.datePublished || e.dateModified)}</pubDate>
    </item>`;
  };

  const lastBuild = items.length ? rfc822(items[0].dateModified || items[0].datePublished) : new Date().toUTCString();

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${cdata('Conclick — Blog & Guides')}</title>
    <link>${base}/blog</link>
    <atom:link href="${self}" rel="self" type="application/rss+xml" />
    <description>${cdata(
      'Privacy-first analytics, heatmaps, funnels, and revenue attribution — written for bootstrapped founders and small SaaS teams.',
    )}</description>
    <language>en</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <ttl>1440</ttl>
${items.map(item).join('\n')}
  </channel>
</rss>
`;

  return new Response(body, {
    headers: {
      'content-type': 'application/rss+xml; charset=utf-8',
      'cache-control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
