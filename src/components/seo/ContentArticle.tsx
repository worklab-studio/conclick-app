import type { ReactNode } from 'react';
import { HelpCircle } from 'lucide-react';
import type { ContentEntry } from '@/content/schema';
import { pathForType } from '@/content/schema';
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
  blog: { name: 'Blog', eyebrow: 'Blog', hub: '/blog' },
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
        <div className="relative mx-auto w-full max-w-3xl px-6 pb-14 pt-14 text-center">
          <nav
            aria-label="Breadcrumb"
            className="mb-5 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-xs text-zinc-500"
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
          <h1 className="mx-auto mt-5 max-w-[40rem] text-[30px] font-semibold leading-[1.12] tracking-[-0.02em] text-white sm:text-[40px] sm:leading-[1.1]">
            {e.h1}
          </h1>

          {/* The dek is metaDescription, not tldr: tldr now carries THE SHORT
              VERSION box below, and running the same sentences twice on one page
              is the kind of duplication that reads as filler to both humans and
              extractors. metaDescription is already written to be exactly this —
              one ~155-char summary line. */}
          <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-zinc-400">{e.metaDescription}</p>

          {/* Kicker: category (when authored) + read time. The date lives in the
              byline directly below, so it is deliberately not repeated here. */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-zinc-500">
            {e.category && (
              <>
                <span className="text-[#8b88cf]">{e.category}</span>
                <span aria-hidden className="text-zinc-600">
                  ·
                </span>
              </>
            )}
            <span>{mins} min read</span>
          </div>

          {isCommercial && (
            <>
              <div className="mt-8">
                <HeroWebsiteInput ctaLabel={e.leadMagnet.ctaLabel} />
              </div>
              <TrustRow />
            </>
          )}

          <div className="mt-8 flex justify-center">
            <AuthorByline datePublished={e.datePublished} dateModified={e.dateModified} />
          </div>
        </div>
      </section>

      {/* Mesh hero — byte-for-byte the art on this page's OG card, so the link
          preview and the page a reader lands on are visibly the same object. */}
      <div className="mx-auto w-full max-w-3xl px-6 pt-10 sm:px-8 lg:max-w-5xl">
        <MeshHero slug={meshKeyFor(e)} word={heroWordFor(e)} priority />
      </div>

      {/* Body + sticky TOC — wider container so the content fills the frame
          instead of leaving large empty gutters left and right. */}
      <div className="mx-auto w-full max-w-3xl px-6 py-14 sm:px-8 lg:max-w-6xl">
        <div className="lg:flex lg:gap-14">
          {toc.length >= 3 && (
            <aside className="mb-10 hidden lg:block lg:w-56 lg:shrink-0">
              <div className="sticky top-24">
                <TableOfContents items={toc} />
              </div>
            </aside>
          )}
          <article className="min-w-0 lg:max-w-[52rem] lg:flex-1">
            <ShortVersion tldr={e.tldr} />

            {isComp && <AtAGlance />}

            <Lede text={e.intro} />

            {children}

            <Sections entry={e} inject={{ afterH2: 2, node: <InlineCTA /> }} />

            {e.faq.length > 0 && (
              <section className="mt-16">
                <div className="text-center">
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

            <RelatedLinks entry={e} />
          </article>
        </div>
      </div>
    </>
  );
}
