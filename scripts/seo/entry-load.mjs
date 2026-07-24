// Load ContentEntry objects out of src/content/<dir>/<slug>.ts WITHOUT a TS
// toolchain. Every entry file is pure data:
//
//   import type { ContentEntry } from '../schema';
//   const entry: ContentEntry = { ...object literal... };
//   export default entry;
//
// The pipeline-written ones are strict JSON (serializeEntry uses
// JSON.stringify), but the two hand-written ones (comparisons/plausible,
// tools/utm-builder) are prettier-formatted JS: unquoted keys, single quotes,
// smart quotes, trailing commas. So JSON.parse alone handles 42/44. We strip the
// type-only import + the default export, drop the `: ContentEntry` annotation,
// and evaluate the remainder in an EMPTY vm context. The files reference no
// identifiers at all (verified: 44 files, 44 type-imports, 44 default exports,
// zero other imports/require), so an empty context is both sufficient and a
// hard guard — any stray identifier throws instead of silently resolving.

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { CONTENT, DIR, REPO } from './lib.mjs';

// ContentType -> URL prefix. Mirrors pathForType() in src/content/schema.ts.
export const URL_PREFIX = {
  comparison: 'vs',
  alternative: 'alternatives',
  tool: 'tools',
  glossary: 'glossary',
  useCase: 'for',
  guide: 'guides',
  blog: 'blogs',
};

// directory name -> ContentType (inverse of DIR)
export const TYPE_OF_DIR = Object.fromEntries(Object.entries(DIR).map(([t, d]) => [d, t]));

export function entryPath(type, slug) {
  return `/${URL_PREFIX[type]}/${slug}`;
}

/**
 * Resolve an entry's file, checking the live directory first and then _drafts.
 *
 * The review-mode gate depended on this. write.mjs --drafts emits to
 * src/content/_drafts/<dir>/<slug>.ts, which is deliberately invisible to
 * regenerateIndex(), but lint resolved ONLY the live path — so `lint --entry`
 * could not see a draft at all. In review mode the gate was therefore silently
 * skipped unless the caller staged a temporary copy into the live directory,
 * and that copy then survived as an orphan that the next regenerateIndex()
 * would sweep into the registry and ship unreviewed. A gate that is bypassed
 * exactly when a human is supposed to be reviewing is worse than no gate.
 */
export function entryFile(type, slug) {
  const live = path.join(CONTENT, DIR[type], `${slug}.ts`);
  if (fs.existsSync(live)) return live;
  const draft = path.join(CONTENT, '_drafts', DIR[type], `${slug}.ts`);
  if (fs.existsSync(draft)) return draft;
  return live; // preserve the original path in the not-found error
}

/** Parse the object literal out of an entry file's source text. */
export function parseEntrySource(src, label = '<entry>') {
  const marker = /const\s+entry\s*(?::\s*ContentEntry\s*)?=\s*/;
  const m = marker.exec(src);
  if (!m) throw new Error(`${label}: no "const entry: ContentEntry =" declaration found`);

  const start = m.index + m[0].length;
  const end = src.lastIndexOf('}', src.lastIndexOf('export default'));
  if (end < start) throw new Error(`${label}: could not locate the end of the object literal`);
  const literal = src.slice(start, end + 1);

  // Fast path: pipeline-serialized entries are valid JSON.
  try {
    return JSON.parse(literal);
  } catch {
    /* fall through to the JS-literal path */
  }

  // Slow path: hand-written JS object literal. Empty context = no globals, so a
  // literal that is not pure data will throw rather than execute anything.
  const ctx = vm.createContext(Object.create(null));
  try {
    return vm.runInContext(`(${literal})`, ctx, { timeout: 5000, filename: label });
  } catch (err) {
    throw new Error(`${label}: could not evaluate object literal — ${err.message}`);
  }
}

/** Load one entry by type + slug. Returns the raw ContentEntry object. */
export function loadEntry(type, slug) {
  const file = entryFile(type, slug);
  if (!fs.existsSync(file)) throw new Error(`no entry file at ${path.relative(REPO, file)}`);
  return parseEntrySource(fs.readFileSync(file, 'utf8'), `${type}/${slug}`);
}

/** Every entry on disk: [{ type, slug, file, relFile, key, path, entry }] */
export function loadAll() {
  const out = [];
  for (const [type, dir] of Object.entries(DIR)) {
    const full = path.join(CONTENT, dir);
    if (!fs.existsSync(full)) continue;
    for (const f of fs.readdirSync(full).sort()) {
      if (!f.endsWith('.ts')) continue;
      const slug = f.replace(/\.ts$/, '');
      const file = path.join(full, f);
      out.push({
        type,
        slug,
        file,
        relFile: path.relative(REPO, file),
        key: `${type}/${slug}`,
        path: entryPath(type, slug),
        entry: parseEntrySource(fs.readFileSync(file, 'utf8'), `${type}/${slug}`),
      });
    }
  }
  out.sort((a, b) => a.key.localeCompare(b.key));
  return out;
}

/**
 * The set of hrefs an internalLink may legally point at:
 *   - every live entry path (the registry, read from disk)
 *   - the SEO hub + legal pages that actually exist in the App Router
 */
export function validPaths() {
  const set = new Set(['/']);
  for (const [type, dir] of Object.entries(DIR)) {
    const full = path.join(CONTENT, dir);
    if (!fs.existsSync(full)) continue;
    for (const f of fs.readdirSync(full)) {
      if (f.endsWith('.ts')) set.add(entryPath(type, f.replace(/\.ts$/, '')));
    }
  }
  // Static routes under the (seo) and (legal) route groups.
  const appRoot = path.join(REPO, 'src', 'app');
  for (const group of ['(seo)', '(legal)']) {
    const g = path.join(appRoot, group);
    if (!fs.existsSync(g)) continue;
    for (const d of fs.readdirSync(g)) {
      if (d.startsWith('[') || d.startsWith('(')) continue;
      if (fs.existsSync(path.join(g, d, 'page.tsx'))) set.add(`/${d}`);
    }
  }
  return set;
}

/* ------------------------------------------------------------------ */
/* Text extraction                                                     */
/* ------------------------------------------------------------------ */

/**
 * bodyText = tldr + intro + every section's text/items + every FAQ Q and A.
 * This is the string every prose law (word floors, em dashes, banned phrases,
 * keyword density, honesty checks) runs against.
 */
export function bodyTextOf(entry) {
  const parts = [];
  if (entry.tldr) parts.push(String(entry.tldr));
  if (entry.intro) parts.push(String(entry.intro));
  for (const s of entry.sections || []) {
    if (!s || typeof s !== 'object') continue;
    if (typeof s.text === 'string' && s.text) parts.push(s.text);
    if (typeof s.caption === 'string' && s.caption) parts.push(s.caption);
    if (Array.isArray(s.items)) for (const it of s.items) if (typeof it === 'string') parts.push(it);
  }
  for (const f of entry.faq || []) {
    if (!f) continue;
    if (f.question) parts.push(String(f.question));
    if (f.answer) parts.push(String(f.answer));
  }
  return parts.join('\n\n');
}

const WORD_RE = /[A-Za-z0-9][A-Za-z0-9'’+-]*/g;

export function words(text) {
  return String(text).match(WORD_RE) || [];
}

export function wordCount(text) {
  return words(text).length;
}

/** Everything that renders as user-visible copy, for the "no Voltra" sweep. */
export function allTextOf(entry) {
  const parts = [];
  const walk = v => {
    if (typeof v === 'string') parts.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(entry);
  return parts.join('\n');
}

/** Build the ctx object the laws receive. */
export function contextFor(rec, shared = {}) {
  const bodyText = bodyTextOf(rec.entry);
  return {
    ...shared,
    type: rec.type,
    slug: rec.slug,
    key: rec.key,
    path: rec.path,
    file: rec.file,
    relFile: rec.relFile,
    bodyText,
    allText: allTextOf(rec.entry),
    words: words(bodyText),
    wordCount: wordCount(bodyText),
    validPaths: shared.validPaths || validPaths(),
  };
}
