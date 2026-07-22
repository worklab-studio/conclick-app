# Conclick content engine

The pSEO/blog traffic engine for conclick.io. Three scheduled Claude Code agents
drive one keyword backlog through a lint gate onto a live Next.js site.

**There is no LLM API in this pipeline.** The writer is a Claude Code agent
running under launchd. `prompts.mjs` is a voice-and-facts reference for that
agent, not an API payload. (An OpenAI Action used to live here; it silently
no-op'd for 9 days before anyone noticed, and it was deleted in `37afa019`.)

- **Strategy and the reasoning behind it:** [`PLAYBOOK.md`](PLAYBOOK.md)
- **What the agents actually execute:** [`routines/`](routines/)

---

## The three routines

| Routine | Schedule | Does | Never does |
|---|---|---|---|
| [`daily-content`](routines/daily-content.md) | 09:12, 14:22, 18:42 | Writes ONE page, or repairs one | Writes two, backdates, exceeds 3/day |
| [`weekly-traffic`](routines/weekly-traffic.md) | Mon 09:47 | Ingests GSC, harvests queries, repairs 3 | Creates a new page |
| [`news-watch`](routines/news-watch.md) | 07:40, 11:40, 16:40, 21:40 | Queues ONE backlog row when the beat moves | Publishes anything, ever |

All three run through the same script:

```bash
./scripts/seo/run-routine.sh                      # daily-content (default)
./scripts/seo/run-routine.sh weekly-traffic
./scripts/seo/run-routine.sh news-watch
./scripts/seo/run-routine.sh daily-content --dry  # _drafts only, no publish
```

launchd agents: `io.conclick.seo-daily`, `io.conclick.seo-weekly`,
`io.conclick.seo-news` in `~/Library/LaunchAgents/`. Logs land in
`~/.conclick-seo-logs/<routine>-<stamp>.log`, kept 30 days.

They share **one** lock (`/tmp/conclick-seo-routine.lock`) because they share one
git working tree. Schedules are spaced so the lock is a backstop, not a
scheduler.

## The pipeline, one page at a time

```
seeds.txt ──import-seeds──┐
suggest.mjs (autocomplete)├──> keywords.sqlite ──pick──> GROUND ──> WRITE ──> GATE ──> SHIP
harvest.mjs (SO / HN)     │      + backlog-state.json    (brief)   (draft    (lint    (commit
gsc.mjs harvest (real)  ──┘                                         JSON)     +build)  +deploy
                                                                      │                 +IndexNow)
                                                                      v
                                                     write.mjs -> lib.mjs -> src/content/<dir>/<slug>.ts
                                                                          -> src/content/index.ts (generated)
```

1. **Discover.** `seeds.txt` (~134 seed phrases in 12 groups) plus autocomplete
   and forum harvesters fill `keywords.sqlite`. `gsc.mjs harvest` adds the best
   rows of all: queries the live site already earns impressions for.
2. **Pick.** `kwstore.mjs pick <bucket>` returns one row per cluster from four
   SQL buckets (money / breadth / explore / refresh), excluding clusters a
   published entry already covers.
3. **Ground.** `kwstore.mjs brief "<kw>"` returns cached SERP + People Also Ask.
   The page is the gap the top results underserve. Ungrounded is allowed;
   guessing what competitors say is not.
4. **Write.** The agent writes a draft JSON to `drafts/<slug>.json`.
5. **Gate.** `write.mjs` runs the draft through `lib.mjs`
   (`assembleEntry` → `writeEntry` → `regenerateIndex`), then `lint.mjs` enforces
   23 laws against a committed baseline ratchet, then `pnpm run build-app`.
6. **Ship.** Commit, push both refs, `fly deploy`, `indexnow.mjs --new`.
   Sitemap, RSS and llms.txt regenerate from the registry at build time.

## Scripts

| File | Role |
|---|---|
| `kwstore.mjs` | The backlog. SQLite via `node:sqlite`, zero deps. The stable CLI every routine uses. |
| `backlog-state.json` | The irreplaceable decisions (keyword → status/slug/reason), reviewable in a diff. |
| `prompts.mjs` | Pinned product facts, founder voice, output rules, competitor data. **Single source of truth — keep it accurate.** |
| `lib.mjs` | Draft → typed `ContentEntry` → disk → regenerated registry. Provider agnostic; produced all existing entries. |
| `write.mjs` | The ONLY sanctioned way to create a page. `--reindex` rebuilds the registry after a back-out. |
| `lint.mjs` | 23 laws + baseline ratchet. `--entry`, `--changed`, `--all`, `--baseline-init`. |
| `gates.mjs` `laws.mjs` `score.mjs` | Clustering, the law definitions, and the demand × opportunity × value × fit score. |
| `suggest.mjs` `harvest.mjs` | Autocomplete and StackOverflow/HN harvesters. Independently non-fatal. |
| `google-core.mjs` | Search Console auth + queries with **no prisma import** (the reason `src/lib/google.ts` cannot be reused from a CLI). |
| `gsc.mjs` | `sites` · `ingest` · `ratio` · `opportunities` · `harvest`. |
| `indexnow.mjs` | Sitemap diff → IndexNow. `--new` is self-healing; never use `--urls` for a page you just wrote. |
| `build-entries.mjs` | Bulk codegen from a JSON blob (used for the initial batch). |

## Rules that cost something to relearn

- `pnpm run build-app`, **never** `pnpm run build` — `build` runs `check-db`,
  which opens a connection to the production database.
- A Bash permission pattern must be the **full command prefix** then `:*`.
  `Bash(node scripts/seo/:*)` matches nothing. An un-allowlisted command in an
  unattended run is declined silently and the routine stops at that step.
- Never hand-write `src/content/**/<slug>.ts` and never edit
  `src/content/index.ts` — it is generated.
- In-prose links are `[anchor](/path)` inside section `text`/`items` strings,
  rendered by `src/components/seo/RichText.tsx` (p/ul/ol/quote/callout only —
  headings don't render links). Unknown paths silently degrade to plain text.
  The `internalLinks` array is the end-of-page rail, not a substitute.
- Review mode is **off** (since 2026-07-22). A lint failure therefore has to be
  backed out, not left in the tree, or the next run commits it.
- `ctr` from Search Console is a **fraction**. 0.02 is 2%.
- `/vs/X` and `/alternatives/X` are *supposed* to overlap. 8 such pairs exist; a
  naive cannibalization check hard-fails all of them.
- Never backdate `datePublished`. Sitemap lastmod, first-crawl date and the
  Wayback record all contradict it.

## Setup a new machine needs

1. `launchctl load ~/Library/LaunchAgents/io.conclick.seo-{daily,weekly,news}.plist`
2. Service-account JSON at `~/.conclick/google-sa.json`, and that account added
   as a Restricted user on the `conclick.io` Search Console property. Without it
   `gsc.mjs` degrades to a clear error and the weekly routine falls back to
   lint-only repair. Fly holds the same key as a secret, but `fly secrets` is
   write-only so it cannot be copied back out.
3. `fly auth login` for the deploy step.
