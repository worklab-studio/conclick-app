#!/usr/bin/env node
/**
 * import-seeds.mjs — load seeds.txt into the keyword backlog, offline.
 *
 * suggest.mjs and harvest.mjs both need the network. This does not: it reads
 * seeds.txt, runs every line through gates.relevant() / gates.classify(),
 * scores it with score.mjs at the `prior` provenance tier, and upserts into
 * kwstore. That is the whole "rebuild the backlog from seeds" path, and it is
 * what makes `rm keywords.sqlite && node import-seeds.mjs` a clean slate.
 *
 * Cluster headers (`# cluster: <name> | intent: <fallback>`) are honoured: a
 * line whose classify() returns no intent inherits its header's intent rather
 * than silently collapsing to informational.
 *
 * CLI
 *   node scripts/seo/import-seeds.mjs             # import
 *   node scripts/seo/import-seeds.mjs --dry       # parse + gate, write nothing
 *   node scripts/seo/import-seeds.mjs --json      # machine-readable summary
 *   node scripts/seo/import-seeds.mjs --verbose   # print every rejection
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as gates from './gates.mjs';
import { scoreRow } from './score.mjs';
import * as store from './kwstore.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SEEDS_PATH = path.join(HERE, 'seeds.txt');

/** Parse seeds.txt into [{ keyword, group, intent }] in file order. */
export function parseSeeds(file = SEEDS_PATH) {
  const raw = fs.readFileSync(file, 'utf8');
  const out = [];
  let group = null;
  let intent = null;
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    const header = t.match(/^#\s*cluster:\s*([^|]+?)\s*\|\s*intent:\s*([a-z-]+)\s*$/i);
    if (header) {
      group = header[1].trim().toLowerCase();
      intent = header[2].trim().toLowerCase();
      continue;
    }
    if (t.startsWith('#')) continue;
    out.push({ keyword: gates.normalize(t), group, intent });
  }
  return out;
}

/** Classify + score any row that has no content_type yet. Returns the count. */
function backfillUnclassified(db) {
  const rows = db
    .prepare("SELECT keyword FROM keywords WHERE content_type IS NULL OR content_type = ''")
    .all();
  store.withBatch(db, () => {
    for (const { keyword } of rows) {
      const cls = gates.classify(keyword) || {};
      const fields = {
        cluster: gates.clusterOf(keyword),
        content_type: cls.content_type,
        format: cls.format,
        intent: cls.intent || 'informational',
      };
      Object.assign(fields, scoreRow({ keyword, ...fields }));
      store.upsertKeyword(db, keyword, fields);
    }
  });
  return rows.length;
}

function main(argv) {
  const dry = argv.includes('--dry');
  const json = argv.includes('--json');
  const verbose = argv.includes('--verbose');

  const seeds = parseSeeds();
  const seen = new Set();
  const accepted = [];
  const rejected = [];
  const needsHuman = [];
  const dupes = [];

  for (const s of seeds) {
    if (!s.keyword) continue;
    if (seen.has(s.keyword)) { dupes.push(s.keyword); continue; }
    seen.add(s.keyword);

    const verdict = gates.relevant(s.keyword);
    if (verdict === 'reject') { rejected.push(s.keyword); continue; }

    const cls = gates.classify(s.keyword) || {};
    const fields = {
      cluster: gates.clusterOf(s.keyword),
      // The seeds.txt `# cluster:` header. kwstore's breadth bucket partitions
      // on this to get topical spread instead of ranking purely by score.
      topic: s.group ?? null,
      content_type: cls.content_type,
      format: cls.format,
      // classify() first, header fallback second — never a blind 'informational'.
      intent: cls.intent || s.intent || 'informational',
      source: 'seed',
      seed: s.keyword,
    };
    Object.assign(fields, scoreRow({ keyword: s.keyword, ...fields }));

    const rec = { keyword: s.keyword, group: s.group, verdict, ...fields };
    accepted.push(rec);
    if (verdict === 'needs-human') needsHuman.push(s.keyword);
  }

  let total = null;
  let restored = null;
  let backfilled = 0;
  if (!dry) {
    const db = store.openDb();
    try {
      // Replay decisions FIRST. Every mutating kwstore fn re-exports
      // backlog-state.json from the DB, so on a freshly deleted DB the very
      // first upsert would overwrite the state file with `{}` and destroy the
      // published/skipped history before anyone could run `kwstore rebuild`.
      restored = store.importState(db);

      store.withBatch(db, () => {
        for (const r of accepted) {
          const { keyword, group, verdict, ...fields } = r;
          store.upsertKeyword(db, keyword, fields);
          if (verdict === 'needs-human') {
            const cur = store.getKeyword(db, keyword);
            if (!cur || cur.status === 'discovered') {
              store.setStatus(db, keyword, 'needs-human', null, 'gates.relevant=needs-human');
            }
          }
        }
      });

      // importState() recreates rows for decisions whose keyword is no longer
      // a seed line, and those rows arrive with nothing but a keyword and a
      // status. Classify and score them too, or `report` prints a row of
      // dashes and stats counts it as "(unclassified)" forever.
      backfilled = backfillUnclassified(db);

      total = db.prepare('SELECT COUNT(*) AS n FROM keywords').get().n;
    } finally {
      db.close();
    }
  }

  const summary = {
    dry,
    seeds_read: seeds.length,
    unique: seen.size,
    duplicate_lines: dupes.length,
    accepted: accepted.length,
    needs_human: needsHuman.length,
    rejected: rejected.length,
    restored_decisions: restored?.restored ?? null,
    total_rows: total,
  };

  if (json) {
    console.log(JSON.stringify({ ...summary, rejected, dupes, keywords: accepted }, null, 2));
    return;
  }

  console.log(`import-seeds.mjs${dry ? ' --dry' : ''}`);
  console.log(`  seeds read      ${summary.seeds_read} (${summary.unique} unique, ${summary.duplicate_lines} duplicate line(s))`);
  console.log(`  gated           ${summary.accepted} accept (${summary.needs_human} needs-human), ${summary.rejected} reject`);
  if (verbose || rejected.length) {
    for (const r of rejected.slice(0, verbose ? Infinity : 20)) console.log(`    - reject: ${r}`);
    if (!verbose && rejected.length > 20) console.log(`    ... ${rejected.length - 20} more`);
  }
  for (const d of dupes) console.log(`    ~ duplicate line: ${d}`);
  if (!dry) console.log(`  state replay    ${summary.restored_decisions} decision(s) restored from backlog-state.json, ${backfilled} row(s) back-classified`);
  console.log(dry ? '  DRY RUN — nothing written' : `  total rows      ${summary.total_rows}`);
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) main(process.argv.slice(2));
