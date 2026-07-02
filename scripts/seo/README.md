# Conclick programmatic-SEO content pipeline

Every SEO page is one typed `ContentEntry` in `src/content/<dir>/<slug>.ts`. The
templates in `src/app/(seo)/**` render them; the registry `src/content/index.ts`
is **auto-generated** — don't hand-edit it.

## Pieces

| File | Role |
|---|---|
| `prompts.mjs` | Pinned product facts, founder voice, output rules, competitor data, and the draft JSON schema. **The single source of truth — keep facts accurate.** |
| `topics.mjs` | The backlog. Add a row to queue a new page. |
| `lib.mjs` | Assembles a draft → typed `ContentEntry`, writes the file, regenerates `index.ts`. |
| `generate.mjs` | Daily generator: drafts the next backlog topic with Claude Sonnet and writes it. |
| `build-entries.mjs` | Bulk codegen from a JSON blob (used for the initial batch). |
| `../../.github/workflows/seo-daily.yml` | Runs `generate.mjs` daily and opens a PR for review. |

## Run it locally

```bash
node scripts/seo/generate.mjs --list                 # what's left in the backlog
ANTHROPIC_API_KEY=sk-ant-... node scripts/seo/generate.mjs            # next 1 page
ANTHROPIC_API_KEY=sk-ant-... node scripts/seo/generate.mjs --count 3  # next 3
ANTHROPIC_API_KEY=sk-ant-... node scripts/seo/generate.mjs --topic comparison/fathom
```

It writes new `src/content/**` files and rewrites `src/content/index.ts`. Commit
and deploy (pages are static + ISR, 24h revalidate).

## Automate it (daily)

1. Put the repo on GitHub.
2. Add a repo secret **`ANTHROPIC_API_KEY`** (Settings → Secrets → Actions). Use a
   freshly-created key — never one that's been pasted into chat.
3. The `seo-daily` Action runs every day at 14:17 UTC, generates the next page, and
   opens a **PR** (`seo/daily-content`). Review it for accuracy + voice, then merge.
4. Adjust cadence/volume by editing the `cron` and `--count` in the workflow.

> Why a PR and not auto-publish: Google penalizes "scaled content abuse." A human
> skim before publish keeps quality up and the site safe. Roll out in small daily
> batches rather than dumping hundreds at once.

## Grow the site

Add competitors/terms/use-cases/guides to `topics.mjs`. For a brand-new *type* of
page, add its `(seo)` route template + the `DIR` mapping in `lib.mjs`.
