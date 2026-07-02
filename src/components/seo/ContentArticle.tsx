import type { ReactNode } from 'react';
import { HelpCircle } from 'lucide-react';
import type { ContentEntry } from '@/content/schema';
import { pathForType } from '@/content/schema';
import { siteUrl } from '@/lib/seo';
import { founderAuthor } from '@/content/author';
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

const titleCase = (s: string) => s.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export function ContentArticle({ entry: e, children }: { entry: ContentEntry; children?: ReactNode }) {
  const path = `/${pathForType(e.type, e.slug)}`;
  const crumb = CRUMB[e.type];
  const isComp = e.type === 'comparison' || e.type === 'alternative';
  const leafName = e.comparison?.competitor || titleCase(e.slug);

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
          <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-zinc-400">{e.tldr}</p>
          <div className="mt-8">
            <HeroWebsiteInput ctaLabel={e.leadMagnet.ctaLabel} />
          </div>
          <TrustRow />
          <div className="mt-8 flex justify-center">
            <AuthorByline datePublished={e.datePublished} dateModified={e.dateModified} />
          </div>
        </div>
      </section>

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
            {isComp && <AtAGlance />}

            <p className="text-base leading-relaxed text-zinc-300">{e.intro}</p>

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

            <RelatedLinks entry={e} />

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
          </article>
        </div>
      </div>
    </>
  );
}
