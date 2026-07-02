// Shared helpers for the SEO content pipeline. Turns a Sonnet "draft" (the prose
// parts) into a fully-typed ContentEntry, writes it to src/content/<dir>/<slug>.ts,
// and regenerates the registry index.ts. Used by both build-entries.mjs (bulk,
// from a Workflow JSON blob) and generate.mjs (daily, one topic via the API).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(HERE, '..', '..'); // umami/
export const CONTENT = path.join(REPO, 'src', 'content');

// ContentType -> directory under src/content.
export const DIR = {
  comparison: 'comparisons',
  alternative: 'alternatives',
  tool: 'tools',
  glossary: 'glossary',
  useCase: 'use-cases',
  guide: 'guides',
  blog: 'blog',
};

function leadMagnetFor(rec) {
  const name = rec.comp?.name;
  switch (rec.kind) {
    case 'comparison':
    case 'alternative':
      return {
        kind: 'addWebsite',
        headline: `See what ${name} can't show you`,
        sub: `Add your site and Conclick shows which traffic actually makes money — heatmaps, funnels, and revenue in one dashboard. Free for 14 days, no card.`,
        ctaLabel: 'Add My Website',
      };
    case 'glossary':
      return {
        kind: 'addWebsite',
        headline: 'Measure this automatically',
        sub: 'Conclick tracks this out of the box, alongside heatmaps, funnels, and revenue attribution. Free for 14 days, no card.',
        ctaLabel: 'Add My Website',
      };
    case 'useCase':
      return {
        kind: 'addWebsite',
        headline: `Analytics built for ${rec.title}`,
        sub: `See which traffic makes money and where you're losing it. Free for 14 days, no card.`,
        ctaLabel: 'Add My Website',
      };
    default:
      return {
        kind: 'addWebsite',
        headline: 'Put this into practice',
        sub: 'Conclick gives you privacy-first analytics, heatmaps, funnels, and revenue attribution in one. Free for 14 days, no card.',
        ctaLabel: 'Add My Website',
      };
  }
}

// Coerce a model-emitted section to the EXACT shape the Section union allows
// (the model adds stray fields like cta.text or callout.variant that break TS).
// Returns null to drop the section (unknown type, or mid-content cta — we rely
// on the hero input + post-FAQ lead magnet + footer band instead).
const slugify = txt =>
  String(txt).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'section';

function cleanSection(s) {
  if (!s || typeof s !== 'object') return null;
  const t = s.type;
  const txt = typeof s.text === 'string' ? s.text : '';
  const items = Array.isArray(s.items) ? s.items.filter(x => typeof x === 'string') : [];
  switch (t) {
    case 'h2':
    case 'h3':
      return { type: t, text: txt, id: s.id ? String(s.id) : slugify(txt) };
    case 'p':
      return txt ? { type: 'p', text: txt } : null;
    case 'ul':
    case 'ol':
      return items.length ? { type: t, items } : null;
    case 'quote':
      return { type: 'quote', text: txt, ...(s.cite ? { cite: String(s.cite) } : {}) };
    case 'callout':
      return txt ? { type: 'callout', text: txt } : null;
    case 'comparisonTable':
      return { type: 'comparisonTable' };
    case 'image':
      return s.src ? { type: 'image', src: String(s.src), alt: String(s.alt || ''), ...(s.caption ? { caption: String(s.caption) } : {}) } : null;
    case 'cta':
      return null; // drop — CTAs come from the hero, post-FAQ magnet, and footer band
    default:
      return null;
  }
}

// Guarantee a comparison/alternative page renders its table even if the model
// forgot the {type:'comparisonTable'} block.
function ensureTable(sections, hasRows) {
  if (!hasRows || sections.some(s => s.type === 'comparisonTable')) return sections;
  const i = sections.findIndex(s => s.type === 'h2');
  const block = { type: 'comparisonTable' };
  if (i >= 0) sections.splice(i + 1, 0, block);
  else sections.unshift(block);
  return sections;
}

const isComp = rec => rec.kind === 'comparison' || rec.kind === 'alternative';

// rec = { type, slug, kind, comp, title, draft }
export function assembleEntry(rec, dateISO) {
  const d = rec.draft;
  const hasRows = !!(d.comparisonRows && d.comparisonRows.length) && isComp(rec);
  const cleaned = (d.sections || []).map(cleanSection).filter(Boolean);
  const entry = {
    type: rec.type,
    slug: rec.slug,
    h1: d.h1,
    metaTitle: d.metaTitle,
    metaDescription: d.metaDescription,
    tldr: d.tldr,
    intro: d.intro,
    sections: ensureTable(cleaned, hasRows),
    faq: d.faq || [],
    internalLinks: [],
    relatedTools: isComp(rec) || rec.kind === 'guide' ? ['utm-builder'] : [],
    leadMagnet: leadMagnetFor(rec),
    datePublished: dateISO,
    dateModified: dateISO,
  };
  if (isComp(rec)) {
    entry.comparison = {
      competitor: rec.comp.name,
      competitorUrl: rec.comp.url,
      rows: (d.comparisonRows || []).map(r => ({
        feature: r.feature,
        conclick: r.conclick,
        competitor: r.competitor,
        ...(r.note ? { note: r.note } : {}),
      })),
    };
  }
  return entry;
}

export function serializeEntry(entry) {
  return `import type { ContentEntry } from '../schema';\n\nconst entry: ContentEntry = ${JSON.stringify(entry, null, 2)};\n\nexport default entry;\n`;
}

export function writeEntry(entry) {
  const dir = DIR[entry.type];
  const full = path.join(CONTENT, dir);
  fs.mkdirSync(full, { recursive: true });
  const file = path.join(full, `${entry.slug}.ts`);
  fs.writeFileSync(file, serializeEntry(entry));
  return path.relative(REPO, file);
}

const varName = (dir, slug) => `${dir.replace(/-/g, '')}_${slug.replace(/[^a-zA-Z0-9]/g, '_')}`;

// Rebuild src/content/index.ts to import every entry file present on disk.
export function regenerateIndex() {
  const files = [];
  for (const dir of Object.values(DIR)) {
    const full = path.join(CONTENT, dir);
    if (!fs.existsSync(full)) continue;
    for (const f of fs.readdirSync(full)) {
      if (f.endsWith('.ts')) files.push({ dir, slug: f.replace(/\.ts$/, '') });
    }
  }
  files.sort((a, b) => (a.dir + a.slug).localeCompare(b.dir + b.slug));

  const imports = files.map(f => `import ${varName(f.dir, f.slug)} from './${f.dir}/${f.slug}';`).join('\n');
  const arr = files.map(f => `  ${varName(f.dir, f.slug)},`).join('\n');

  const out = `import type { ContentEntry, ContentType } from './schema';
import { pathForType } from './schema';

// AUTO-GENERATED by scripts/seo. Do not edit by hand — re-run the pipeline.
${imports}

const ENTRIES: ContentEntry[] = [
${arr}
];

export function allEntries(): ContentEntry[] {
  return ENTRIES;
}

export function entriesByType(type: ContentType): ContentEntry[] {
  return ENTRIES.filter(e => e.type === type);
}

export function getEntry(type: ContentType, slug: string): ContentEntry | undefined {
  return ENTRIES.find(e => e.type === type && e.slug === slug);
}

export function pathFor(e: ContentEntry): string {
  return pathForType(e.type, e.slug);
}

export const comparisonParams = () => entriesByType('comparison').map(e => ({ competitor: e.slug }));
export const alternativeParams = () => entriesByType('alternative').map(e => ({ competitor: e.slug }));
export const toolParams = () => entriesByType('tool').map(e => ({ tool: e.slug }));
export const glossaryParams = () => entriesByType('glossary').map(e => ({ term: e.slug }));
export const useCaseParams = () => entriesByType('useCase').map(e => ({ useCase: e.slug }));
export const guideParams = () => entriesByType('guide').map(e => ({ slug: e.slug }));
export const blogParams = () => entriesByType('blog').map(e => ({ slug: e.slug }));
`;
  fs.writeFileSync(path.join(CONTENT, 'index.ts'), out);
  return files.length;
}
