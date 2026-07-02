// Bulk codegen: read a JSON array of generated records (the Workflow output) and
// write every entry to src/content/<dir>/<slug>.ts, then regenerate index.ts.
//
//   node scripts/seo/build-entries.mjs <records.json> [YYYY-MM-DD]
//
// Each record = { type, slug, kind, comp, title, draft }.

import fs from 'node:fs';
import { assembleEntry, writeEntry, regenerateIndex } from './lib.mjs';

const jsonPath = process.argv[2] || '/tmp/seo-content.json';
const dateISO = process.argv[3] || new Date().toISOString().slice(0, 10);

const records = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let n = 0;
for (const rec of records) {
  if (!rec || !rec.draft) continue;
  try {
    writeEntry(assembleEntry(rec, dateISO));
    n++;
  } catch (err) {
    console.error('FAILED', rec.type, rec.slug, '-', err.message);
  }
}
const total = regenerateIndex();
console.log(`Wrote ${n} entries. Registry now imports ${total} content files.`);
