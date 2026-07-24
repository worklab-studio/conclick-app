import type { CSSProperties } from 'react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import type { ContentEntry } from '@/content/schema';
import { allEntries, entriesByType, pathFor } from '@/content';
import { canonical } from '@/lib/seo';
import { itemListSchema } from '@/lib/jsonld';
import { readingTime } from '@/lib/readingTime';
import { heroWordFor, meshKeyFor } from '@/lib/mesh/word';
import { blogFacts } from '@/content/_facts/blogFacts';
import { MeshHero } from './MeshHero';
import { BlogBoard } from './BlogBoard';
import { JsonLd } from './JsonLd';
import { SectionEyebrow } from './SectionEyebrow';

// The magazine layout for /blog ONLY.
//
// *** WHY THIS IS NOT HubGrid ***
// HubGrid has seven callers (/blog, /guides, /compare, /alternatives, /glossary,
// /for, /tools). Threading a category rail, per-category counts and mesh art
// through it would either change the other six pages or bury six `path ===
// '/blog'` branches inside one component. /glossary and /compare genuinely want
// the tight uniform grid they have. So this is a sibling, not a fork: HubGrid is
// untouched, and only /blog points here.
//
// *** WHY THE CATEGORY FILTER IS CSS-ONLY ***
// Two obvious alternatives are both actively harmful here:
//   1. `?category=` as a searchParam opts the route into dynamic rendering, which
//      silently voids `export const revalidate = 86400` — the page stops being
//      prerendered and every crawl hits the origin.
//   2. Minting /blog/topic/[slug] creates six index pages holding 1-2 posts each
//      on a domain where roughly 1 page in 55 is currently indexed. Thin,
//      near-duplicate, internally-linked category stubs are the textbook
//      doorway-page pattern, and it suppresses the whole cluster, not just the
//      stubs.
// Radio + `:checked ~` sibling rules keep every card in the crawled HTML of one
// URL, so link equity flows from this page to all posts regardless of which tab
// a human clicks. Hidden cards are display:none, not removed — crawlers read the
// markup, and Google has treated CSS-hidden-but-present content as indexable
// (merely lower-weighted) for years.

const APP = process.env.NEXT_PUBLIC_APP_URL || 'https://app.conclick.io';

// Matches MeshHero's fallback chain exactly. @fontsource/instrument-serif is a
// pending handoff on (seo)/layout.tsx; until that import lands this degrades to
// Georgia italic, which is a deliberate, presentable fallback rather than a
// browser default.
const SERIF: CSSProperties = {
  fontFamily: "'Instrument Serif', Georgia, 'Times New Roman', serif",
  fontWeight: 400,
  fontStyle: 'italic',
};

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

// `category` is optional on ContentEntry and no entry sets it yet, so every
// category has to be derivable. Ordered — the FIRST rule that matches wins, so
// "metrics-early-saas-should-watch" lands in Metrics rather than Growth.
const CATEGORY_RULES: { label: string; match: string[] }[] = [
  { label: 'Attribution', match: ['attribution', 'revenue', 'utm', 'campaign'] },
  { label: 'Privacy', match: ['privacy', 'cookie', 'consent', 'gdpr', 'ccpa'] },
  { label: 'Funnels', match: ['funnel', 'conversion', 'checkout', 'drop-off'] },
  { label: 'Metrics', match: ['metric', 'vanity', 'bounce', 'kpi'] },
  { label: 'Growth', match: ['growth', 'churn', 'saas', 'founder'] },
];

const FALLBACK_CATEGORY = 'Analytics';

function categoryFor(e: ContentEntry): string {
  if (e.category?.trim()) return e.category.trim();
  // Slug + h1 only. Matching the metaDescription too would drag almost every
  // post into Attribution, since "revenue" appears in most of them.
  const hay = `${e.slug} ${e.h1}`.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.match.some(m => hay.includes(m))) return rule.label;
  }
  return FALLBACK_CATEGORY;
}

/**
 * A DOM-id-safe token. Categories can come from author-set `entry.category`
 * free text, and this value is interpolated into a generated stylesheet — so it
 * is stripped to [a-z0-9-] rather than trusted.
 */
function idSafe(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * "Jun 18, 2026".
 *
 * getUTC* deliberately: entry dates are bare day strings ("2026-06-18") which
 * Date parses as UTC midnight. Reading them with local getters renders the
 * PREVIOUS day for anyone west of UTC, which on a prerendered page means the
 * build machine's timezone decides the date shown to everyone.
 */
function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

// ---------------------------------------------------------------------------
// Topics
// ---------------------------------------------------------------------------

const ACRONYMS: Record<string, string> = {
  utm: 'UTM',
  gdpr: 'GDPR',
  ccpa: 'CCPA',
  ga4: 'GA4',
  seo: 'SEO',
  kpi: 'KPI',
  saas: 'SaaS',
  b2b: 'B2B',
  mrr: 'MRR',
};

function topicLabel(t: string): string {
  return t
    .split('-')
    .map(w => ACRONYMS[w] ?? w)
    .join(' ');
}

// ---------------------------------------------------------------------------

export interface BlogIndexProps {
  eyebrow: string;
  /** First headline line — set in Inter 600. */
  titleLead: string;
  /** Second headline line — set in Instrument Serif italic. */
  titleSerif: string;
  intro: string;
}

export function BlogIndex({ eyebrow, titleLead, titleSerif, intro }: BlogIndexProps) {
  // Deterministic order: newest first, then an explicit pin, then slug.
  //
  // The pin exists because the whole initial batch was generated in one run and
  // shares datePublished "2026-06-18". With a pure date sort the slug tiebreak
  // decides the hero slot, which handed it to cookie-banners over the flagship
  // revenue-attribution post. Backdating the others to fake a publishing
  // history was the wrong fix (sitemap lastmod and first-crawl date contradict
  // it); pinning is honest and self-documenting.
  //
  // As real dated posts arrive they outrank the pin naturally, since the date
  // comparison runs first. Remove FEATURED_SLUG once the batch has aged out.
  const FEATURED_SLUG = 'why-revenue-attribution-matters';

  const posts = [...entriesByType('blog')].sort(
    (a, b) =>
      (b.datePublished || '').localeCompare(a.datePublished || '') ||
      (b.dateModified || '').localeCompare(a.dateModified || '') ||
      Number(b.slug === FEATURED_SLUG) - Number(a.slug === FEATURED_SLUG) ||
      a.slug.localeCompare(b.slug),
  );

  const cards = posts.map(e => ({
    entry: e,
    href: `/${pathFor(e)}`,
    category: categoryFor(e),
    catId: idSafe(categoryFor(e)),
    minutes: readingTime(e),
    date: fmtDate(e.datePublished || e.dateModified),
    meshKey: meshKeyFor(e),
    word: heroWordFor(e),
  }));

  const [featured, ...rest] = cards;

  // Counts are over ALL posts (featured included) — a tab reading "Privacy 1"
  // that then shows nothing but a featured card is still honest.
  const counts = new Map<string, { label: string; id: string; total: number; rest: number }>();
  for (const c of cards) {
    const row = counts.get(c.catId) ?? { label: c.category, id: c.catId, total: 0, rest: 0 };
    row.total += 1;
    counts.set(c.catId, row);
  }
  for (const c of rest) {
    const row = counts.get(c.catId);
    if (row) row.rest += 1;
  }
  const categories = [...counts.values()].sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));

  const tabs = [{ label: 'All', id: 'all', total: cards.length }, ...categories.map(c => ({ label: c.label, id: c.id, total: c.total }))];

  // Pre-render each card's mesh hero on the server, then hand the finished nodes
  // to BlogBoard (a client component) as props. The hero stays a server render;
  // the client only decides which nodes are visible under the active filter/page.
  const toBoardCard = (c: (typeof cards)[number], priority = false) => ({
    href: c.href,
    category: c.category,
    catId: c.catId,
    minutes: c.minutes,
    date: c.date,
    h1: c.entry.h1,
    desc: c.entry.metaDescription,
    datePublished: c.entry.datePublished,
    hero: (
      <MeshHero
        slug={c.meshKey}
        word={c.word}
        priority={priority}
        className="w-full transition-opacity group-hover:opacity-95"
      />
    ),
  });

  const boardFeatured = featured ? toBoardCard(featured, true) : null;
  const boardRest = rest.map(c => toBoardCard(c));

  // TOPICS pills. Pool = any author-set topics, then every glossary slug. The
  // glossary tail is the point: a pill that resolves to a real /glossary/<slug>
  // turns rail decoration into internal linking from the cluster's strongest
  // page. Pills with no matching entry stay plain text — no dead links.
  const glossarySlugs = new Set(entriesByType('glossary').map(e => e.slug));
  const topics: string[] = [];
  const seenTopics = new Set<string>();
  for (const c of cards) {
    for (const t of c.entry.topics ?? []) {
      const k = idSafe(t);
      if (k && !seenTopics.has(k)) {
        seenTopics.add(k);
        topics.push(k);
      }
    }
  }
  for (const s of glossarySlugs) {
    if (!seenTopics.has(s)) {
      seenTopics.add(s);
      topics.push(s);
    }
  }
  const topicPills = topics.slice(0, 12);

  // Same no-dead-links check src/lib/related.ts uses: an internal href only
  // renders as an anchor if the registry actually contains that page.
  const livePaths = new Set(allEntries().map(e => `/${pathFor(e)}`));

  return (
    <>
      {/* Preserved from HubGrid: Google reads /blog as a curated CollectionPage
          rather than a thin index. Built from ALL posts, not the visible tab. */}
      <JsonLd
        data={[
          itemListSchema(
            `${titleLead} ${titleSerif}`.trim(),
            '/blog',
            cards.map(c => ({ url: canonical(c.href), name: c.entry.h1 })),
          ),
        ]}
      />

      <section className="relative overflow-hidden border-b border-white/[0.07]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[360px]"
          style={{ background: 'radial-gradient(50% 100% at 50% 0%, rgba(108,99,201,0.16), rgba(108,99,201,0) 70%)' }}
        />
        {/* Same container as the content grid below (max-w-6xl, px-6 sm:px-8) so
            the eyebrow/headline left edge lines up with the filter row and cards
            rather than sitting indented inside a narrower max-w-4xl. */}
        <div className="relative mx-auto max-w-6xl px-6 pb-14 pt-16 sm:px-8">
          <SectionEyebrow label={eyebrow} />
          <h1 className="mt-6 max-w-[24ch] text-[34px] font-semibold leading-[1.06] tracking-[-0.02em] text-white sm:text-[52px]">
            {titleLead}
            <br />
            <span className="text-[#c7c5ec]" style={SERIF}>
              {titleSerif}
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-zinc-400">{intro}</p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-12 sm:px-8 lg:grid lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-12">
        <BlogBoard featured={boardFeatured} rest={boardRest} tabs={tabs} />

        {/* ------------------------------- RIGHT RAIL ------------------------------- */}
        <aside className="mt-16 lg:mt-0">
          {/* Flows with the page: no sticky, no separate scroll container. The
              rail is just the second column and scrolls with everything else. */}
          <div>
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Fast facts</h2>
              <ol className="mt-4 space-y-5">
                {blogFacts.map((f, i) => {
                  const linked = f.href && livePaths.has(f.href);
                  return (
                    <li key={i} className="flex gap-3">
                      <span
                        aria-hidden
                        className="mt-0.5 shrink-0 text-[12px] tabular-nums text-[#8b88cf]"
                        style={SERIF}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold leading-snug text-white">{f.stat}</div>
                        <p className="mt-1 text-[12.5px] leading-relaxed text-zinc-400">{f.text}</p>
                        {linked && (
                          <a
                            href={f.href}
                            className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-medium text-[#8b88cf] transition-colors hover:text-[#c7c5ec]"
                          >
                            {f.linkLabel || 'Read more'}
                            <ArrowUpRight className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>

            {topicPills.length > 0 && (
              <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Topics</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {topicPills.map(t =>
                    glossarySlugs.has(t) ? (
                      <a
                        key={t}
                        href={`/glossary/${t}`}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[12px] text-zinc-300 transition-colors hover:border-[#6C63C9]/50 hover:text-white"
                      >
                        {topicLabel(t)}
                      </a>
                    ) : (
                      <span
                        key={t}
                        className="rounded-full border border-white/[0.07] bg-white/[0.02] px-2.5 py-1 text-[12px] text-zinc-500"
                      >
                        {topicLabel(t)}
                      </span>
                    ),
                  )}
                </div>
              </section>
            )}

            <section className="mt-6 rounded-2xl border border-[#6C63C9]/30 bg-[#6C63C9]/[0.08] p-5">
              <h2 className="text-[15px] font-semibold leading-snug tracking-[-0.01em] text-white">
                See which traffic actually{' '}
                <span className="text-[#c7c5ec]" style={SERIF}>
                  pays.
                </span>
              </h2>
              <p className="mt-2 text-[12.5px] leading-relaxed text-zinc-300">
                Conclick ties every Stripe, Paddle, Polar, Lemon Squeezy and Dodo payment back to the source, campaign
                and funnel that earned it — with heatmaps and auto-detected funnels in the same dashboard.
              </p>
              <a
                href={`${APP}/register`}
                className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-[#6C63C9] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#7b73d6]"
              >
                Add My Website <ArrowRight className="h-4 w-4" />
              </a>
              <p className="mt-2.5 text-[11.5px] text-zinc-400">14-day free trial. No card required.</p>
            </section>
          </div>
        </aside>
      </div>
    </>
  );
}

export default BlogIndex;
