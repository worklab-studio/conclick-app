// Typed content model for the programmatic-SEO pages. Every page is one
// `ContentEntry` object living in src/content/<type>/<slug>.ts. The Claude-Sonnet
// pipeline produces these objects (structured output) and a human reviews them in
// a PR. Body is a typed `Section[]` so authors/AI never touch JSX — the prose
// renderer maps blocks to styled primitives.

export type ContentType =
  | 'comparison' // /vs/[slug]
  | 'alternative' // /alternatives/[slug]
  | 'tool' // /tools/[slug]
  | 'glossary' // /glossary/[slug]
  | 'useCase' // /for/[slug]
  | 'guide' // /guides/[slug]
  | 'blog'; // /blog/[slug]

export interface Author {
  name: string;
  role: string;
  bio: string;
  photo: string; // /images/authors/deepak.jpg
  url: string; // conclick.io/about
  sameAs: string[]; // social profiles -> JSON-LD author.sameAs (E-E-A-T)
}

export type Section =
  | { type: 'h2'; text: string; id?: string }
  | { type: 'h3'; text: string; id?: string }
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'quote'; text: string; cite?: string }
  | { type: 'callout'; text: string } // highlighted note box
  | { type: 'comparisonTable' } // renders entry.comparison
  | { type: 'cta'; variant?: 'leadMagnet' | 'tool' }
  | { type: 'image'; src: string; alt: string; caption?: string };

export interface FaqItem {
  question: string;
  answer: string;
}

export interface ComparisonRow {
  feature: string;
  conclick: string | boolean; // true/false -> check/X; string -> text cell
  competitor: string | boolean;
  note?: string;
}

export interface ComparisonData {
  competitor: string; // display name, e.g. "Plausible"
  competitorUrl?: string;
  rows: ComparisonRow[];
}

export interface InternalLink {
  href: string; // path only, e.g. /vs/fathom (conclick.io added at render)
  label: string;
  group: ContentType | 'integration';
}

/** One entry in the SOURCES list rendered at the foot of an article. */
export interface Source {
  label: string; // human-readable: "GA4 data sampling thresholds — Google"
  url: string; // absolute, external
}

export interface LeadMagnet {
  kind: 'addWebsite' | 'tool';
  headline: string;
  sub: string;
  ctaLabel: string; // "Add My Website"
  toolSlug?: string; // when kind === 'tool'
}

export interface ContentEntry {
  type: ContentType;
  slug: string; // path segment, e.g. "plausible"
  h1: string;
  metaTitle: string; // <= ~60 chars
  metaDescription: string; // <= ~155 chars
  ogImage?: string; // optional; brand default otherwise
  tldr: string; // answer-first summary box (snippet / AI-overview bait)
  intro: string; // lead paragraph, founder voice
  sections: Section[];
  faq: FaqItem[]; // 5-8 -> FAQAccordion + FAQPage JSON-LD
  comparison?: ComparisonData; // comparison / alternative types
  internalLinks: InternalLink[]; // curated cross-links (+ auto ones at render)
  relatedTools: string[]; // tool slugs to surface
  leadMagnet: LeadMagnet;
  datePublished: string; // ISO
  dateModified: string; // ISO

  // ---------------------------------------------------------------------------
  // Editorial / mesh-art additions. ALL OPTIONAL, and they must stay that way:
  // next.config.ts sets typescript.ignoreBuildErrors, so a newly-required field
  // would not fail the build — it would ship as `undefined` into production and
  // render a blank hero on all 44 existing entries. Optional + a runtime
  // fallback for every one of these is the only safe shape here.
  // ---------------------------------------------------------------------------

  /**
   * The single serif word painted on the mesh hero, e.g. "capped." "growth.".
   * Lowercase, 3-12 chars, include the trailing period — it is the whole visual
   * idea. Omit it and src/lib/mesh/word.ts derives one from the slug.
   */
  heroWord?: string;

  /** Display category for the blog index filter row, e.g. "Analytics". */
  category?: string;

  /** 2-5 lowercase tags for the TOPICS pill cloud, e.g. ["ga4", "privacy"]. */
  topics?: string[];

  /**
   * Explicit citation list rendered as SOURCES.
   *
   * This is the highest-leverage field for GEO: an enumerated, linked source
   * list is a primary signal LLM retrievers use to judge whether a page is
   * trustworthy enough to cite. Prefer primary sources (vendor docs, the actual
   * regulation, published research) over secondary commentary.
   */
  sources?: Source[];
}

// Maps a content type to its URL path (no leading host; siteUrl() prefixes it).
export function pathForType(type: ContentType, slug: string): string {
  switch (type) {
    case 'comparison':
      return `vs/${slug}`;
    case 'alternative':
      return `alternatives/${slug}`;
    case 'tool':
      return `tools/${slug}`;
    case 'glossary':
      return `glossary/${slug}`;
    case 'useCase':
      return `for/${slug}`;
    case 'guide':
      return `guides/${slug}`;
    case 'blog':
      return `blog/${slug}`;
  }
}
