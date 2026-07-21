// "N min read" for a content entry.
//
// Counts the prose a reader actually reads: the TL;DR box, the lede, every text
// block in the body, and both sides of every FAQ. Structural blocks
// (comparisonTable, cta) contribute nothing — they render from other fields and
// are scanned, not read.

import type { ContentEntry, FaqItem, Section } from '@/content/schema';

/** Adult reading speed for technical-but-not-academic prose. */
const WORDS_PER_MINUTE = 220;

export interface ReadingTimeSource {
  tldr?: string;
  intro?: string;
  sections?: Section[];
  faq?: FaqItem[];
}

/**
 * Whole minutes to read an entry, minimum 1.
 *
 * Accepts a full ContentEntry or any subset of the readable fields — every field
 * is optional here so this can never throw on a half-built draft entry.
 */
export function readingTime(entry: ReadingTimeSource | ContentEntry): number {
  const words =
    countWords(entry.tldr) +
    countWords(entry.intro) +
    (entry.sections ?? []).reduce((n, s) => n + sectionWords(s), 0) +
    (entry.faq ?? []).reduce((n, f) => n + countWords(f.question) + countWords(f.answer), 0);

  return Math.max(1, Math.round(words / WORDS_PER_MINUTE) || 1);
}

function sectionWords(section: Section): number {
  switch (section.type) {
    case 'h2':
    case 'h3':
    case 'p':
    case 'callout':
      return countWords(section.text);
    case 'quote':
      return countWords(section.text) + countWords(section.cite);
    case 'ul':
    case 'ol':
      return section.items.reduce((n, item) => n + countWords(item), 0);
    case 'image':
      // Alt text is for assistive tech, not reading time; a caption is read.
      return countWords(section.caption);
    case 'comparisonTable':
    case 'cta':
      return 0;
    default:
      return 0;
  }
}

function countWords(text?: string): number {
  if (!text) return 0;
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}
