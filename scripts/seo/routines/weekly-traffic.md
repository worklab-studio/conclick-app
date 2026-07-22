---
name: conclick-weekly-traffic
description: Ingest Search Console data, harvest the queries the corpus already earns, and repair the three weakest pages. Never writes a new page.
---

# Conclick weekly traffic

Repo: `/Users/worklab/Conclick beta/umami` — always `cd` there first.
Runs Monday 09:15 local. **This routine never creates a new page.** The daily
routine does that; this one closes the loop on pages that already exist.

The thesis: after a corpus is live, the best information about what to write and
what to fix stops coming from autocomplete guesses and starts coming from what
Google is already showing the site for. This run is where that data enters the
system.

---

## 0. INGEST

```bash
cd "/Users/worklab/Conclick beta/umami"
node scripts/seo/gsc.mjs sites
node scripts/seo/gsc.mjs ingest 28
```

If `sites` reports a missing credential or an unreadable property, **stop the
data steps and go to step 3** (lint-only repair). Print the error verbatim in the
report — it names the exact file or grant that is missing, and it is a two-minute
human fix that nobody will make if the report says only "GSC unavailable".

The credential is a service-account JSON at `~/.conclick/google-sa.json`, and the
account must be a Restricted user on the `conclick.io` Search Console property.
Fly holds the same key as a secret, but `fly secrets` is write-only, so the local
copy is the only one this routine can use.

Expect zero rows for a corpus younger than a few days. Zero rows is data, not a
failure: report it and continue.

## 1. HARVEST

```bash
node scripts/seo/gsc.mjs harvest 25
```

Queries with real impressions that no backlog row covers, added as `discovered`
with their impression count as `search_volume`. These are the highest-quality
rows in the entire backlog: real demand, in the searcher's own words, on a
property that already ranks for them. Everything else in the table is inferred.

They are *not* promoted or queued — the daily routine still has to pick them and
still applies cannibalization and servability checks.

## 2. READ THE OPPORTUNITIES

```bash
node scripts/seo/gsc.mjs opportunities
```

Two lists come back:

- **RETITLE** — impressions ≥ 50, CTR < 2%. Google is showing the page and
  people are not clicking. The title and meta description are the defect.
- **STRIKING DISTANCE** — average position 5-20 with real impressions. The page
  ranks but not high enough to earn traffic. Usually a depth or authority gap on
  the specific question the query asks.

`ctr` and `position` are stored the way the API returns them: **ctr is a
fraction** (0.02 is 2%) and position is an absolute rank. A filter written as if
ctr were a percentage matches every row.

## 3. REPAIR (up to THREE pages)

Pick up to three targets, best evidence first:

1. Retitle candidates, highest impressions first.
2. Striking-distance pages, highest impressions first.
3. If no GSC data exists: `node scripts/seo/lint.mjs --all` and take the worst
   grandfathered violations, plus any entry older than 14 days with no
   contextual inbound links.

Three, not one, because these are edits to existing pages rather than new
publications: there is no crawl-budget or velocity cost, and the daily routine's
one-per-run rule exists to pace *publishing*. Do not exceed three anyway —
quality degrades across a long context, and a fourth edit is worth less than
next Monday's first.

For each target:

- **Retitle:** rewrite `metaTitle` and `metaDescription` to answer the query the
  page actually earns impressions for. Keep the h1 unless it is also wrong.
- **Striking distance:** add the section the query implies, with a real primary
  source. Do not pad. If there is nothing true to add, say so and move on.
- **Orphan:** add genuine in-prose `[anchor](/path)` links from related pages.
  Vary the anchor text between sources — 40 pages linking with an identical
  anchor is the classic exact-match footprint.

  **In-prose means inside a section's `text` or `items` string**, rendered by
  `RichText` (`src/components/seo/RichText.tsx`) in `p`, `ul`, `ol`, `quote` and
  `callout`. Headings do not render links. Adding to the `internalLinks` array
  is not a substitute: that renders as an end-of-page card rail, which is the
  template chrome search engines discount most. An unresolvable path degrades to
  plain text rather than shipping a 404, so confirm the anchor actually survived
  into the built page.

Edit the entry in `src/content/<dir>/<slug>.ts` directly. This routine changes
existing pages, so there is no draft JSON and no `write.mjs` step; if a change
would be large enough to want one, it is a new page and belongs to the daily
routine instead.

Bump `dateModified` **only** for a substantive change: anything that alters what
the page says or how it is described, retitles included. Never for whitespace,
reordering, or reformatting.

## 4. GATE

```bash
node scripts/seo/lint.mjs --changed
pnpm run build-app
```

`--changed` is right here (unlike the daily routine's `--entry`) because a repair
run touches several existing files and the git diff is exactly the set you mean.

`build-app`, never `build` — `build` runs `check-db` against the live production
database.

Once green, lock the week's repairs in:

```bash
node scripts/seo/lint.mjs --baseline-tighten
```

It only removes or lowers baseline entries, so a fixed violation stops being a
standing allowance that a later regression could quietly re-fill. **Never
`--baseline-init`** — that regenerates from scratch and would grandfather any
new violation present at that moment.

## 5. SHIP

```bash
git add -A && git commit --no-verify -m "chore(seo): weekly repair — <what changed> [skip ci]"
git push origin HEAD:master && git push origin HEAD
fly deploy -a conclick --remote-only
node scripts/seo/indexnow.mjs --new
```

Push **both** refs. Deploy after committing, because the working tree is what
ships. Run `indexnow.mjs --new` even when nothing shipped — it is self-healing
and re-running submits nothing.

Commit even if the only change is `gsc-index-state.json` or
`indexnow-submitted.json`. Those ledgers are the engine's memory; left dirty they
eventually get discarded by a reset and the pages they record are never
re-announced.

## 6. REPORT

≤15 lines: GSC availability and row count, queries harvested, the three targets
and why each was chosen, what changed on each, lint + build result, what shipped,
and the indexation ratio.

Say plainly when there was no data. A first run against an empty property that
harvests nothing and repairs one lint violation is a correct run.
