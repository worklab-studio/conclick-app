import { allEntries, pathFor } from '@/content';
import type { ContentEntry } from '@/content/schema';

// FNV-1a. Deterministic on purpose: these links are baked at build time, so a
// Math.random or Date-based offset would disagree between the prerender and the
// client and blow up hydration. Same slug in, same number out, forever.
function slugHash(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Start each tier at a different index instead of always at index 0.
function rotate<T>(list: T[], offset: number): T[] {
  if (list.length < 2) return list;
  const i = offset % list.length;
  return [...list.slice(i), ...list.slice(0, i)];
}

// Auto-derives related internal links from the registry — only ever returns
// pages that ACTUALLY EXIST, so the internal graph stays valid as content grows
// (no dead links). Priority: same-type siblings → a tool → glossary → the rest.
//
// Each tier is rotated by a hash of the SOURCE page's slug. Without that, every
// page took the first `max` candidates of a registry that is ordered
// alphabetically by filename, so the head of the alphabet won every draw: 6
// guides collected 18 inbound links each while 27 of 68 pages collected none.
// The rotation spreads inbound links across the corpus while keeping the output
// stable per page (see slugHash).
export function relatedFor(entry: ContentEntry, max = 6): { href: string; label: string }[] {
  const others = allEntries().filter(e => !(e.type === entry.type && e.slug === entry.slug));
  // type is part of the key because slugs are only unique within a type.
  const offset = slugHash(`${entry.type}:${entry.slug}`);
  const rot = <T>(list: T[]) => rotate(list, offset);
  const ranked = [
    ...rot(others.filter(e => e.type === entry.type)),
    ...rot(others.filter(e => e.type === 'tool')),
    ...rot(others.filter(e => e.type === 'glossary')),
    ...rot(others),
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
