import { siteUrl, canonical } from '@/lib/seo';
import { founderAuthor } from '@/content/author';
import { conclickFacts } from '@/content/_facts/conclick';
import type { ContentEntry } from '@/content/schema';

// Builders for the structured data each template emits. Everything uses
// canonical conclick.io URLs (siteUrl) and the single founder author (E-E-A-T).

// ---------------------------------------------------------------------------
// Entity @ids.
//
// These three strings ARE the identity of the organization, the site and the
// author as far as a knowledge graph is concerned, so they are declared once and
// never inlined. Every Article on the domain previously carried its own
// anonymous `author`/`publisher` object, which gave a consumer 68 unrelated
// nameless nodes to reconcile instead of one entity cited 68 times.
//
// They are URL-shaped but they are NOT fetched — an @id is a name. Keep them
// stable once indexed. That is why personId() hangs off the site root and not
// off founderAuthor.url: moving the founder bio off /about would otherwise
// rename the author, and every Article would silently point at a new person.
// ---------------------------------------------------------------------------
const orgId = () => `${siteUrl()}/#organization`;
const websiteId = () => `${siteUrl()}/#website`;
const personId = () => `${siteUrl()}/#person`;

/**
 * The publisher every Article points at. Emitted once per page by
 * ContentArticle; the Articles themselves carry only `{ '@id': orgId() }`.
 *
 * The logo is the PNG, not the SVG this used to reference: Google's
 * organization-logo rich result does not accept SVG, so the previous value was
 * a well-formed field that no consumer could use. width/height are the real
 * pixel dimensions of public/images/conclick-logo.png (355x348) — both above the
 * 112x112 floor.
 *
 * No `sameAs` here. The only social profiles this repo knows are the founder's
 * personal accounts (author.ts), and asserting them as the company's would be a
 * fabricated entity link.
 */
export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': orgId(),
    name: conclickFacts.name,
    url: siteUrl(),
    description: conclickFacts.positioning,
    logo: {
      '@type': 'ImageObject',
      '@id': `${siteUrl()}/#logo`,
      url: canonical('/images/conclick-logo.png'),
      width: 355,
      height: 348,
      caption: conclickFacts.name,
    },
    founder: { '@id': personId() },
  };
}

/**
 * The WebSite node the whole domain hangs off, so Articles have something to be
 * `isPartOf` and the publisher resolves to a site rather than to nothing.
 *
 * Deliberately no `potentialAction`/SearchAction: conclick.io has no site
 * search endpoint, and claiming one is how you earn a sitelinks-searchbox that
 * 404s on every query.
 */
export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': websiteId(),
    name: conclickFacts.name,
    url: siteUrl(),
    description: conclickFacts.tagline,
    inLanguage: 'en',
    publisher: { '@id': orgId() },
  };
}

/**
 * The author entity. Everything comes from src/content/author.ts — no invented
 * credentials, and no `image`: author.ts points `photo` at
 * /images/authors/deepak.jpg, which does not exist in public/. Emitting it would
 * hand every consumer a 404 image for the author entity, which is strictly worse
 * than an author with no portrait. Add the file, then add the field.
 */
export function personSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': personId(),
    name: founderAuthor.name,
    url: founderAuthor.url,
    jobTitle: founderAuthor.role,
    description: founderAuthor.bio,
    worksFor: { '@id': orgId() },
    sameAs: founderAuthor.sameAs,
  };
}

export function softwareAppSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: conclickFacts.name,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: siteUrl(),
    description: conclickFacts.positioning,
    // Ties the product to the company node rather than leaving an ownerless
    // SoftwareApplication floating on every comparison page.
    publisher: { '@id': orgId() },
    offers: { '@type': 'Offer', price: '9', priceCurrency: 'USD' },
  };
}

export function articleSchema(e: ContentEntry, path: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: e.h1,
    description: e.metaDescription,
    // References, not copies. The nodes themselves are emitted alongside this
    // one by ContentArticle (personSchema/organizationSchema/websiteSchema) — if
    // a future caller renders articleSchema WITHOUT those, these @ids dangle and
    // the author/publisher resolve to nothing again.
    author: { '@id': personId() },
    publisher: { '@id': orgId() },
    isPartOf: { '@id': websiteId() },
    datePublished: e.datePublished,
    dateModified: e.dateModified,
    mainEntityOfPage: canonical(path),
    image: canonical(e.ogImage || '/images/og/default.png'),
    // Machine-readable half of the rendered SOURCES list (components/seo/Sources.tsx).
    // Spread rather than assigned so an entry without sources emits no `citation`
    // key at all — an empty array is a positive claim that the article cites
    // nothing, which is worse than staying silent.
    ...(e.sources?.length
      ? {
          citation: e.sources.map(s => ({
            '@type': 'CreativeWork',
            name: s.label,
            url: s.url,
          })),
        }
      : {}),
  };
}

export function faqSchema(e: ContentEntry) {
  if (!e.faq?.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: e.faq.map(f => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: canonical(it.path),
    })),
  };
}

// CollectionPage + ItemList for the hub/index pages so Google understands them
// as curated lists (and not thin doorway pages). `items` carry absolute URLs.
export function itemListSchema(name: string, path: string, items: { url: string; name: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    url: canonical(path),
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: items.map((it, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: it.url,
        name: it.name,
      })),
    },
  };
}

export function webApplicationSchema(e: ContentEntry, path: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: e.h1,
    url: canonical(path),
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Web',
    description: e.metaDescription,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };
}

export function definedTermSchema(e: ContentEntry, path: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    name: e.h1,
    description: e.metaDescription,
    url: canonical(path),
    inDefinedTermSet: canonical('/glossary'),
  };
}
