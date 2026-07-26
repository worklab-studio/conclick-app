// Draft JSON -> typed ContentEntry on disk. THE ONLY sanctioned way the daily
// routine creates a page.
//
// Why this exists: the routine must never hand-write src/content/**/<slug>.ts
// and must never touch src/content/index.ts (auto-generated). It writes a plain
// draft JSON, and this script runs it through lib.mjs — the exact same
// assembleEntry/writeEntry/regenerateIndex path that produced the existing
// entries, including cleanSection() which strips the stray fields models emit.
//
// Usage:
//   node scripts/seo/write.mjs scripts/seo/drafts/<slug>.json
//   node scripts/seo/write.mjs <draft.json> --drafts   # emit to _drafts (review gate)
//   node scripts/seo/write.mjs --reindex               # rebuild index.ts from disk
//
// Draft JSON shape:
// {
//   "type": "guide",                 // ContentType
//   "slug": "is-ga4-sampling-your-data",
//   "kind": "guide",                 // drives the lead magnet: comparison|alternative|glossary|useCase|guide|blog|tool
//   "comp": { "name": "Plausible", "url": "https://plausible.io" },   // comparison/alternative only
//   "title": "…",                    // used by the useCase lead magnet
//   "keyword": "is ga4 sampling my data",   // the backlog row this satisfies
//   "draft": { h1, metaTitle, metaDescription, tldr, intro, sections[], faq[], comparisonRows[],
//              sources[], internalLinks[], heroWord, category, topics[] }
// }
//
// `sources` is [{label, url}] and is 3-6 PRIMARY sources: vendor docs, the
// vendor's own pricing page, the regulation's own text. Never secondary
// commentary. It is optional in the schema and was absent from the routine's
// draft template until 2026-07-26, which is how 46 of 68 live pages ended up
// with no citation list at all — including every comparison and alternative,
// the pages whose claims a third party can actually falsify.

import fs from 'node:fs';
import path from 'node:path';
import { assembleEntry, writeEntry, regenerateIndex, serializeEntry, CONTENT, DIR, REPO } from './lib.mjs';

const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--'));
const toDrafts = args.includes('--drafts');

// Back-out path. Review mode is off, so a failed entry is already on disk AND
// already in the registry by the time lint runs. Deleting the file is half the
// fix; without this the stale import stays in index.ts and the build breaks on
// a module that no longer exists.
if (args.includes('--reindex')) {
  const total = regenerateIndex();
  console.log(`index  ${total} entries`);
  console.log(`RESULT ${JSON.stringify({ ok: true, reindex: true, total })}`);
  process.exit(0);
}

if (!file) {
  console.error('usage: node scripts/seo/write.mjs <draft.json> [--drafts] | --reindex');
  process.exit(1);
}

let rec;
try {
  rec = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch (err) {
  console.error(`Cannot read draft: ${err.message}`);
  process.exit(1);
}

// Fail loudly on a malformed draft rather than writing a broken entry —
// next.config sets typescript.ignoreBuildErrors, so the build will NOT catch it.
const required = ['type', 'slug', 'draft'];
const missing = required.filter(k => !rec[k]);
if (missing.length) {
  console.error(`Draft is missing required field(s): ${missing.join(', ')}`);
  process.exit(1);
}
if (!DIR[rec.type]) {
  console.error(`Unknown ContentType "${rec.type}". Valid: ${Object.keys(DIR).join(', ')}`);
  process.exit(1);
}
for (const k of ['h1', 'metaTitle', 'metaDescription', 'tldr', 'intro']) {
  if (!rec.draft[k]) {
    console.error(`draft.${k} is required and missing.`);
    process.exit(1);
  }
}
if (!Array.isArray(rec.draft.sections) || !rec.draft.sections.length) {
  console.error('draft.sections must be a non-empty array.');
  process.exit(1);
}

// Warn, don't fail: `sources` is optional in the schema and 46 of the 68 live
// entries predate the template that asks for it, so failing here would break
// every legitimate re-run of an old draft. But a comparison or alternative with
// no citation list is a page of falsifiable claims about somebody else's product
// backed by nothing, and that is worth saying out loud at the moment it is made.
if (['comparison', 'alternative'].includes(rec.type) && !rec.draft.sources?.length) {
  console.warn(
    `WARN   ${rec.type}/${rec.slug} has no draft.sources — this page makes third-party claims. ` +
      `Add 3-6 PRIMARY sources (their docs, their pricing page, their changelog).`,
  );
}

rec.kind = rec.kind || rec.type;
const today = new Date().toISOString().slice(0, 10);
const entry = assembleEntry(rec, today);

let written;
if (toDrafts) {
  // Review gate: _drafts is invisible to the registry because regenerateIndex()
  // iterates only Object.values(DIR) — so a draft can be committed safely and
  // still cannot render, reach the sitemap, or be indexed.
  const dir = path.join(CONTENT, '_drafts', DIR[entry.type]);
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, `${entry.slug}.ts`);
  fs.writeFileSync(out, serializeEntry(entry));
  written = path.relative(REPO, out);
  console.log(`draft  ${written}   (not in registry — promote to publish)`);
} else {
  written = writeEntry(entry);
  const total = regenerateIndex();
  console.log(`wrote  ${written}`);
  console.log(`index  ${total} entries`);
}

// Machine-readable tail so the routine can parse without scraping prose.
console.log(`RESULT ${JSON.stringify({ ok: true, slug: entry.slug, type: entry.type, file: written, keyword: rec.keyword || null })}`);
