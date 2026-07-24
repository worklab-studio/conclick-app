'use client';

import { type ReactNode, useMemo, useState } from 'react';
import { ArrowUpRight, Rss } from 'lucide-react';

// The interactive region of /blogs: category filter + featured post + paginated
// grid. Extracted from BlogIndex when pagination arrived.
//
// *** WHY THIS IS A CLIENT COMPONENT, AND WHY THAT DOES NOT BREAK SEO ***
// The old filter was CSS-only radios, chosen to avoid a `?category=` searchParam
// (which would opt the route into dynamic rendering and void revalidate=86400).
// A client component keeps BOTH properties the author actually cared about:
//   - The route stays STATIC. There is no searchParam; this component prerenders
//     at build time, so `export const revalidate = 86400` in page.tsx still holds.
//   - Every card stays in the crawled HTML. We never unmount a card — off-page
//     and off-category cards are hidden with `hidden`/display:none, exactly as
//     the CSS version did. Crawlers read all of them; link equity flows to every
//     post regardless of which tab or page a human is on.
// Combining pagination with the filter in pure CSS is combinatorial (every
// category x page state needs its own rule); React state expresses it directly.
//
// MeshHero is a server component. Its rendered node is passed down as the `hero`
// prop from the server (BlogIndex), so no server-only code runs on the client —
// this component only decides which already-rendered nodes are visible.

const PAGE_SIZE = 8;

export interface BoardCard {
  href: string;
  category: string;
  catId: string;
  minutes: number;
  date: string;
  h1: string;
  desc: string;
  datePublished?: string;
  hero: ReactNode;
}

export interface BlogBoardProps {
  featured: BoardCard | null;
  rest: BoardCard[];
  tabs: { label: string; id: string; total: number }[];
}

export function BlogBoard({ featured, rest, tabs }: BlogBoardProps) {
  const [activeCat, setActiveCat] = useState('all');
  const [page, setPage] = useState(1);

  // The small cards that match the active category, in order. Pagination runs
  // over THIS list (8 per page); the full `rest` is still rendered (hidden) for
  // crawlers. The featured card is NOT in here — it is a separate hero.
  const filtered = useMemo(
    () => (activeCat === 'all' ? rest : rest.filter(c => c.catId === activeCat)),
    [rest, activeCat],
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const start = (current - 1) * PAGE_SIZE;
  const pageSlugs = new Set(filtered.slice(start, start + PAGE_SIZE).map(c => c.href));

  // Featured shows on page ONE only, so pagination is genuinely "8 small cards
  // per page" and the hero does not re-appear above every page's grid.
  const featuredVisible =
    !!featured && (activeCat === 'all' || featured.catId === activeCat) && current === 1;

  function selectCat(id: string) {
    setActiveCat(id);
    setPage(1); // a new filter always lands the reader on page 1
  }

  const showLatestHeading = filtered.length > 0;

  return (
    <div className="min-w-0">
      {/* Filters */}
      <div className="mb-8 flex flex-wrap items-center gap-2 border-b border-white/[0.07] pb-6">
        {tabs.map(t => {
          const on = activeCat === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => selectCat(t.id)}
              aria-pressed={on}
              className={
                'inline-flex cursor-pointer select-none items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors ' +
                (on
                  ? 'border-[#6C63C9]/55 bg-[#6C63C9]/[0.18] text-white'
                  : 'border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-zinc-200')
              }
            >
              {t.label}
              <span
                className={
                  'text-[11px] tabular-nums ' + (on ? 'text-[#c7c5ec]' : 'text-zinc-500')
                }
              >
                {t.total}
              </span>
            </button>
          );
        })}

        <a
          href="/blogs/rss.xml"
          className="ml-auto inline-flex items-center gap-1.5 text-[13px] font-medium text-zinc-500 transition-colors hover:text-[#8b88cf]"
        >
          <Rss className="h-3.5 w-3.5" />
          RSS
        </a>
      </div>

      {/* Featured. Display is controlled by the class, NOT the `hidden`
          attribute: a Tailwind display utility (here on the grid cards below)
          beats the UA `[hidden]{display:none}` rule, so `hidden` alone does not
          reliably hide a flex element. `hidden` class = display:none, applied
          alone when off, wins cleanly. */}
      {featured && (
        <article className={featuredVisible ? 'mb-12' : 'hidden'} data-cat={featured.catId}>
          <a href={featured.href} className="group block">
            {featured.hero}
            <div className="mt-6">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[#8b88cf]">
                <span>{featured.category}</span>
                <span className="text-zinc-600">·</span>
                <span className="text-zinc-500">{featured.minutes} min read</span>
              </div>
              <h2 className="mt-3 text-[24px] font-semibold leading-[1.15] tracking-[-0.02em] text-white transition-colors group-hover:text-[#c7c5ec] sm:text-[30px]">
                {featured.h1}
              </h2>
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-zinc-400">{featured.desc}</p>
              <div className="mt-4 flex items-center gap-2 text-[13px] text-zinc-500">
                <time dateTime={featured.datePublished}>{featured.date}</time>
                <ArrowUpRight className="h-4 w-4 transition-colors group-hover:text-[#8b88cf]" />
              </div>
            </div>
          </a>
        </article>
      )}

      {/* Latest heading — hidden when the active category has no grid posts */}
      <h2
        className="mb-6 text-[13px] font-semibold uppercase tracking-[0.16em] text-zinc-500"
        hidden={!showLatestHeading}
      >
        Latest
      </h2>

      {/* Grid. EVERY rest card is rendered; off-page / off-category ones are
          `hidden` so they stay in the crawled HTML but out of the human view. */}
      <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2">
        {rest.map(c => {
          const visible = (activeCat === 'all' || c.catId === activeCat) && pageSlugs.has(c.href);
          // `hidden` class (display:none) when off, `flex flex-col` when on.
          // NOT the `hidden` attribute: `.flex` overrides `[hidden]` so the
          // attribute silently fails to hide the card. This was the "shows 11
          // instead of 8" bug.
          return (
            <article key={c.href} className={visible ? 'flex flex-col' : 'hidden'} data-cat={c.catId}>
              <a href={c.href} className="group flex flex-col">
                {c.hero}
                <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[#8b88cf]">
                  <span>{c.category}</span>
                  <span className="text-zinc-600">·</span>
                  <span className="text-zinc-500">{c.minutes} min read</span>
                </div>
                <h3 className="mt-2 text-[17px] font-semibold leading-snug tracking-[-0.01em] text-white transition-colors group-hover:text-[#c7c5ec]">
                  {c.h1}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">{c.desc}</p>
                <time className="mt-3 text-[12px] text-zinc-500" dateTime={c.datePublished}>
                  {c.date}
                </time>
              </a>
            </article>
          );
        })}
      </div>

      {/* Pagination — only when the active filter has more than one page */}
      {pageCount > 1 && (
        <nav
          className="mt-12 flex items-center justify-center gap-1.5 border-t border-white/[0.07] pt-8"
          aria-label="Blog pagination"
        >
          <button
            type="button"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={current === 1}
            className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[13px] font-medium text-zinc-300 transition-colors hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Prev
          </button>
          {Array.from({ length: pageCount }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setPage(n)}
              aria-current={n === current ? 'page' : undefined}
              className={
                'min-w-[36px] rounded-md border px-3 py-1.5 text-[13px] font-medium tabular-nums transition-colors ' +
                (n === current
                  ? 'border-[#6C63C9]/55 bg-[#6C63C9]/[0.18] text-white'
                  : 'border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-white')
              }
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPage(p => Math.min(pageCount, p + 1))}
            disabled={current === pageCount}
            className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[13px] font-medium text-zinc-300 transition-colors hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </nav>
      )}
    </div>
  );
}

export default BlogBoard;
