import { allEntries, pathFor } from '@/content';
import type { ContentEntry } from '@/content/schema';

// Auto-derives related internal links from the registry — only ever returns
// pages that ACTUALLY EXIST, so the internal graph stays valid as content grows
// (no dead links). Priority: same-type siblings → a tool → glossary → the rest.
export function relatedFor(entry: ContentEntry, max = 6): { href: string; label: string }[] {
  const others = allEntries().filter(e => !(e.type === entry.type && e.slug === entry.slug));
  const ranked = [
    ...others.filter(e => e.type === entry.type),
    ...others.filter(e => e.type === 'tool'),
    ...others.filter(e => e.type === 'glossary'),
    ...others,
  ];
  const seen = new Set<string>();
  const out: { href: string; label: string }[] = [];
  for (const e of ranked) {
    const href = `/${pathFor(e)}`;
    if (seen.has(href)) continue;
    seen.add(href);
    out.push({ href, label: e.h1.length > 64 ? e.metaTitle : e.h1 });
    if (out.length >= max) break;
  }
  return out;
}
