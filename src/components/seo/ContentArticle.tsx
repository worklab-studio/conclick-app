import type { CSSProperties, ReactNode } from 'react';
import { HelpCircle } from 'lucide-react';
import type { ContentEntry, InternalLink } from '@/content/schema';
import { pathForType } from '@/content/schema';
import { allEntries, pathFor } from '@/content';
import { siteUrl } from '@/lib/seo';
import { founderAuthor } from '@/content/author';
import { heroWordFor, meshKeyFor } from '@/lib/mesh/word';
import { readingTime } from '@/lib/readingTime';
import { JsonLd } from './JsonLd';
import {
  articleSchema,
  faqSchema,
  breadcrumbSchema,
  softwareAppSchema,
  webApplicationSchema,
  definedTermSchema,
  organizationSchema,
  websiteSchema,
  personSchema,
} from '@/lib/jsonld';
import { AuthorByline } from './AuthorByline';
import { Sections } from './prose';
import { FAQAccordion } from './FAQAccordion';
import { RelatedLinks } from './RelatedLinks';
import { Sources } from './Sources';
import { MeshHero } from './MeshHero';
import { LeadMagnetCTA } from './LeadMagnetCTA';
import { HeroWebsiteInput } from './HeroWebsiteInput';
import { SectionEyebrow } from './SectionEyebrow';
import { TrustRow } from './TrustRow';
import { AtAGlance } from './AtAGlance';
import { InlineCTA } from './InlineCTA';
import { TableOfContents } from './TableOfContents';

const CRUMB: Record<ContentEntry['type'], { name: string; eyebrow: string; hub: string }> = {
  comparison: { name: 'Compare', eyebrow: 'Comparison', hub: '/compare' },
  alternative: { name: 'Alternatives', eyebrow: 'Alternative', hub: '/alternatives' },
  tool: { name: 'Tools', eyebrow: 'Free tool', hub: '/tools' },
  glossary: { name: 'Glossary', eyebrow: 'Definition', hub: '/glossary' },
  useCase: { name: 'Use cases', eyebrow: 'Use case', hub: '/for' },
  guide: { name: 'Guides', eyebrow: 'Guide', hub: '/guides' },
  blog: { name: 'Blog', eyebrow: 'Blog', hub: '/blogs' },
};

/**
 * Types where the visitor arrived with purchase intent, so the conversion block
 * belongs above the fold.
 *
 * The inverse — blog, guide, glossary — is the whole point of this split. A
 * reader who landed on an essay from search or an LLM citation is not shopping;
 * leading with an email capture is what made every one of those pages read as a
 * landing page wearing an article's clothes. Those types lead with the article
 * and keep the CTA below the FAQ, where LeadMagnetCTA already sits for everyone.
 */
const COMMERCIAL: ReadonlySet<ContentEntry['type']> = new Set<ContentEntry['type']>([
  'comparison',
  'alternative',
  'useCase',
  'tool',
]);

/**
 * The same fallback chain and faux-italic accent the /blogs index uses
 * (BlogIndex.tsx SERIF). `@fontsource/instrument-serif/latin-400.css` is
 * imported once in src/app/(seo)/layout.tsx, so nothing new is loaded here —
 * and the italic is synthesized from the upright face, exactly as it already is
 * on the index headline and the Fast-facts numerals. Do not "fix" that by
 * adding an italic webfont; the whole system is deliberately on one file.
 */
const SERIF: CSSProperties = {
  fontFamily: "'Instrument Serif', Georgia, 'Times New Roman', serif",
  fontWeight: 400,
  fontStyle: 'italic',
};

const titleCase = (s: string) => s.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

/**
 * Tokens that end in a period without ending a sentence, compared with the dots
 * stripped ("e.g" -> "eg").
 *
 * Deliberately does NOT include "no": "the answer is no. Here is why" is far
 * more likely in this corpus than "No. 5", and treating it as an abbreviation
 * would silently glue two sentences together.
 */
const ABBREVIATIONS = new Set([
  'mr', 'mrs', 'ms', 'dr', 'prof', 'inc', 'ltd', 'co', 'corp', 'vs', 'etc',
  'eg', 'ie', 'fig', 'approx', 'est', 'jr', 'sr', 'al',
]);

/**
 * Split prose into sentence bullets.
 *
 * Hand-rolled rather than /(?<=[.!?])\s+/ on purpose: lookbehind is a *parse*
 * error on Safari < 16.4, which would take out the entire bundle rather than
 * just this box, and the cost of avoiding it is one loop. The guards below are
 * the ones that actually matter on this corpus — "0.3% conversion" and
 * "$600 in MRR" must never split, and neither must "U.S." or "e.g.".
 */
export function splitSentences(text: string, max = 5): string[] {
  const raw = (text ?? '').trim();
  if (!raw) return [];

  const out: string[] = [];
  let start = 0;

  for (let i = 0; i < raw.length; i++) {
    if (raw[i] !== '.' && raw[i] !== '!' && raw[i] !== '?') continue;

    // Absorb runs like "..." or "?!" so they stay with their sentence.
    let end = i;
    while (end + 1 < raw.length && '.!?'.includes(raw[end + 1])) end++;

    const gap = raw[end + 1];
    const next = raw[end + 2];

    // No whitespace after the stop -> a decimal, a version, a URL. Never a break.
    if (gap !== ' ' && gap !== '\n') {
      i = end;
      continue;
    }
    // The next sentence must plausibly begin. Lowercase after a period means the
    // period belonged to an abbreviation we did not enumerate.
    if (next && !/[A-Z0-9"“(]/.test(next)) {
      i = end;
      continue;
    }
    const head = raw.slice(start, i);

    // A single-letter token before the stop is an initial or an acronym
    // ("U.S." -> the letter before each dot is one char). Letters only here:
    // matching [A-Za-z.]+ would swallow the dots and turn "U.S" into the
    // two-character "us", which is not what the length test means to ask.
    const letters = head.match(/([A-Za-z]+)$/)?.[1] ?? '';
    if (letters.length === 1) {
      i = end;
      continue;
    }
    // Dotted form for the abbreviation lookup: "(e.g" -> "e.g" -> "eg".
    const dotted = (head.match(/([A-Za-z.]+)$/)?.[1] ?? '').replace(/\./g, '').toLowerCase();
    if (ABBREVIATIONS.has(dotted)) {
      i = end;
      continue;
    }

    out.push(raw.slice(start, end + 1).trim());
    start = end + 2;
    i = end + 1;
  }
  if (start < raw.length) out.push(raw.slice(start).trim());

  // Only the overflow tail is folded, into the last bullet, so the box never
  // runs longer than `max` lines.
  //
  // There is deliberately NO "fold anything shorter than N chars" rule. The
  // first version had one and it was actively harmful: this corpus is written in
  // short declaratives ("The business was not." — 21 chars, "Fix the biggest
  // leak first." — 27), so a 24-char floor silently glued real sentences back
  // together and the box collapsed to a single bullet on most pages. Bad splits
  // are a job for the guards above, not for a length heuristic downstream.
  const merged: string[] = [];
  for (const s of out.filter(Boolean)) {
    if (merged.length >= max) merged[merged.length - 1] += ` ${s}`;
    else merged.push(s);
  }
  return merged;
}

/**
 * THE SHORT VERSION — the tldr, promoted out of the hero and into a bordered box.
 *
 * Same words as before; the difference is entirely presentational, and that is
 * the point. A bordered, labelled, bulleted block is what featured-snippet and
 * AI-overview extractors reach for. The same sentence set as a subtitle under an
 * H1 is invisible to them.
 */
function ShortVersion({ tldr }: { tldr: string }) {
  const bullets = splitSentences(tldr);
  if (!bullets.length) return null;

  return (
    <section
      aria-labelledby="short-version-heading"
      className="mb-10 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"
    >
      <h2
        id="short-version-heading"
        className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8b88cf]"
      >
        The short version
      </h2>
      <ul className="mt-4 space-y-2.5">
        {bullets.map((b, i) => (
          <li key={i} className="relative pl-5 text-[15px] leading-relaxed text-zinc-300">
            <span
              aria-hidden
              className="absolute left-0 top-[0.62em] h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[#6C63C9]"
            />
            {b}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Every path an internalLinks href may legally point at.
 *
 * Same guarantee RichText.tsx gives in-prose links, for the same reason: the
 * routines write internalLinks unattended, so an unvalidated href reaches
 * production as a 404 and sits there until someone crawls the site. A miss here
 * renders the label as plain text — the words survive, the broken link does not.
 * Built once per process; the registry is static at build time.
 */
let entryByPath: Map<string, ContentEntry> | null = null;
function registry(): Map<string, ContentEntry> {
  if (!entryByPath) entryByPath = new Map(allEntries().map(e => [`/${pathFor(e)}`, e]));
  return entryByPath;
}

const GROUP_HEADING: Record<ContentEntry['type'], string> = {
  comparison: 'Comparisons',
  alternative: 'Alternatives',
  tool: 'Free tools',
  glossary: 'Definitions',
  useCase: 'Use cases',
  guide: 'Guides',
  blog: 'From the blog',
};

// Heading order, so a page with four buckets always renders them in the same
// sequence rather than in whatever order the pipeline happened to emit.
const GROUP_ORDER: ContentEntry['type'][] = [
  'guide',
  'comparison',
  'alternative',
  'useCase',
  'tool',
  'glossary',
  'blog',
];

/**
 * Which bucket a link belongs in.
 *
 * The RESOLVED entry's type wins over the link's own `group`. `group` is typed
 * `ContentType | 'integration'` but the pipeline has written URL segments into
 * it too — 'useCase', 'use-case' and 'for' are all in the corpus for one type —
 * so trusting it would split a single bucket across three headings. `group` is
 * only consulted for a link the registry cannot resolve, where it is the sole
 * clue left.
 */
const GROUP_ALIAS: Record<string, ContentEntry['type']> = {
  comparison: 'comparison',
  vs: 'comparison',
  alternative: 'alternative',
  alternatives: 'alternative',
  tool: 'tool',
  tools: 'tool',
  glossary: 'glossary',
  useCase: 'useCase',
  'use-case': 'useCase',
  for: 'useCase',
  guide: 'guide',
  guides: 'guide',
  blog: 'blog',
  blogs: 'blog',
};

/**
 * CURATED CROSS-LINKS — entry.internalLinks, rendered.
 *
 * This field carried 277 hand-picked links across the corpus and no component
 * read a single one of them: the data shipped in the bundle and produced zero
 * anchors. The loss was concentrated exactly where it hurts most — every
 * /vs/X <-> /alternatives/X pair is cross-linked here and NOWHERE in prose, so
 * the two pages about the same vendor had no path between them.
 *
 * A rail rather than a card grid on purpose: RelatedLinks sits directly below
 * with mesh-art cards, and two card grids stacked read as one padded footer
 * nobody scans. Curated first, auto-derived second.
 */
function CuratedLinks({ links, self }: { links: InternalLink[]; self: string }) {
  // The field is required by the type, but next.config.ts sets
  // typescript.ignoreBuildErrors — an entry that omits it ships as undefined and
  // would throw at prerender, not at compile.
  if (!links?.length) return null;

  const seen = new Set<string>([self]); // never link a page to itself
  const buckets = new Map<ContentEntry['type'], { href: string; label: string; live: boolean }[]>();

  for (const l of links) {
    // Trailing slashes are a common authoring slip and would otherwise miss.
    const href = l.href.length > 1 ? l.href.replace(/\/$/, '') : l.href;
    if (seen.has(href)) continue;
    seen.add(href);

    const target = registry().get(href);
    const group = target?.type ?? GROUP_ALIAS[l.group];
    if (!group) continue; // 'integration' and friends have no bucket to sit in

    const list = buckets.get(group) ?? [];
    list.push({ href, label: l.label, live: Boolean(target) });
    buckets.set(group, list);
  }
  if (!buckets.size) return null;

  return (
    <section
      // A <section> with no accessible name is not exposed as a region at all,
      // and the label below is a div, so it cannot be referenced with
      // aria-labelledby the way ShortVersion does it.
      aria-label="More on this"
      className="mt-16 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"
    >
      {/* div, not a heading — template chrome shouldn't pollute the content
          outline, same call RelatedLinks makes for "Read next". */}
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8b88cf]">
        More on this
      </div>
      <div className="mt-5 grid gap-x-8 gap-y-6 sm:grid-cols-2">
        {GROUP_ORDER.filter(g => buckets.has(g)).map(g => (
          <div key={g}>
            <div className="text-[11px] uppercase tracking-[0.1em] text-zinc-500">
              {GROUP_HEADING[g]}
            </div>
            <ul className="mt-2.5 space-y-2">
              {buckets.get(g)!.map(l => (
                <li key={l.href} className="relative pl-4 text-[14px] leading-snug">
                  <span
                    aria-hidden
                    className="absolute left-0 top-[0.6em] h-1 w-1 -translate-y-1/2 rounded-full bg-[#6C63C9]"
                  />
                  {l.live ? (
                    <a
                      href={l.href}
                      className="text-zinc-300 underline decoration-white/15 underline-offset-2 transition-colors hover:text-white hover:decoration-white/50"
                    >
                      {l.label}
                    </a>
                  ) : (
                    <span className="text-zinc-400">{l.label}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * The lede, with an optional drop cap.
 *
 * The cap is a real <span> rather than a `first-letter:` variant so it cannot
 * silently fail to compile, and it is guarded on /^[A-Za-z]/ — an intro opening
 * on a digit ("40,000 visitors...") or a quote renders a broken-looking cap,
 * because the glyph that gets enlarged is a comma or a quotation mark.
 */
function Lede({ text }: { text: string }) {
  const dropCap = /^[A-Za-z]/.test(text);
  if (!dropCap) return <p className="text-base leading-relaxed text-zinc-300">{text}</p>;

  return (
    <p className="text-base leading-relaxed text-zinc-300">
      <span
        style={{
          float: 'left',
          fontFamily: "'Instrument Serif', Georgia, 'Times New Roman', serif",
          fontWeight: 400,
          fontSize: '3.6em',
          lineHeight: 0.82,
          paddingRight: '0.09em',
          paddingTop: '0.04em',
          color: '#fff',
        }}
      >
        {text.charAt(0)}
      </span>
      {text.slice(1)}
    </p>
  );
}

export function ContentArticle({ entry: e, children }: { entry: ContentEntry; children?: ReactNode }) {
  const path = `/${pathForType(e.type, e.slug)}`;
  const crumb = CRUMB[e.type];
  const isComp = e.type === 'comparison' || e.type === 'alternative';
  const isCommercial = COMMERCIAL.has(e.type);
  const leafName = e.comparison?.competitor || titleCase(e.slug);
  const mins = readingTime(e);

  const toc = e.sections
    .filter(s => s.type === 'h2' && 'id' in s && s.id)
    .map(s => ({ id: (s as { id: string }).id, text: (s as { text: string }).text }));

  const schemas: unknown[] = [
    // The three site-wide entities come FIRST and unconditionally: articleSchema
    // now references its author and publisher by @id, so omitting these would
    // leave every Article pointing at nodes that appear nowhere on the page.
    organizationSchema(),
    websiteSchema(),
    personSchema(),
    articleSchema(e, path),
    faqSchema(e),
    breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: crumb.name, path: crumb.hub },
      { name: leafName, path },
    ]),
  ];
  if (isComp) schemas.push(softwareAppSchema());
  if (e.type === 'tool') schemas.push(webApplicationSchema(e, path));
  if (e.type === 'glossary') schemas.push(definedTermSchema(e, path));

  return (
    <>
      <JsonLd data={schemas} />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/[0.07]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[480px]"
          style={{ background: 'radial-gradient(50% 100% at 50% 0%, rgba(108,99,201,0.18), rgba(108,99,201,0) 70%)' }}
        />
        {/* Same width+padding ramp as the mesh wrapper and the body container
            below (max-w-3xl / lg:max-w-6xl, px-6 sm:px-8) so the eyebrow,
            headline, standfirst and byline all sit on the prose column's left
            edge. The three used to disagree on BOTH max-width (3xl/5xl/6xl) and
            padding (the hero alone had no sm:px-8) — invisible only while every
            hero child centred itself independently. Keeping the max-w-3xl floor
            rather than a flat max-w-6xl is deliberate: dropping it would stretch
            the tablet reading measure from 704px to ~957px. */}
        <div className="relative mx-auto w-full max-w-3xl px-6 pb-14 pt-16 sm:px-8 lg:max-w-6xl">
          <nav
            aria-label="Breadcrumb"
            className="mb-5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-zinc-500"
          >
            <a href={siteUrl()} className="transition-colors hover:text-zinc-300">
              Home
            </a>
            <span className="text-zinc-600">/</span>
            <a href={`${siteUrl()}${crumb.hub}`} className="transition-colors hover:text-zinc-300">
              {crumb.name}
            </a>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-400">{leafName}</span>
          </nav>
          <SectionEyebrow label={crumb.eyebrow} />
          {/* mt-6 (not mt-5) and sm:text-[44px] match the /blogs index rhythm so
              the index and the article read as one product. 44px stays below the
              index's 52px on purpose — the index is the cover, this is the
              story. The mobile step stays at 30px: article titles run long and
              32px costs a whole extra line in a 325px content box.

              NO max-w. The headline spans the full container, so its right edge
              lands on the mesh art's right edge (~1195px at 1440) and on the far
              edge of the index rail below it. It was capped at 46rem, which
              stopped it ~307px short of the art and made the whole hero read as
              an indented column beside a full-width image. */}
          <h1 className="mt-6 text-[30px] font-semibold leading-[1.12] tracking-[-0.02em] text-white sm:text-[44px] sm:leading-[1.08]">
            {e.h1}
          </h1>

          {/* The dek is metaDescription, not tldr: tldr now carries THE SHORT
              VERSION box below, and running the same sentences twice on one page
              is the kind of duplication that reads as filler to both humans and
              extractors. metaDescription is already written to be exactly this —
              one ~155-char summary line.

              Uncapped, like the h1 above it. A ~155-char line at 15px runs to
              about two lines at the full 952px content width, so the usual
              long-measure readability objection does not bite on a string this
              short — and a narrower dek under a full-width headline reads as
              the indent the operator asked us to remove. */}
          <p className="mt-6 text-[15px] leading-relaxed text-zinc-400">{e.metaDescription}</p>

          {isCommercial && (
            <>
              {/* Capping the wrapper at exactly the child's own max-w-[30rem]
                  leaves HeroWebsiteInput's internal mx-auto no slack to
                  distribute, so the field renders flush left with no component
                  edit. That matters: the same component is the pre-footer
                  conversion band (SeoFooter), where the mx-auto must survive. */}
              <div className="mt-8 max-w-[30rem]">
                <HeroWebsiteInput ctaLabel={e.leadMagnet.ctaLabel} />
              </div>
              <TrustRow />
            </>
          )}

          {/* Masthead: byline left, folio (category · read time) right, on a
              hairline rule. The category and read time used to be their own
              centred kicker line; folded in here they read as magazine credits
              instead of a fifth ragged line under a left-aligned hero.

              FULL CONTAINER WIDTH, matching the uncapped h1 above. The rule now
              spans the same span as the mesh art and as the article+index row
              below, so it reads as the divider closing the hero rather than a
              short line floating mid-page. The folio lands on that same right
              edge, which is where the index rail ends — the alignment that makes
              a lone "6 min read" (e.category is empty on 44 of the 68 pages)
              look placed rather than stranded. */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-white/[0.07] pt-6">
            <AuthorByline datePublished={e.datePublished} dateModified={e.dateModified} />
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
              {e.category && (
                <>
                  <span className="text-[#8b88cf]">{e.category}</span>
                  <span aria-hidden className="text-zinc-600">
                    ·
                  </span>
                </>
              )}
              <span>
                {/* #c7c5ec, not #8b88cf: the category sits immediately to the
                    left and is already #8b88cf, and #c7c5ec is the token this
                    folder reserves for serif italic accents. */}
                <span className="tabular-nums text-[#c7c5ec]" style={SERIF}>
                  {mins}
                </span>{' '}
                min read
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Mesh hero — byte-for-byte the art on this page's OG card, so the link
          preview and the page a reader lands on are visibly the same object. */}
      <div className="mx-auto w-full max-w-3xl px-6 pt-10 sm:px-8 lg:max-w-6xl">
        <MeshHero slug={meshKeyFor(e)} word={heroWordFor(e)} priority />
      </div>

      {/* Body + sticky TOC — wider container so the content fills the frame
          instead of leaving large empty gutters left and right. */}
      <div className="mx-auto w-full max-w-3xl px-6 py-14 sm:px-8 lg:max-w-6xl">
        <div className="lg:flex lg:gap-14">
          <article className="min-w-0 lg:max-w-[52rem] lg:flex-1">
            <ShortVersion tldr={e.tldr} />

            {isComp && <AtAGlance />}

            <Lede text={e.intro} />

            {children}

            <Sections entry={e} inject={{ afterH2: 2, node: <InlineCTA /> }} />

            {e.faq.length > 0 && (
              <section className="mt-16">
                {/* Left-aligned with the rest of the page now the hero is: a
                    centred FAQ heading would be the only centred block left on
                    an otherwise flush-left article. LeadMagnetCTA below keeps
                    its own text-center on purpose — it is a self-contained card
                    and is also rendered from prose.tsx. */}
                <div>
                  <SectionEyebrow icon={HelpCircle} label="FAQ" />
                  <h2 className="mt-4 text-2xl font-semibold tracking-[-0.02em] text-white sm:text-[30px]">
                    Frequently asked questions
                  </h2>
                </div>
                <div className="mt-8">
                  <FAQAccordion items={e.faq} />
                </div>
              </section>
            )}

            <div className="mt-16">
              <LeadMagnetCTA leadMagnet={e.leadMagnet} />
            </div>

            {/* Citations sit above the author card: the claim, then who made it. */}
            <Sources sources={e.sources} />

            {/* Author bio — E-E-A-T */}
            <div className="mt-12 flex items-start gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#6C63C9]/20 text-base font-semibold text-[#c7c5ec]">
                {founderAuthor.name.charAt(0)}
              </div>
              <div>
                <div className="text-sm font-semibold text-white">
                  Written by{' '}
                  <a href={founderAuthor.url} className="hover:underline">
                    {founderAuthor.name}
                  </a>
                </div>
                <div className="text-xs text-zinc-500">{founderAuthor.role}</div>
                <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">{founderAuthor.bio}</p>
              </div>
            </div>

            <CuratedLinks links={e.internalLinks} self={path} />

            <RelatedLinks entry={e} />
          </article>

          {/* On-page index, right-hand rail. Rendered AFTER <article> in the DOM
              rather than flipped with an order utility or flex-row-reverse. A
              CSS-only flip
              screenshots identically but is a WCAG 2.4.3 focus-order failure
              (keyboard users would tab through up to 10 TOC links before the
              prose) and leaves 10 duplicated heading anchors ahead of the body
              for crawlers and AI extractors. A plain lg:flex puts it on the
              right for free.

              Do NOT add lg:items-start here or self-start to the aside: either
              collapses it to content height and `sticky top-24` silently stops
              working after ~500px of scroll. Same for any overflow-hidden on an
              ancestor. The `>= 3` guard stays even though every current page has
              4+ h2s — it is what stops an empty 224px column plus a 56px gap
              from eating horizontal space on some future short page. */}
          {toc.length >= 3 && (
            <aside className="hidden lg:block lg:w-56 lg:shrink-0">
              <div className="sticky top-24">
                <TableOfContents items={toc} />
              </div>
            </aside>
          )}
        </div>
      </div>
    </>
  );
}
