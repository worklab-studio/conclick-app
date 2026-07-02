import type { MetadataRoute } from 'next';
import { allEntries, pathFor } from '@/content';
import { siteUrl } from '@/lib/seo';

// Emitted at /sitemap.xml. Framer rewrites conclick.io/sitemap.xml -> this. All
// URLs use the conclick.io canonical host. Grows automatically as content entries
// are added to the registry.
const HUBS = ['compare', 'alternatives', 'glossary', 'for', 'guides', 'blog', 'tools'];
// Core Framer marketing pages (served from conclick.io) — included so the new
// domain gives Google every canonical hint while it's still being indexed.
const CORE: { path: string; priority: number }[] = [
  { path: '', priority: 1.0 },
  { path: 'pricing', priority: 0.9 },
  { path: 'about', priority: 0.5 },
  { path: 'contact', priority: 0.5 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  // Hubs are generated from the registry, so their true lastmod is the newest
  // entry's dateModified — gives crawlers a freshness signal on the index pages.
  const newest = allEntries()
    .map(e => e.dateModified)
    .sort()
    .at(-1);
  const core = CORE.map(c => ({
    url: c.path ? `${base}/${c.path}` : base,
    changeFrequency: 'monthly' as const,
    priority: c.priority,
  }));
  const hubs = HUBS.map(h => ({
    url: `${base}/${h}`,
    lastModified: newest,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));
  const entries = allEntries().map(e => ({
    url: `${base}/${pathFor(e)}`,
    lastModified: e.dateModified,
    changeFrequency: 'weekly' as const,
    priority: e.type === 'comparison' || e.type === 'alternative' ? 0.8 : 0.6,
  }));
  return [...core, ...hubs, ...entries];
}
