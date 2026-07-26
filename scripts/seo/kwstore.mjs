#!/usr/bin/env node
// scripts/seo/kwstore.mjs — the keyword backlog.
//
// The SQLite file (scripts/seo/keywords.sqlite) is a REBUILDABLE cache: volumes,
// scores and SERP snapshots can all be re-fetched. The only irreplaceable thing in
// here is the set of DECISIONS we made — what we published, what we skipped and why.
// Those are mirrored to scripts/seo/backlog-state.json on every mutation so they
// live in git and survive the DB being deleted (`rebuild` replays them back in).
//
// Zero dependencies: node:sqlite (DatabaseSync), built into Node >= 22.5.
//
// CLI:
//   node scripts/seo/kwstore.mjs report
//   node scripts/seo/kwstore.mjs pick <bucket> [n]
//   node scripts/seo/kwstore.mjs brief "<keyword>"
//   node scripts/seo/kwstore.mjs published "<keyword>" "<slug>"
//   node scripts/seo/kwstore.mjs covered   "<keyword>" "<slug>"
//   node scripts/seo/kwstore.mjs skip      "<keyword>" "<reason>"
//   node scripts/seo/kwstore.mjs prioritize "<keyword>"
//   node scripts/seo/kwstore.mjs stats
//   node scripts/seo/kwstore.mjs rebuild
//   node scripts/seo/kwstore.mjs reconcile

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// node:sqlite emits an ExperimentalWarning on import. Swallow that ONE warning so
// CLI output stays readable; every other warning is re-emitted untouched.
{
  const listeners = process.listeners('warning');
  process.removeAllListeners('warning');
  process.on('warning', w => {
    if (w.name === 'ExperimentalWarning' && /SQLite/i.test(w.message)) return;
    for (const l of listeners) l(w);
  });
}
const { DatabaseSync } = await import('node:sqlite');

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const DB_PATH = path.join(HERE, 'keywords.sqlite');
export const STATE_PATH = path.join(HERE, 'backlog-state.json');

// ---------------------------------------------------------------------------
// gates.mjs is owned by another agent and may not exist yet. Use it when present
// (it is canonical), otherwise fall back to the contract's documented behaviour.
// ---------------------------------------------------------------------------
const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'best', 'but', 'by', 'can', 'do', 'does',
  'for', 'from', 'how', 'in', 'is', 'it', 'of', 'on', 'or', 'that', 'the', 'this',
  'to', 'top', 'vs', 'was', 'what', 'when', 'where', 'which', 'who', 'why', 'will', 'with', 'your',
]);

let gates = null;
try {
  gates = await import('./gates.mjs');
} catch {
  gates = null;
}

export const normalize =
  gates?.normalize ?? (kw => String(kw ?? '').trim().toLowerCase().replace(/\s+/g, ' '));

export const clusterOf =
  gates?.clusterOf ??
  (kw => {
    const toks = normalize(kw)
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/[\s-]+/)
      .filter(t => t && !STOPWORDS.has(t));
    return (toks.length ? [...new Set(toks)].sort() : [normalize(kw)]).join('-');
  });

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
export const STATUSES = ['discovered', 'queued', 'published', 'skipped', 'needs-human', 'covered'];
const DONE = ['published', 'covered']; // clusters in these states block their whole cluster

// Nullable columns that participate in the COALESCE upsert. Order matters: the
// INSERT column list, the INSERT params and the DO UPDATE params are all derived
// from this one array so they can never drift apart.
const UPSERT_COLS = [
  'seed', 'cluster', 'topic', 'content_type', 'format', 'intent',
  'search_volume', 'keyword_difficulty', 'competition', 'cpc',
  'demand', 'opportunity', 'value', 'fit', 'score',
  'slug', 'source', 'notes', 'published_at',
];

// Every column we hand back to callers (explicitly listed so window helpers like
// ROW_NUMBER never leak into a Row).
const ROW_COLS = ['keyword', ...UPSERT_COLS, 'status', 'created_at', 'updated_at'];
const SEL = ROW_COLS.map(c => `"${c}"`).join(', ');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS keywords (
  keyword            TEXT PRIMARY KEY,
  seed               TEXT,
  cluster            TEXT NOT NULL DEFAULT '',
  -- The seeds.txt "# cluster:" header this row came from ("geo-ai-citation",
  -- "funnel-dropoff-diagnosis", ...). The cluster column is a per-keyword token
  -- signature and is therefore almost 1:1 with rows (543 clusters / 545 rows),
  -- so it cannot express topical spread. topic can, and the breadth bucket
  -- partitions on it.
  topic              TEXT,
  content_type       TEXT,
  format             TEXT,
  intent             TEXT,
  search_volume      INTEGER,
  keyword_difficulty REAL,
  competition        REAL,
  cpc                REAL,
  demand             REAL,
  opportunity        REAL,
  "value"            REAL,
  fit                REAL,
  score              REAL,
  status             TEXT NOT NULL DEFAULT 'discovered',
  slug               TEXT,
  source             TEXT,
  notes              TEXT,
  reason             TEXT,
  published_at       TEXT,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_keywords_status  ON keywords(status);
CREATE INDEX IF NOT EXISTS idx_keywords_cluster ON keywords(cluster);
CREATE INDEX IF NOT EXISTS idx_keywords_score   ON keywords(score DESC);
CREATE INDEX IF NOT EXISTS idx_keywords_pick    ON keywords(status, cluster, score DESC);

CREATE TABLE IF NOT EXISTS serp_data (
  keyword      TEXT PRIMARY KEY,
  organic_json TEXT,
  paa_json     TEXT,
  source       TEXT,
  fetched_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS generation_log (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword TEXT NOT NULL,
  slug    TEXT,
  passed  INTEGER NOT NULL DEFAULT 0,
  at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_genlog_keyword ON generation_log(keyword);

CREATE TABLE IF NOT EXISTS gsc_metrics (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  page        TEXT NOT NULL,
  keyword     TEXT NOT NULL,
  impressions INTEGER,
  clicks      INTEGER,
  position    REAL,
  ctr         REAL,
  date        TEXT NOT NULL,
  UNIQUE(page, keyword, date)
);
CREATE INDEX IF NOT EXISTS idx_gsc_keyword ON gsc_metrics(keyword);
CREATE INDEX IF NOT EXISTS idx_gsc_date    ON gsc_metrics(date);

CREATE TABLE IF NOT EXISTS actions (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword TEXT,
  action  TEXT NOT NULL,
  applied INTEGER NOT NULL DEFAULT 0,
  at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_actions_applied ON actions(applied);
`;

const nowISO = () => new Date().toISOString();

/** Open (and bootstrap) the backlog DB. Idempotent — safe to call on every run. */
export function openDb(file = DB_PATH) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA busy_timeout = 30000');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(SCHEMA);
  // Idempotent migration for DBs created before `reason` was split out of
  // `notes`. CREATE TABLE IF NOT EXISTS will not add a column to an existing
  // table, so an already-seeded backlog would keep failing on setStatus.
  const cols = db.prepare('PRAGMA table_info(keywords)').all().map(c => c.name);
  if (!cols.includes('reason')) db.exec('ALTER TABLE keywords ADD COLUMN reason TEXT');
  if (!cols.includes('topic')) db.exec('ALTER TABLE keywords ADD COLUMN topic TEXT');
  return db;
}

// ---------------------------------------------------------------------------
// Batching: the contract says every mutating fn calls exportState(). Bulk
// discovery of a few hundred keywords would otherwise rewrite the JSON a few
// hundred times, so withBatch() defers to a single write at the end. Default
// behaviour (no batch) is exactly the contract.
// ---------------------------------------------------------------------------
let deferDepth = 0;
let deferDirty = false;

export function withBatch(db, fn) {
  deferDepth++;
  try {
    return fn();
  } finally {
    deferDepth--;
    if (deferDepth === 0 && deferDirty) {
      deferDirty = false;
      exportState(db);
    }
  }
}

function touchState(db) {
  if (deferDepth > 0) {
    deferDirty = true;
    return;
  }
  exportState(db);
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

// Numeric coercion that keeps null as null (so COALESCE can do its job) and
// refuses NaN — a NaN score silently poisons every ORDER BY downstream.
const num = v => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const str = v => (v === null || v === undefined ? null : String(v));

const COERCE = {
  search_volume: v => (num(v) === null ? null : Math.round(num(v))),
  keyword_difficulty: num, competition: num, cpc: num,
  demand: num, opportunity: num, value: num, fit: num, score: num,
};

const UPSERT_SQL = `
INSERT INTO keywords (keyword, ${UPSERT_COLS.map(c => `"${c}"`).join(', ')}, status, created_at, updated_at)
VALUES (?, ${UPSERT_COLS.map(() => '?').join(', ')}, 'discovered', ?, ?)
ON CONFLICT(keyword) DO UPDATE SET
  ${UPSERT_COLS.map(c => `"${c}" = COALESCE(?, keywords."${c}")`).join(',\n  ')},
  updated_at = ?
`;
// NOTE: `status` appears ONLY in the INSERT branch. An upsert can never move a
// keyword out of a decision we already made — that is setStatus()'s job alone.

/**
 * COALESCE upsert. Non-null fields overwrite, null/omitted fields never clobber
 * what is already stored, and status is never touched.
 */
export function upsertKeyword(db, keyword, fields = {}) {
  const kw = normalize(keyword);
  if (!kw) throw new Error('upsertKeyword: empty keyword');
  const ts = nowISO();

  const given = c => {
    const raw = Object.hasOwn(fields, c) ? fields[c] : null;
    const v = (COERCE[c] ?? str)(raw);
    return v === undefined ? null : v;
  };

  // cluster is derived from the keyword, so a fresh row always gets one; an
  // explicit cluster only overwrites when the caller actually passed one.
  const insertVals = UPSERT_COLS.map(c => (c === 'cluster' ? given(c) ?? clusterOf(kw) : given(c)));
  const updateVals = UPSERT_COLS.map(c => given(c));

  db.prepare(UPSERT_SQL).run(kw, ...insertVals, ts, ts, ...updateVals, ts);
  touchState(db);
}

/** Move a keyword to a new status. The ONLY thing that writes `status`. */
export function setStatus(db, keyword, status, slug = null, reason = null) {
  const kw = normalize(keyword);
  if (!STATUSES.includes(status)) {
    throw new Error(`setStatus: unknown status "${status}" (expected one of ${STATUSES.join(', ')})`);
  }
  const ts = nowISO();
  // `reason` goes to its OWN column, never to `notes`. `notes` holds the
  // harvest evidence JSON that score.mjs reads to compute demand — writing a
  // human reason there silently destroys the scoring input for that row.
  const info = db
    .prepare(
      `UPDATE keywords SET
         status       = ?,
         slug         = COALESCE(?, slug),
         reason       = COALESCE(?, reason),
         published_at = CASE WHEN ? IN ('published','covered') THEN COALESCE(published_at, ?) ELSE published_at END,
         updated_at   = ?
       WHERE keyword = ?`
    )
    .run(status, str(slug), str(reason), status, ts, ts, kw);

  if (info.changes === 0) throw new Error(`setStatus: no such keyword "${kw}"`);
  db.prepare('INSERT INTO actions (keyword, action, applied, at) VALUES (?, ?, 1, ?)')
    .run(kw, `status:${status}${reason ? ` (${reason})` : ''}`, ts);
  touchState(db);
}

/** A page already covers this keyword (didn't write it for this keyword). */
export function markCovered(db, keyword, slug) {
  setStatus(db, keyword, 'covered', slug, null);
}

export function logGeneration(db, keyword, slug, passed) {
  db.prepare('INSERT INTO generation_log (keyword, slug, passed, at) VALUES (?, ?, ?, ?)')
    .run(normalize(keyword), str(slug), passed ? 1 : 0, nowISO());
}

export function recordSerp(db, keyword, { organic, paa, source } = {}) {
  const kw = normalize(keyword);
  db.prepare(
    `INSERT INTO serp_data (keyword, organic_json, paa_json, source, fetched_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(keyword) DO UPDATE SET
       organic_json = COALESCE(excluded.organic_json, serp_data.organic_json),
       paa_json     = COALESCE(excluded.paa_json,     serp_data.paa_json),
       source       = COALESCE(excluded.source,       serp_data.source),
       fetched_at   = excluded.fetched_at`
  ).run(
    kw,
    organic == null ? null : JSON.stringify(organic),
    paa == null ? null : JSON.stringify(paa),
    str(source),
    nowISO()
  );
  touchState(db);
}

export function getSerp(db, keyword) {
  const r = db.prepare('SELECT * FROM serp_data WHERE keyword = ?').get(normalize(keyword));
  if (!r) return null;
  const parse = j => {
    if (!j) return null;
    try { return JSON.parse(j); } catch { return null; }
  };
  return { organic: parse(r.organic_json), paa: parse(r.paa_json), source: r.source, fetched_at: r.fetched_at };
}

export function recordGsc(db, { page, keyword, impressions, clicks, position, ctr, date }) {
  db.prepare(
    `INSERT INTO gsc_metrics (page, keyword, impressions, clicks, position, ctr, date)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(page, keyword, date) DO UPDATE SET
       impressions = excluded.impressions,
       clicks      = excluded.clicks,
       position    = excluded.position,
       ctr         = excluded.ctr`
  ).run(str(page), normalize(keyword), num(impressions), num(clicks), num(position), num(ctr), str(date));
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

// Bucket = (extra WHERE, ORDER BY). The ORDER BY is used BOTH for picking the
// cluster representative (ROW_NUMBER) and for ranking the final result, so the
// row you get back is genuinely the best row in its cluster for that bucket.
//
// SQLite sorts NULL as the smallest value, so `score DESC` already puts
// unscored rows last — no NULLS LAST clause needed (and none supported here).
const BUCKETS = {
  money: {
    where: `intent IN ('commercial','transactional')`,
    order: `score DESC, search_volume DESC, keyword ASC`,
  },
  // Breadth means TOPICAL spread, so it partitions on `topic` (the seeds.txt
  // cluster header) instead of `cluster`. Partitioning on `cluster` made this
  // bucket a strict duplicate of `money`: cluster is a per-keyword token
  // signature, so ROW_NUMBER never actually deduped anything and the result
  // collapsed to a global `ORDER BY score DESC`. Intent boost is a hard ceiling
  // (commercial x1.3 vs informational x1.0), so all 74 commercial rows outrank
  // all 469 informational ones and no masterclass topic could ever surface.
  breadth: {
    where: `1=1`,
    partition: `COALESCE(NULLIF(topic, ''), cluster)`,
    order: `score DESC, search_volume DESC, keyword ASC`,
  },
  // Deliberately NO volume floor anywhere in this file: NULL-volume long tails
  // are the whole point of the explore bucket.
  explore: {
    where: `(score IS NULL OR search_volume IS NULL OR keyword_difficulty IS NULL)`,
    order: `demand DESC, RANDOM()`,
  },
};

/**
 * Every cluster a live page already serves, plus every cluster that CONTAINS
 * one.
 *
 * `cluster` is a sorted token signature, so equality only ever catches an exact
 * rephrasing. "hotjar pricing plans" signs as hotjar+plans+pricing, which is not
 * equal to the already-covered hotjar+pricing, so the row kept being offered
 * even though the page answering it is live — 113 queued rows were strict
 * supersets of a covered cluster by that test. Containment is the honest
 * relation: if everything the covered page is about is also in this keyword,
 * the keyword is that page plus a modifier, not a second page.
 *
 * Computed in JS, not SQL: a token-set subset test over a delimiter-joined
 * signature has no honest SQL expression, and the whole table is ~550 rows.
 */
export function blockedClusters(db) {
  // gates.clusterOf joins with '+', the fallback with '-', and the empty-token
  // fallback returns the raw phrase with spaces. Split on all three.
  const toks = c => String(c || '').split(/[+\-\s]+/).filter(Boolean);

  const done = db
    .prepare(
      `SELECT DISTINCT cluster FROM keywords
       WHERE status IN (${DONE.map(() => '?').join(',')}) AND cluster <> ''`
    )
    .all(...DONE)
    .map(r => r.cluster);

  const exact = new Set(done);
  // Containment only applies from TWO tokens up. A one-token cluster is a topic,
  // not a page: /glossary/heatmap signs as {heatmap}, and letting that contain
  // its way outward would retire every heatmap keyword in the backlog on the
  // strength of one definition page. Single-token clusters still block their own
  // exact rephrasings, which is all they ever legitimately covered.
  const multi = done.map(toks).filter(t => t.length >= 2);

  const open = db
    .prepare(`SELECT DISTINCT cluster FROM keywords WHERE status = 'discovered' AND cluster <> ''`)
    .all()
    .map(r => r.cluster);

  const blocked = [];
  for (const c of open) {
    if (exact.has(c)) {
      blocked.push(c);
      continue;
    }
    const have = new Set(toks(c));
    if (multi.some(d => d.every(t => have.has(t)))) blocked.push(c);
  }
  return blocked;
}

/**
 * Next keywords to write. status='discovered' only, one row per cluster, and any
 * cluster already served by a published/covered page — or containing one — is
 * excluded outright. `refresh` is the documented exception: it returns
 * already-published rows, oldest first, for a content refresh pass.
 */
export function pickNext(db, { bucket = 'money', n = 2 } = {}) {
  const limit = Math.max(1, Number(n) || 1);

  if (bucket === 'refresh') {
    return db
      .prepare(
        `SELECT ${SEL} FROM keywords
         WHERE status = 'published'
         ORDER BY COALESCE(published_at, updated_at) ASC
         LIMIT ?`
      )
      .all(limit);
  }

  const b = BUCKETS[bucket];
  if (!b) throw new Error(`pickNext: unknown bucket "${bucket}" (expected ${Object.keys(BUCKETS).join('|')}|refresh)`);

  // Materialized into a temp table rather than bound into a NOT IN list: the
  // blocked set runs to a few hundred clusters and would collide with SQLite's
  // bound-parameter ceiling. TEMP is per-connection, so this never touches the
  // committed DB file.
  db.exec('CREATE TEMP TABLE IF NOT EXISTS blocked_cluster (cluster TEXT PRIMARY KEY)');
  db.exec('DELETE FROM blocked_cluster');
  const ins = db.prepare('INSERT OR IGNORE INTO blocked_cluster (cluster) VALUES (?)');
  for (const c of blockedClusters(db)) ins.run(c);

  return db
    .prepare(
      `WITH cand AS (
         SELECT ${SEL},
                ROW_NUMBER() OVER (PARTITION BY ${b.partition ?? 'cluster'} ORDER BY ${b.order}) AS rn
         FROM keywords k
         WHERE status = 'discovered'
           AND (${b.where})
           AND NOT EXISTS (SELECT 1 FROM blocked_cluster x WHERE x.cluster = k.cluster)
       )
       SELECT ${SEL} FROM cand WHERE rn = 1
       ORDER BY ${b.order}
       LIMIT ?`
    )
    .all(limit);
}

const WHERE_COLS = ['status', 'cluster', 'content_type', 'format', 'intent', 'source', 'seed', 'slug'];

export function allKeywords(db, where = {}) {
  const clauses = [];
  const params = [];
  for (const [k, v] of Object.entries(where)) {
    if (k === 'limit') continue;
    if (!WHERE_COLS.includes(k)) throw new Error(`allKeywords: cannot filter on "${k}"`);
    if (Array.isArray(v)) {
      if (!v.length) return [];
      clauses.push(`"${k}" IN (${v.map(() => '?').join(',')})`);
      params.push(...v.map(str));
    } else {
      clauses.push(`"${k}" = ?`);
      params.push(str(v));
    }
  }
  const sql =
    `SELECT ${SEL} FROM keywords` +
    (clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '') +
    ` ORDER BY score DESC, keyword ASC` +
    (where.limit ? ` LIMIT ${Math.max(1, Number(where.limit) | 0)}` : '');
  return db.prepare(sql).all(...params);
}

export function getKeyword(db, keyword) {
  return db.prepare(`SELECT ${SEL} FROM keywords WHERE keyword = ?`).get(normalize(keyword)) ?? null;
}

export function stats(db) {
  const one = (sql, ...p) => db.prepare(sql).get(...p);
  const byStatus = {};
  for (const r of db.prepare('SELECT status, COUNT(*) n FROM keywords GROUP BY status ORDER BY n DESC').all()) {
    byStatus[r.status] = r.n;
  }
  const byType = {};
  for (const r of db
    .prepare(`SELECT COALESCE(content_type,'(unclassified)') t, COUNT(*) n FROM keywords GROUP BY t ORDER BY n DESC`)
    .all()) {
    byType[r.t] = r.n;
  }
  return {
    total: one('SELECT COUNT(*) n FROM keywords').n,
    by_status: byStatus,
    by_content_type: byType,
    clusters: one('SELECT COUNT(DISTINCT cluster) n FROM keywords').n,
    clusters_done: one(
      `SELECT COUNT(DISTINCT cluster) n FROM keywords WHERE status IN (${DONE.map(() => '?').join(',')})`,
      ...DONE
    ).n,
    ready: one(`SELECT COUNT(*) n FROM keywords WHERE status = 'discovered'`).n,
    scored: one('SELECT COUNT(*) n FROM keywords WHERE score IS NOT NULL').n,
    with_volume: one('SELECT COUNT(*) n FROM keywords WHERE search_volume IS NOT NULL').n,
    serp_cached: one('SELECT COUNT(*) n FROM serp_data').n,
    generations: one('SELECT COUNT(*) n FROM generation_log').n,
    gsc_rows: one('SELECT COUNT(*) n FROM gsc_metrics').n,
    db: path.relative(process.cwd(), DB_PATH),
  };
}

// ---------------------------------------------------------------------------
// State mirror (git-authoritative)
// ---------------------------------------------------------------------------

/**
 * Write scripts/seo/backlog-state.json — ONLY the decisions. `discovered` rows
 * are omitted: they are re-discoverable noise, and including them would churn
 * the diff on every crawl. Keys are sorted and fields emitted in a fixed order
 * so a git diff shows exactly what changed about which keyword.
 */
export function exportState(db, file = STATE_PATH) {
  // `reason` has to be SELECTed to be exported. It used to select `notes`
  // instead and read `r.reason` off the row, so every skip/covered reason was
  // silently dropped on the way to git — the one field the diff exists to show.
  const rows = db
    .prepare(
      `SELECT keyword, status, slug, reason, published_at
       FROM keywords
       WHERE status <> 'discovered'
       ORDER BY keyword ASC`
    )
    .all();

  const keywords = {};
  for (const r of rows) {
    const o = { status: r.status };
    if (r.slug) o.slug = r.slug;
    if (r.reason) o.reason = r.reason;
    if (r.published_at) o.published_at = r.published_at;
    keywords[r.keyword] = o;
  }

  const json = JSON.stringify({ keywords }, null, 2) + '\n';
  // Skip the write when nothing changed, so mtime churn doesn't show up as a
  // dirty working tree after a read-only run.
  try {
    if (fs.readFileSync(file, 'utf8') === json) return;
  } catch { /* not written yet */ }
  fs.writeFileSync(file, json);
}

/**
 * Recompute every stored cluster with the CURRENT clusterOf.
 *
 * cluster is denormalized into the row (pickNext partitions on it), so if
 * gates.mjs lands — or changes its tokenizer — rows written under the old
 * implementation keep a stale signature and the de-dup silently stops working.
 * Run this after any clusterOf change; it is a no-op when nothing moves.
 */
export function recluster(db) {
  const rows = db.prepare('SELECT keyword, cluster FROM keywords').all();
  const moved = [];
  withBatch(db, () => {
    for (const r of rows) {
      const next = clusterOf(r.keyword);
      if (next === r.cluster) continue;
      db.prepare('UPDATE keywords SET cluster = ?, updated_at = ? WHERE keyword = ?').run(next, nowISO(), r.keyword);
      moved.push({ keyword: r.keyword, from: r.cluster, to: next });
    }
  });
  return moved;
}

/**
 * Upsert a `covered` row for every page that exists on disk.
 *
 * The backlog only learns a page exists when a routine remembers to call
 * `published`. Anything written before the backlog existed, by a human, or by a
 * run that died between write.mjs and the RECORD step is invisible to it — 36 of
 * the 68 live pages were in exactly that state, which left pickNext free to
 * offer keywords the site already answers. Disk is the only source of truth
 * about what is published, so this closes the loop from disk.
 *
 * The keyword is reconstructed from the slug plus the type, because entries
 * carry no primaryKeyword field and the slug alone is not the query:
 * /alternatives/hotjar answers "hotjar alternatives", not the bare head term
 * "hotjar". Recording the head term would mark a one-word cluster covered and
 * quietly retire every hotjar keyword in the backlog.
 *
 * Rows already published or covered are left untouched — a real `published` row
 * must never be downgraded to `covered`.
 */
const KEYWORD_SHAPE = {
  comparison: s => `conclick vs ${s}`,
  alternative: s => `${s} alternatives`,
  glossary: s => `what is ${s}`,
  useCase: s => `analytics for ${s}`,
};

export async function reconcileFromDisk(db) {
  // Lazy: entry-load pulls in lib.mjs and reads the whole content tree, which
  // every other kwstore command would pay for and none of them needs.
  const { loadAll } = await import('./entry-load.mjs');
  const entries = loadAll();

  // Deliberately keyed on the derived KEYWORD, not on the stored slug. Stored
  // slugs are inconsistent ("alternatives/hotjar", "vs/clarity", bare
  // "cookieless-heatmap-tool"), and matching them loosely collapses
  // /vs/google-analytics into /alternatives/google-analytics — two real pages,
  // one skipped. A second covered row for a page that already has one is
  // harmless; a page the backlog never learns about is the bug this fixes.
  const added = [];
  let alreadyTracked = 0;
  withBatch(db, () => {
    for (const e of entries) {
      const words = e.slug.replace(/-/g, ' ');
      const kw = normalize((KEYWORD_SHAPE[e.type] ?? (s => s))(words));
      const row = getKeyword(db, kw);
      if (row && DONE.includes(row.status)) {
        alreadyTracked++;
        continue;
      }
      if (!row) upsertKeyword(db, kw, { content_type: e.type, source: 'reconcile' });
      setStatus(db, kw, 'covered', e.slug, `live page ${e.path}`);
      added.push({ key: e.key, keyword: kw, path: e.path, created: !row });
    }
  });
  return { scanned: entries.length, added, alreadyTracked };
}

/** Replay backlog-state.json into the DB — recovers decisions after a DB wipe. */
export function importState(db, file = STATE_PATH) {
  if (!fs.existsSync(file)) return { restored: 0, created: 0 };
  const { keywords = {} } = JSON.parse(fs.readFileSync(file, 'utf8'));
  let restored = 0;
  let created = 0;
  withBatch(db, () => {
    for (const [kw, d] of Object.entries(keywords)) {
      if (!getKeyword(db, kw)) {
        upsertKeyword(db, kw, { source: 'backlog-state.json' });
        created++;
      }
      // reason -> the `reason` column. Replaying it into `notes` (which is what
      // this did) overwrites the harvest evidence JSON score.mjs reads, so a
      // rebuild used to destroy the demand input for every decided keyword.
      db.prepare(
        `UPDATE keywords SET status = ?, slug = COALESCE(?, slug), reason = COALESCE(?, reason),
           published_at = COALESCE(?, published_at), updated_at = ?
         WHERE keyword = ?`
      ).run(d.status, str(d.slug), str(d.reason), str(d.published_at), nowISO(), normalize(kw));
      restored++;
    }
  });
  return { restored, created };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const pad = (s, n) => String(s ?? '').padEnd(n).slice(0, n);
const dash = (v, n) => pad(v === null || v === undefined ? '—' : v, n);

function printTable(rows) {
  if (!rows.length) return console.log('(no rows)');
  console.log(
    [pad('KEYWORD', 42), pad('STATUS', 12), pad('TYPE', 11), pad('INTENT', 14), pad('VOL', 7), pad('SCORE', 7), 'CLUSTER'].join(' ')
  );
  console.log('-'.repeat(120));
  for (const r of rows) {
    console.log(
      [
        pad(r.keyword, 42),
        pad(r.status, 12),
        dash(r.content_type, 11),
        dash(r.intent, 14),
        dash(r.search_volume, 7),
        dash(r.score === null ? null : Number(r.score).toFixed(1), 7),
        r.cluster,
      ].join(' ')
    );
  }
  console.log(`\n${rows.length} row(s)`);
}

function cmdBrief(db, kw) {
  const row = getKeyword(db, kw);
  if (!row) {
    console.error(`No such keyword: "${normalize(kw)}"`);
    process.exitCode = 1;
    return;
  }
  const serp = getSerp(db, kw);
  console.log(`# WRITING BRIEF\n`);
  console.log(`Keyword      : ${row.keyword}`);
  console.log(`Cluster      : ${row.cluster}`);
  console.log(`Content type : ${row.content_type ?? '(unclassified — run gates.classify)'}`);
  console.log(`Format       : ${row.format ?? '—'}`);
  console.log(`Intent       : ${row.intent ?? '—'}`);
  console.log(`Volume / KD  : ${row.search_volume ?? '—'} / ${row.keyword_difficulty ?? '—'}`);
  console.log(`Score        : ${row.score ?? '—'}  (demand ${row.demand ?? '—'}, opportunity ${row.opportunity ?? '—'}, value ${row.value ?? '—'}, fit ${row.fit ?? '—'})`);
  console.log(`Status       : ${row.status}${row.slug ? ` → ${row.slug}` : ''}`);
  if (row.notes) console.log(`Notes        : ${row.notes}`);

  if (!serp) {
    console.log(`\n(no cached SERP — run the SERP fetcher for this keyword)`);
    return;
  }
  console.log(`\n## SERP (${serp.source ?? 'unknown source'}, fetched ${serp.fetched_at})`);
  const organic = Array.isArray(serp.organic) ? serp.organic : [];
  if (organic.length) {
    console.log(`\n### What already ranks — beat these\n`);
    organic.forEach((o, i) => {
      const title = typeof o === 'string' ? o : o.title ?? o.name ?? JSON.stringify(o);
      const url = typeof o === 'object' && o ? (o.url ?? o.link ?? '') : '';
      console.log(`${String(i + 1).padStart(2)}. ${title}${url ? `\n    ${url}` : ''}`);
    });
  }
  const paa = Array.isArray(serp.paa) ? serp.paa : [];
  if (paa.length) {
    console.log(`\n### People Also Ask — these become the FAQ block\n`);
    for (const q of paa) console.log(`  - ${typeof q === 'string' ? q : q.question ?? JSON.stringify(q)}`);
  }
}

function cmdPrioritize(db, kw) {
  const row = getKeyword(db, kw);
  if (!row) throw new Error(`No such keyword: "${normalize(kw)}"`);
  const top = db.prepare('SELECT COALESCE(MAX(score), 0) m FROM keywords').get().m;
  const boosted = Number(top) + 1;
  db.prepare('UPDATE keywords SET score = ?, updated_at = ? WHERE keyword = ?').run(boosted, nowISO(), row.keyword);
  // A hand-prioritised keyword must be pickable again, so pull it back out of a
  // terminal-but-reversible state. published/covered are left alone.
  if (['skipped', 'needs-human', 'queued'].includes(row.status)) {
    setStatus(db, row.keyword, 'discovered', null, null);
  } else {
    touchState(db);
  }
  console.log(`Prioritized "${row.keyword}" — score ${row.score ?? '—'} → ${boosted}, status ${getKeyword(db, row.keyword).status}`);
}

const USAGE = `kwstore — keyword backlog

  report                      readable table of the whole backlog
  add "<kw>" [type] [note]    queue a new keyword (news-watch, manual finds)
  pick <bucket> [n]           next keywords to write (money|breadth|explore|refresh)
  brief "<keyword>"           keyword + cached SERP/PAA as a writing brief
  published "<kw>" "<slug>"   mark written & shipped
  covered "<kw>" "<slug>"     an existing page already covers this
  skip "<kw>" "<reason>"      reject with a reason
  prioritize "<kw>"           force to the front of the queue
  stats                       counts
  rebuild                     replay backlog-state.json into the DB
  recluster                   recompute clusters after a gates.clusterOf change
  reconcile                   mark every page on disk as covered (backlog <- reality)
`;

async function main(argv) {
  const [cmd, ...args] = argv;
  if (!cmd || cmd === 'help' || cmd === '--help') return console.log(USAGE);

  const db = openDb();
  try {
    switch (cmd) {
      case 'report':
        return printTable(allKeywords(db, args[0] ? { status: args[0] } : {}));
      // The news-watch routine's only write path: a change in the world made a
      // query searchable that the seed harvesters never generated. Deliberately
      // does NOT set status — a new row is `discovered` and still has to survive
      // the daily routine's pick, cannibalization and servability checks.
      case 'add': {
        if (!args[0]) throw new Error('add: keyword required');
        const existing = getKeyword(db, args[0]);
        upsertKeyword(db, args[0], {
          content_type: args[1] ?? null,
          notes: args[2] ?? null,
          source: 'news-watch',
        });
        return console.log(
          existing
            ? `add: "${normalize(args[0])}" already existed (status=${existing.status}) — fields merged, status untouched`
            : `add: queued "${normalize(args[0])}"${args[1] ? ` as ${args[1]}` : ''}`,
        );
      }
      case 'pick': {
        const rows = pickNext(db, { bucket: args[0] || 'money', n: args[1] ?? 2 });
        return printTable(rows);
      }
      case 'brief':
        return cmdBrief(db, args[0]);
      case 'published':
        setStatus(db, args[0], 'published', args[1] ?? null);
        return console.log(`published: "${normalize(args[0])}" → ${args[1] ?? '(no slug)'}`);
      case 'covered':
        markCovered(db, args[0], args[1] ?? null);
        return console.log(`covered: "${normalize(args[0])}" → ${args[1] ?? '(no slug)'}`);
      case 'skip':
        setStatus(db, args[0], 'skipped', null, args[1] ?? 'no reason given');
        return console.log(`skipped: "${normalize(args[0])}" (${args[1] ?? 'no reason given'})`);
      case 'prioritize':
        return cmdPrioritize(db, args[0]);
      case 'stats':
        return console.log(JSON.stringify(stats(db), null, 2));
      case 'rebuild': {
        const r = importState(db);
        const moved = recluster(db);
        for (const m of moved) console.log(`  recluster: "${m.keyword}"  ${m.from} -> ${m.to}`);
        return console.log(`rebuild: restored ${r.restored} decision(s), created ${r.created} missing row(s), recomputed ${moved.length} cluster(s)`);
      }
      case 'recluster': {
        const moved = recluster(db);
        for (const m of moved) console.log(`  "${m.keyword}"  ${m.from} -> ${m.to}`);
        return console.log(`recluster: ${moved.length} cluster(s) changed`);
      }
      case 'reconcile': {
        const r = await reconcileFromDisk(db);
        for (const a of r.added) console.log(`  covered "${a.keyword}" -> ${a.path}${a.created ? ' (new row)' : ''}`);
        return console.log(
          `reconcile: ${r.scanned} live page(s), ${r.alreadyTracked} already tracked, ${r.added.length} marked covered ` +
            `(${r.added.filter(a => a.created).length} new row(s))`
        );
      }
      default:
        console.error(`Unknown command "${cmd}"\n\n${USAGE}`);
        process.exitCode = 1;
    }
  } finally {
    db.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch(err => {
    console.error(String(err?.message ?? err));
    process.exitCode = 1;
  });
}
