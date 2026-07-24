import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOT = 'src/content';

const DIRS = {
  blog: '/blog/',
  comparisons: '/vs/',
  guides: '/guides/',
  alternatives: '/alternatives/',
  'use-cases': '/for/',
  glossary: '/glossary/',
  tools: '/tools/',
};

const entries = [];
for (const [dir, prefix] of Object.entries(DIRS)) {
  const dirPath = join(ROOT, dir);
  let files;
  try { files = readdirSync(dirPath); } catch { continue; }
  for (const f of files) {
    if (!f.endsWith('.ts')) continue;
    const slug = f.replace(/\.ts$/, '');
    const content = readFileSync(join(dirPath, f), 'utf8');
    entries.push({ url: prefix + slug, path: join(dir, f), content, slug });
  }
}

function extractInProseLinks(content) {
  const links = new Set();
  let stripped = content;
  const idx = stripped.indexOf('internalLinks');
  if (idx >= 0) {
    const brOpen = stripped.indexOf('[', idx);
    if (brOpen >= 0) {
      let depth = 0;
      let i = brOpen;
      for (; i < stripped.length; i++) {
        if (stripped[i] === '[') depth++;
        else if (stripped[i] === ']') { depth--; if (depth === 0) { i++; break; } }
      }
      stripped = stripped.slice(0, idx) + stripped.slice(i);
    }
  }
  const re = /\[([^\]]+)\]\((\/[^)\s]+)\)/g;
  let m;
  while ((m = re.exec(stripped)) !== null) {
    links.add(m[2].replace(/\/$/, ''));
  }
  return links;
}

const inbound = new Map();
for (const e of entries) inbound.set(e.url, new Set());

for (const src of entries) {
  const links = extractInProseLinks(src.content);
  for (const link of links) {
    if (inbound.has(link)) inbound.get(link).add(src.url);
  }
}

const orphans = [];
for (const e of entries) {
  const count = inbound.get(e.url).size;
  if (count === 0) orphans.push({ url: e.url, path: e.path });
}

console.log(`Total entries: ${entries.length}`);
console.log(`Orphans (no in-prose inbound links): ${orphans.length}`);
console.log('');
console.log('ORPHANS:');
for (const o of orphans) console.log(`  ${o.url}  (${o.path})`);

console.log('');
console.log('INBOUND COUNTS (sorted asc, bottom 25):');
const sorted = [...entries].map(e => ({ url: e.url, n: inbound.get(e.url).size })).sort((a,b) => a.n - b.n);
for (const s of sorted.slice(0, 25)) console.log(`  ${s.n}\t${s.url}`);
