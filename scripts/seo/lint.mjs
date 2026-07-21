#!/usr/bin/env node
// Content law gate for the pSEO engine.
//
//   node scripts/seo/lint.mjs --all
//   node scripts/seo/lint.mjs --changed
//   node scripts/seo/lint.mjs --entry comparison/plausible
//   node scripts/seo/lint.mjs --baseline-init
//   node scripts/seo/lint.mjs --all --fix
//
// THE RATCHET. The existing 44-entry corpus fails most of these laws (every
// entry has em dashes, ~42 have no internalLinks, several metaDescriptions run
// long). A naive fail-hard gate would exit 1 on run one and the autopilot would
// never publish anything again — the single most likely way this dies. So
// scripts/seo/.lint-baseline.json records the known pre-existing violations with
// their occurrence COUNTS. Those are reported as "grandfathered" and do not
// fail. A law that starts failing on an entry that was clean, an occurrence
// count that GROWS, or any violation on a brand-new entry is a NEW violation and
// exits 1.
//
// Exit 0 clean / 1 on new violations.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { REPO, DIR } from './lib.mjs';
import {
  loadAll, loadEntry, contextFor, validPaths, entryFile, entryPath,
  parseEntrySource, TYPE_OF_DIR,
} from './entry-load.mjs';
import { runLaws, LAWS } from './laws.mjs';

const BASELINE = path.join(REPO, 'scripts', 'seo', '.lint-baseline.json');

const C = process.stdout.isTTY
  ? { red: s => `\x1b[31m${s}\x1b[0m`, yel: s => `\x1b[33m${s}\x1b[0m`, grn: s => `\x1b[32m${s}\x1b[0m`, dim: s => `\x1b[2m${s}\x1b[0m`, b: s => `\x1b[1m${s}\x1b[0m` }
  : { red: s => s, yel: s => s, grn: s => s, dim: s => s, b: s => s };

/* ------------------------------------------------------------------ */
/* args                                                                */
/* ------------------------------------------------------------------ */

function parseArgs(argv) {
  const a = { mode: null, entry: null, fix: false, verbose: false };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--all') a.mode = 'all';
    else if (t === '--changed') a.mode = 'changed';
    else if (t === '--baseline-init') a.mode = 'baseline-init';
    else if (t === '--entry') {
      a.mode = 'entry';
      a.entry = argv[++i];
    } else if (t.startsWith('--entry=')) {
      a.mode = 'entry';
      a.entry = t.slice(8);
    } else if (t === '--fix') a.fix = true;
    else if (t === '-v' || t === '--verbose') a.verbose = true;
    else if (t === '-h' || t === '--help') a.mode = 'help';
    else {
      console.error(`unknown argument: ${t}`);
      process.exit(2);
    }
  }
  if (!a.mode) a.mode = 'all';
  return a;
}

const USAGE = `content law gate — scripts/seo/lint.mjs

  --all               check every entry (default)
  --changed           check entries touched vs HEAD (staged, unstaged, untracked)
  --entry <type>/<slug>   check one entry, e.g. --entry comparison/plausible
  --baseline-init     record the current violations as grandfathered
  --fix               auto-fix em/en dashes in the selected entry files
  -v, --verbose       also list grandfathered violations

exit 0 = clean · exit 1 = new violations
`;

/* ------------------------------------------------------------------ */
/* selection                                                           */
/* ------------------------------------------------------------------ */

function changedRecords(all) {
  let out = '';
  const run = args => {
    try {
      return execFileSync('git', args, { cwd: REPO, encoding: 'utf8' });
    } catch {
      return '';
    }
  };
  out += run(['diff', '--name-only', 'HEAD', '--', 'src/content']);
  out += run(['diff', '--name-only', '--cached', 'HEAD', '--', 'src/content']);
  out += run(['ls-files', '--others', '--exclude-standard', '--', 'src/content']);

  const keys = new Set();
  for (const line of out.split('\n')) {
    const m = /^src\/content\/([^/]+)\/([^/]+)\.ts$/.exec(line.trim());
    if (!m) continue;
    const type = TYPE_OF_DIR[m[1]];
    if (type) keys.add(`${type}/${m[2]}`);
  }
  return all.filter(r => keys.has(r.key));
}

function selectRecords(args) {
  const all = loadAll();
  if (args.mode === 'entry') {
    const spec = String(args.entry || '');
    const [type, ...rest] = spec.split('/');
    const slug = rest.join('/');
    if (!DIR[type] || !slug) {
      console.error(`--entry expects <type>/<slug>, got "${spec}". types: ${Object.keys(DIR).join(', ')}`);
      process.exit(2);
    }
    let rec = all.find(r => r.key === `${type}/${slug}`);
    if (!rec) {
      // Not in the live corpus — try loading it directly, which picks up
      // src/content/_drafts/<dir>/<slug>.ts via entryFile().
      //
      // loadAll() deliberately scans only the live directories: drafts are not
      // part of the corpus and must not appear in --all counts or the baseline.
      // But --entry is exactly how the routine gates a page it just wrote in
      // review mode, and without this the gate silently could not see it. The
      // previous behaviour pushed the routine into staging a temp copy in the
      // live directory, which then survived as an orphan that the next
      // regenerateIndex() would sweep into the registry and publish unreviewed.
      const file = entryFile(type, slug);
      if (!fs.existsSync(file)) {
        console.error(`no entry ${type}/${slug} (looked for ${path.relative(REPO, file)})`);
        process.exit(2);
      }
      rec = {
        type,
        slug,
        file,
        relFile: path.relative(REPO, file),
        key: `${type}/${slug}`,
        path: entryPath(type, slug),
        entry: parseEntrySource(fs.readFileSync(file, 'utf8'), `${type}/${slug}`),
        isDraft: true,
      };
      console.log(`(draft) ${rec.relFile}`);
    }
    return [rec];
  }
  if (args.mode === 'changed') return changedRecords(all);
  return all;
}

/* ------------------------------------------------------------------ */
/* baseline                                                            */
/* ------------------------------------------------------------------ */

function readBaseline() {
  if (!fs.existsSync(BASELINE)) return null;
  try {
    const j = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
    return j && typeof j === 'object' ? j : null;
  } catch (err) {
    console.error(`could not read ${path.relative(REPO, BASELINE)}: ${err.message}`);
    process.exit(2);
  }
}

function writeBaseline(records) {
  const paths = validPaths();
  const violations = {};
  let total = 0;
  const byLaw = {};
  for (const rec of records) {
    const found = runLaws(rec, contextFor(rec, { validPaths: paths }));
    if (!found.length) continue;
    violations[rec.key] = {};
    for (const v of found.sort((a, b) => a.law.localeCompare(b.law))) {
      violations[rec.key][v.law] = v.count;
      byLaw[v.law] = (byLaw[v.law] || 0) + 1;
      total++;
    }
  }
  const doc = {
    version: 1,
    note:
      'Grandfathered pre-existing law violations. Generated by `node scripts/seo/lint.mjs --baseline-init`. ' +
      'Values are occurrence counts: a violation only fails the gate if its law is absent here or its count grew. ' +
      'Commit this file. Shrink it over time; never regenerate it to hide a regression.',
    generatedAt: new Date().toISOString().slice(0, 10),
    entriesScanned: records.length,
    entriesWithViolations: Object.keys(violations).length,
    totalViolations: total,
    byLaw: Object.fromEntries(Object.entries(byLaw).sort((a, b) => b[1] - a[1])),
    violations: Object.fromEntries(Object.entries(violations).sort((a, b) => a[0].localeCompare(b[0]))),
  };
  fs.writeFileSync(BASELINE, JSON.stringify(doc, null, 2) + '\n');
  return doc;
}

/* ------------------------------------------------------------------ */
/* --fix (em/en dashes only)                                           */
/* ------------------------------------------------------------------ */

function fixDashes(records) {
  let filesChanged = 0;
  let replaced = 0;
  for (const rec of records) {
    const src = fs.readFileSync(rec.file, 'utf8');
    const n = (src.match(/[—–]/g) || []).length;
    if (!n) continue;
    // ' — ' -> ' - ', 'word—word' -> 'word - word', '10–20' -> '10 - 20'.
    const out = src
      .replace(/\s*[—–]\s*/g, ' - ')
      .replace(/ {2,}/g, ' ');
    if (out === src) continue;
    fs.writeFileSync(rec.file, out);
    filesChanged++;
    replaced += n;
    console.log(`${C.grn('FIXED')} ${rec.key}: ${n} em/en dash${n === 1 ? '' : 'es'} -> " - "  (${rec.relFile})`);
  }
  console.log(filesChanged ? `\n--fix rewrote ${filesChanged} file(s), ${replaced} dash(es).\n` : 'no em/en dashes to fix.\n');
  return filesChanged;
}

/* ------------------------------------------------------------------ */
/* main                                                                */
/* ------------------------------------------------------------------ */

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.mode === 'help') {
    console.log(USAGE);
    return 0;
  }

  if (args.mode === 'baseline-init') {
    const doc = writeBaseline(loadAll());
    console.log(`wrote ${path.relative(REPO, BASELINE)}`);
    console.log(
      `  ${doc.entriesScanned} entries scanned · ${doc.entriesWithViolations} with violations · ${doc.totalViolations} grandfathered violations`,
    );
    for (const [law, n] of Object.entries(doc.byLaw)) console.log(`    ${String(n).padStart(3)}  ${law}`);
    return 0;
  }

  let records = selectRecords(args);

  if (args.fix) {
    if (fixDashes(records)) records = selectRecords(args); // reload after rewrite
  }

  if (!records.length) {
    console.log('no entries selected — nothing to check.');
    return 0;
  }

  const baseline = readBaseline();
  const base = baseline?.violations || {};
  if (!baseline) {
    console.log(
      C.yel(
        `note: no ${path.relative(REPO, BASELINE)} — every violation counts as NEW. Run --baseline-init once to grandfather the existing corpus.`,
      ) + '\n',
    );
  }

  const paths = validPaths();
  const newV = [];
  const grandfathered = [];
  const improved = [];
  let cleanEntries = 0;

  for (const rec of records) {
    const found = runLaws(rec, contextFor(rec, { validPaths: paths }));
    const known = base[rec.key] || {};
    if (!found.length) cleanEntries++;
    for (const v of found) {
      const allowed = known[v.law];
      if (allowed === undefined) newV.push({ ...rec, ...v, reason: 'law not in baseline for this entry' });
      else if (v.count > allowed) newV.push({ ...rec, ...v, reason: `occurrences grew ${allowed} -> ${v.count}` });
      else {
        grandfathered.push({ ...rec, ...v });
        if (v.count < allowed) improved.push({ key: rec.key, law: v.law, from: allowed, to: v.count });
      }
    }
    // A baselined violation that is now fully fixed.
    for (const law of Object.keys(known)) {
      if (!found.some(v => v.law === law)) improved.push({ key: rec.key, law, from: known[law], to: 0 });
    }
  }

  /* report */
  console.log(C.b(`content law gate — ${records.length} entr${records.length === 1 ? 'y' : 'ies'}, ${LAWS.length} laws`));
  console.log('');

  if (args.verbose && grandfathered.length) {
    for (const v of grandfathered.sort((a, b) => a.key.localeCompare(b.key) || a.law.localeCompare(b.law))) {
      console.log(C.dim(`GRANDFATHERED ${v.key}: ${v.law} — ${v.message}`));
    }
    console.log('');
  }

  for (const v of newV.sort((a, b) => a.key.localeCompare(b.key) || a.law.localeCompare(b.law))) {
    console.log(`${C.red('LAW FAIL')} ${v.key}: ${v.law} — ${v.message}`);
    console.log(C.dim(`         ${v.relFile} · ${v.reason}`));
  }
  if (newV.length) console.log('');

  const gfByLaw = {};
  for (const v of grandfathered) gfByLaw[v.law] = (gfByLaw[v.law] || 0) + 1;

  console.log(
    `${C.grn(String(cleanEntries))} clean · ${C.yel(String(grandfathered.length))} grandfathered · ${
      newV.length ? C.red(String(newV.length)) : C.grn('0')
    } new violation${newV.length === 1 ? '' : 's'}`,
  );

  if (!args.verbose && grandfathered.length) {
    const top = Object.entries(gfByLaw).sort((a, b) => b[1] - a[1]);
    console.log(C.dim(`  grandfathered by law: ${top.map(([l, n]) => `${l}=${n}`).join(' ')}  (-v to list)`));
  }

  if (improved.length) {
    console.log(
      C.grn(`  ${improved.length} baselined violation(s) improved — re-run --baseline-init to tighten the ratchet.`),
    );
  }

  if (newV.length) {
    console.log('');
    console.log(C.red(`FAIL: ${newV.length} new violation(s).`));
    return 1;
  }
  console.log(C.grn('PASS'));
  return 0;
}

process.exit(main());
