// ---------------------------------------------------------------------------
// gsc — Search Console ingest, indexation ratio, and opportunity finding.
//
//   node scripts/seo/gsc.mjs sites                 # what the SA can read (diagnostic)
//   node scripts/seo/gsc.mjs ingest [days]         # search analytics -> gsc_metrics
//   node scripts/seo/gsc.mjs ratio [sample]        # indexed/submitted, cached
//   node scripts/seo/gsc.mjs opportunities         # retitle + striking-distance list
//   node scripts/seo/gsc.mjs harvest [n]           # unserved queries -> backlog
//
// This exists because the daily routine is required to print an indexation
// ratio on EVERY run and could not: `gsc_rows: 0`, no source. Two runs on
// 2026-07-22 both had to report the number as unavailable.
//
// Every command degrades to a clear, non-fatal message when the credential is
// missing, because a scheduled routine that hard-fails at step 0 publishes
// nothing and nobody notices for a week.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getToken, listSites, searchAnalytics, inspectUrl, daysAgo, googleConfigured, keySource, serviceAccountEmail } from './google-core.mjs';
import { openDb, recordGsc, upsertKeyword, withBatch, normalize, allKeywords } from './kwstore.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const INDEX_STATE = path.join(HERE, 'gsc-index-state.json');

const HOST = 'conclick.io';
const SITEMAP = `https://${HOST}/sitemap.xml`;

// GSC's property string. A domain property is `sc-domain:conclick.io`; a URL
// prefix property is `https://conclick.io/`. Which one exists depends on how
// the site was verified, so `sites` resolves it rather than hardcoding.
const PROPERTY_ENV = process.env.GSC_PROPERTY || '';

// Search Console data lags roughly 2 days. Ending the window today yields a
// tail of zeroes that drags every average down and makes CTR look broken.
const LAG_DAYS = 2;

// URL Inspection is capped at 2000/day per property. A 71-URL corpus could be
// swept whole, but it will not stay 71, and a routine that silently starts
// costing 500 calls a run is how quota limits get discovered in production.
const DEFAULT_SAMPLE = 25;
const RECHECK_AFTER_DAYS = 14;

const isoDay = () => new Date().toISOString().slice(0, 10);

function die(msg) {
  console.error(msg);
  process.exitCode = 1;
}

/** Shared preamble: resolve credential + property, or explain exactly what is missing. */
async function connect() {
  if (!googleConfigured()) {
    throw new Error(
      `Search Console is not configured for the CLI.\n` +
        `  credential: ${keySource()}\n` +
        `  fix: save the service-account JSON to ~/.conclick/google-sa.json\n` +
        `  then invite ${serviceAccountEmail() || 'the service account'} as a Restricted user on the ${HOST} property.`,
    );
  }
  const token = await getToken();
  const sites = await listSites(token);
  if (!sites.length) {
    throw new Error(
      `the service account (${serviceAccountEmail()}) can read no properties.\n` +
        `  fix: Search Console -> ${HOST} -> Settings -> Users and permissions -> add it as Restricted.`,
    );
  }

  const property =
    PROPERTY_ENV ||
    sites.find(s => s.siteUrl === `sc-domain:${HOST}`)?.siteUrl ||
    sites.find(s => s.siteUrl.includes(HOST))?.siteUrl;

  if (!property) {
    throw new Error(
      `no ${HOST} property among the ones this account can read:\n` +
        sites.map(s => `    ${s.siteUrl} (${s.permissionLevel})`).join('\n'),
    );
  }
  return { token, property, sites };
}

// --- sitemap ---------------------------------------------------------------

/**
 * Live sitemap URLs. Read from the deployed site rather than the local build
 * because the question being asked is "what has Google been offered", and the
 * answer is whatever is actually served.
 */
async function sitemapUrls() {
  const res = await fetch(SITEMAP, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`sitemap ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(m => m[1]);
}

// --- index state ledger ----------------------------------------------------

function readIndexState() {
  try {
    return JSON.parse(fs.readFileSync(INDEX_STATE, 'utf8'));
  } catch {
    return { checked: {} };
  }
}

function writeIndexState(state) {
  fs.writeFileSync(INDEX_STATE, `${JSON.stringify(state, null, 2)}\n`);
}

// --- commands --------------------------------------------------------------

async function cmdSites() {
  const { sites, property } = await connect();
  console.log(`service account: ${serviceAccountEmail()}`);
  console.log(`credential:      ${keySource()}`);
  console.log(`resolved property: ${property}\n`);
  for (const s of sites) console.log(`  ${s.siteUrl}  (${s.permissionLevel})`);
}

/**
 * Pull page+query rows into gsc_metrics. Dimensions are [date, page, query] so
 * the row key matches the table's UNIQUE(page, keyword, date) and re-running
 * the same window updates in place instead of duplicating.
 */
async function cmdIngest(daysArg) {
  const days = Number(daysArg) || 28;
  const { token, property } = await connect();

  const startDate = daysAgo(days + LAG_DAYS);
  const endDate = daysAgo(LAG_DAYS);

  const rows = await searchAnalytics(token, property, {
    startDate,
    endDate,
    dimensions: ['date', 'page', 'query'],
    rowLimit: 25000,
  });

  const db = openDb();
  let written = 0;
  try {
    withBatch(db, () => {
      for (const r of rows) {
        const [date, page, query] = r.keys;
        recordGsc(db, {
          page,
          keyword: query,
          date,
          impressions: r.impressions,
          clicks: r.clicks,
          position: r.position,
          // ctr is a FRACTION here and stays one in the table. 0.02 = 2%.
          ctr: r.ctr,
        });
        written++;
      }
    });
  } finally {
    db.close();
  }

  console.log(`ingest: ${written} row(s) from ${property}  window ${startDate}..${endDate}`);
  if (!written) {
    console.log(
      'no rows. Either the property has no search data yet (a 1-day-old corpus normally does not), or the wrong property resolved.',
    );
  }
}

/**
 * indexed / submitted, the number the daily routine prints at step 0.
 *
 * Cached per URL in gsc-index-state.json and refreshed on a rolling basis, so
 * the cost is bounded at `sample` inspections per run no matter how large the
 * corpus grows. A URL never checked counts as not-indexed, which is the honest
 * reading: unknown is not evidence of indexation.
 */
async function cmdRatio(sampleArg) {
  const sample = Number(sampleArg) || DEFAULT_SAMPLE;
  const { token, property } = await connect();

  const urls = await sitemapUrls();
  const state = readIndexState();
  const now = Date.now();
  const staleBefore = now - RECHECK_AFTER_DAYS * 86_400_000;

  // Never-checked first, then the stalest. New pages are the ones whose status
  // is actually in question; a page indexed a month ago rarely flips back.
  const queue = urls
    .map(u => ({ url: u, at: state.checked[u]?.at ? Date.parse(state.checked[u].at) : 0 }))
    .filter(x => x.at < staleBefore)
    .sort((a, b) => a.at - b.at)
    .slice(0, sample);

  let checked = 0;
  let errors = 0;
  for (const { url } of queue) {
    try {
      const r = await inspectUrl(token, property, url);
      state.checked[url] = {
        indexed: r.indexed,
        coverageState: r.coverageState,
        lastCrawlTime: r.lastCrawlTime,
        at: new Date().toISOString(),
      };
      checked++;
    } catch (e) {
      errors++;
      // One bad URL must not abandon the sweep and leave the ledger half-written.
      console.error(`  inspect failed ${url}: ${String(e.message).slice(0, 120)}`);
    }
  }

  // Drop ledger entries for URLs no longer in the sitemap, so a renamed slug
  // does not sit in the denominator forever.
  const live = new Set(urls);
  for (const u of Object.keys(state.checked)) if (!live.has(u)) delete state.checked[u];

  writeIndexState(state);

  const indexed = urls.filter(u => state.checked[u]?.indexed).length;
  const known = urls.filter(u => state.checked[u]).length;
  const ratio = urls.length ? indexed / urls.length : 0;

  console.log(`indexation: ${indexed}/${urls.length} indexed (${(ratio * 100).toFixed(0)}%)`);
  console.log(`  coverage of the estimate: ${known}/${urls.length} URLs have ever been inspected`);
  console.log(`  this run: ${checked} inspected, ${errors} error(s), ${queue.length} were due`);
  if (ratio < 0.4) {
    console.log(
      `  BELOW 40% — per the routine, say so loudly in the report and prefer REPAIR over a new page.`,
    );
  }
  // Machine-readable tail so a routine can grep one line instead of parsing prose.
  console.log(`ratio=${ratio.toFixed(3)} indexed=${indexed} total=${urls.length}`);
}

/**
 * Two lists the weekly routine acts on:
 *   retitle       — real impressions, dismal CTR. The title is the problem.
 *   striking      — position 5-20. A page that already ranks is cheaper to
 *                   push than a new page is to launch.
 */
async function cmdOpportunities() {
  const db = openDb();
  try {
    const since = daysAgo(28 + LAG_DAYS);

    const retitle = db
      .prepare(
        `SELECT page,
                SUM(impressions)                     AS impressions,
                SUM(clicks)                          AS clicks,
                CAST(SUM(clicks) AS REAL) / NULLIF(SUM(impressions), 0) AS ctr,
                AVG(position)                        AS position
           FROM gsc_metrics
          WHERE date >= ?
          GROUP BY page
         HAVING impressions >= 50 AND ctr < 0.02
          ORDER BY impressions DESC
          LIMIT 15`,
      )
      .all(since);

    const striking = db
      .prepare(
        `SELECT keyword,
                page,
                SUM(impressions) AS impressions,
                AVG(position)    AS position
           FROM gsc_metrics
          WHERE date >= ?
          GROUP BY keyword, page
         HAVING position BETWEEN 5 AND 20 AND impressions >= 20
          ORDER BY impressions DESC
          LIMIT 15`,
      )
      .all(since);

    if (!retitle.length && !striking.length) {
      console.log(`no opportunities — gsc_metrics has nothing since ${since}. Run \`gsc.mjs ingest\` first.`);
      return;
    }

    console.log(`RETITLE (impressions >= 50, CTR < 2%)  since ${since}`);
    for (const r of retitle) {
      console.log(
        `  ${(r.ctr * 100).toFixed(1)}% ctr  ${String(r.impressions).padStart(6)} impr  pos ${r.position.toFixed(1)}  ${r.page}`,
      );
    }
    console.log(`\nSTRIKING DISTANCE (position 5-20, impressions >= 20)`);
    for (const r of striking) {
      console.log(
        `  pos ${r.position.toFixed(1)}  ${String(r.impressions).padStart(6)} impr  "${r.keyword}"  ${r.page}`,
      );
    }
  } finally {
    db.close();
  }
}

/**
 * Queries earning impressions that no backlog row covers. This is the flywheel:
 * the corpus tells you what people actually search for, in their words, and
 * those phrasings are better than anything autocomplete invents.
 */
async function cmdHarvest(nArg) {
  const n = Number(nArg) || 25;
  const db = openDb();
  try {
    const since = daysAgo(28 + LAG_DAYS);
    const known = new Set(allKeywords(db).map(k => k.keyword));

    const rows = db
      .prepare(
        `SELECT keyword, SUM(impressions) AS impressions, AVG(position) AS position
           FROM gsc_metrics
          WHERE date >= ?
          GROUP BY keyword
         HAVING impressions >= 10
          ORDER BY impressions DESC`,
      )
      .all(since);

    const fresh = rows.filter(r => !known.has(normalize(r.keyword))).slice(0, n);
    if (!fresh.length) {
      console.log(`harvest: nothing new since ${since} (${rows.length} queries, all already in the backlog)`);
      return;
    }

    withBatch(db, () => {
      for (const r of fresh) {
        upsertKeyword(db, r.keyword, {
          source: 'gsc',
          // Real impressions on a live property is the strongest demand
          // evidence available here — better than autocomplete position, which
          // is what most of the 554 rows are scored from.
          search_volume: Math.round(r.impressions),
          notes: `gsc: ${r.impressions} impressions, avg position ${r.position.toFixed(1)} since ${since}`,
        });
      }
    });

    console.log(`harvest: added ${fresh.length} unserved quer(ies) from GSC`);
    for (const r of fresh) console.log(`  ${String(r.impressions).padStart(5)} impr  "${r.keyword}"`);
  } finally {
    db.close();
  }
}

// --- cli -------------------------------------------------------------------

const USAGE = `gsc — Search Console ingest + indexation

  sites                  properties this service account can read
  ingest [days=28]       search analytics rows -> gsc_metrics
  ratio [sample=25]      indexed/submitted, rolling URL Inspection cache
  opportunities          retitle + striking-distance lists
  harvest [n=25]         unserved GSC queries -> backlog
`;

const [cmd, ...args] = process.argv.slice(2);

try {
  switch (cmd) {
    case 'sites': await cmdSites(); break;
    case 'ingest': await cmdIngest(args[0]); break;
    case 'ratio': await cmdRatio(args[0]); break;
    case 'opportunities': await cmdOpportunities(); break;
    case 'harvest': await cmdHarvest(args[0]); break;
    case undefined:
    case 'help':
    case '--help': console.log(USAGE); break;
    default:
      die(`Unknown command "${cmd}"\n\n${USAGE}`);
  }
} catch (e) {
  // Non-zero exit, but a readable single reason rather than a stack trace: the
  // caller is a scheduled agent that has to put this in a run report.
  die(`gsc ${cmd}: ${e.message}`);
}
