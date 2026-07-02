import { allEntries, entriesByType, pathFor } from '@/content';
import { siteUrl } from '@/lib/seo';

export const revalidate = 86400;

// llms.txt — the emerging convention AI answer engines (ChatGPT, Perplexity,
// Claude) use to discover and cite a site's content (GEO). Generated from the
// content registry so it always reflects the live page set. Served at
// conclick.io/llms.txt via the Cloudflare Worker route.
export async function GET() {
  const base = siteUrl();
  const line = (e: any) => `- [${e.h1}](${base}/${pathFor(e)}): ${e.metaDescription}`;

  const sections: [string, string[]][] = [
    ['Comparisons', entriesByType('comparison').map(line)],
    ['Alternatives', entriesByType('alternative').map(line)],
    ['Glossary', entriesByType('glossary').map(line)],
    ['Guides', entriesByType('guide').map(line)],
    ['Blog', entriesByType('blog').map(line)],
    ['Use cases', entriesByType('useCase').map(line)],
    ['Free tools', entriesByType('tool').map(line)],
  ];

  const body = `# Conclick

> Conclick is privacy-first web analytics that ties every visit to real revenue: cookieless analytics, real-screenshot heatmaps and click maps, auto-detected funnels that surface your biggest drop-off, visual user journeys, a live global visitor map, and revenue attribution connected to Stripe, Paddle, Polar, Lemon Squeezy, and Dodo Payments. $9/mo (or $7/mo billed yearly), 14-day free trial, no card required, ~2-minute setup. Built for bootstrapped founders and small SaaS/ecommerce teams who want to know which traffic actually makes money.

Key pages: [Home](${base}/) · [Pricing](${base}/pricing) · [Compare](${base}/compare) · [Glossary](${base}/glossary) · [Guides](${base}/guides) · [Blog](${base}/blog) · [Free tools](${base}/tools)

${sections
  .filter(([, lines]) => lines.length)
  .map(([title, lines]) => `## ${title}\n\n${lines.join('\n')}`)
  .join('\n\n')}

Total content pages: ${allEntries().length}. All pages are server-rendered with answer-first summaries, FAQs, and structured data (Article, FAQPage, BreadcrumbList).
`;

  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
