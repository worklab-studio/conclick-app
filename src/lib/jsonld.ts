import { siteUrl, canonical } from '@/lib/seo';
import { founderAuthor } from '@/content/author';
import { conclickFacts } from '@/content/_facts/conclick';
import type { ContentEntry } from '@/content/schema';

// Builders for the structured data each template emits. Everything uses
// canonical conclick.io URLs (siteUrl) and the single founder author (E-E-A-T).

const person = () => ({
  '@type': 'Person',
  name: founderAuthor.name,
  url: founderAuthor.url,
  jobTitle: founderAuthor.role,
  description: founderAuthor.bio,
  worksFor: { '@type': 'Organization', name: 'Conclick', url: siteUrl() },
  sameAs: founderAuthor.sameAs,
});

const publisher = () => ({
  '@type': 'Organization',
  name: 'Conclick',
  url: siteUrl(),
  logo: { '@type': 'ImageObject', url: canonical('/images/conclick-logo.svg') },
});

export function softwareAppSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: conclickFacts.name,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: siteUrl(),
    description: conclickFacts.positioning,
    offers: { '@type': 'Offer', price: '9', priceCurrency: 'USD' },
  };
}

export function articleSchema(e: ContentEntry, path: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: e.h1,
    description: e.metaDescription,
    author: person(),
    publisher: publisher(),
    datePublished: e.datePublished,
    dateModified: e.dateModified,
    mainEntityOfPage: canonical(path),
    image: canonical(e.ogImage || '/images/og/default.png'),
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
