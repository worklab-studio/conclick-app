---
name: conclick-daily-content
description: Write, gate, and publish Conclick SEO pages from the keyword backlog. No API — you are the writer.
---

# Conclick daily content

Repo: `/Users/worklab/Conclick beta/umami` — always `cd` there first.
You are the writer. There is no LLM API in this pipeline.

**A run that correctly publishes nothing is a successful run.** Report and stop.

---

## 0. QUOTA

```bash
cd "/Users/worklab/Conclick beta/umami" && node scripts/seo/kwstore.mjs stats
```

`ENGINE_START = 2026-02-01`.

**Write exactly ONE page per run.** Three scheduled runs a day (09:12, 14:22, 18:42 local) = three posts a day. Never write two in one run: quality degrades across a single context, one failure would lose the whole batch, and three pages committed in the same minute reads as a burst rather than a cadence.

**Hard ceiling: 3 non-draft pages per calendar day.** If three already exist for today, print `quota met` and STOP. Never compute `days_since_START × 3` and try to settle a debt — from a February start that arithmetic claims ~500 pages owed, and publishing into that is precisely the velocity fingerprint that gets a site classified as scaled content. The start date is for reporting, not a backlog to repay.

**Never backdate `datePublished`.** A page's date is the day it was written. Fabricating a publication history is trivially detectable (sitemap lastmod, first-crawl date, and the Wayback record all contradict it) and it is the one lie that costs the whole domain its credibility.

**Indexation signal — report it, never silently skip.** Print the indexed/submitted ratio in every run report. A low ratio means Google is not keeping up with what already exists, so new pages spread crawl budget thinner rather than adding reach. The operator chose 3/day knowingly, so this is a number to surface, not a veto: publish anyway, but if the ratio is under 40% say so loudly and recommend that the next slot go to step 7 (repair) instead.

## 1. PICK

```bash
node scripts/seo/kwstore.mjs pick money 3
```

Reject a candidate and take the next if any apply:

- **Already covered.** The 12 `/vs/*` and 8 `/alternatives/*` slugs are a CLOSED set — a candidate naming one of those competitors is not a new page. Mark it `covered` against the existing slug. (amplitude, heap, cloudflare-web-analytics, vercel-analytics, goatcounter are NOT yet written and ARE allowed.)
- **Cannibalises.** Compare against every live entry's h1 + metaTitle + slug. High token overlap → reject. **Exception: `/vs/X` and `/alternatives/X` are supposed to overlap** — 8 such pairs exist deliberately; never reject on that basis.
- **Unservable.** Needs data or measurement you do not have → `needs-human`, with the reason.

```bash
node scripts/seo/kwstore.mjs skip "<kw>" "<reason>"
node scripts/seo/kwstore.mjs covered "<kw>" "<existing-slug>"
```

## 2. GROUND

```bash
node scripts/seo/kwstore.mjs brief "<keyword>"
```

Read the cached SERP + PAA. Find the angle the top results **underserve** — that gap is the page. Use the real PAA questions as the FAQ, answered in your own words, never copied.

If no grounding exists, write from the product facts instead and say so in the report. Ungrounded is allowed; guessing at what competitors say is not.

## 3. WRITE

Read `scripts/seo/prompts.mjs` for voice + the pinned product facts, and read one existing entry of the same type as a structural reference.

Write a draft to `scripts/seo/drafts/<slug>.json`:

```json
{ "type": "guide", "slug": "…", "kind": "guide", "keyword": "…",
  "draft": { "h1": "…", "metaTitle": "…", "metaDescription": "…",
             "tldr": "…", "intro": "…", "sections": [], "faq": [] } }
```

**Structure** — lede answers the query in the first 40–60 words (this is what AI engines quote) → `tldr` → ≥4 descriptive H2s → at least one data table where it genuinely helps → 3+ FAQ.

**Voice laws** (the lint gate enforces these; write to them, don't get caught by them):

- **Zero em dashes.** Colons, commas, periods.
- **First person, genuinely.** You are writing as Deepak, who built the thing.
- **≥2 internal links** to real existing pages.
- No filler: delve into · leverage the · in today's fast-paced world · it's important to note that · in this guide · let's explore · at the heart of · the bottom line is · it's crucial to · as you can see · game-changer · unlock the power · seamlessly integrate · in the ever-evolving · navigating the landscape.

**Honesty laws — these protect the business, not the ranking:**

- **Never** write "no consent banner needed" unqualified. The tracker writes a persistent localStorage id. Qualify it or omit it.
- **Never** write "GA4 is illegal in the EU." Not accurate in 2026 — the Data Privacy Framework addressed the transfer defect. Attribute every regulatory claim to a specific authority + ruling + date.
- **Never** claim a competitor lacks a feature without checking. Matomo *does* have heatmaps. Getting this wrong on a page titled "honest comparison" is fatal.
- **Disclose the Umami lineage** on any Umami-adjacent page.
- Never invent benchmarks, user counts, testimonials, or pricing.
- Describe pricing *models*, not figures, unless certain.

## 4. GATE

```bash
node scripts/seo/write.mjs scripts/seo/drafts/<slug>.json --drafts   # review mode
node scripts/seo/lint.mjs --entry <type>/<slug>                      # gates the draft directly
pnpm run build-app
```

In review mode use `--entry <type>/<slug>`, not `--changed`: `--changed` reads the
git diff of `src/content/<dir>/`, which a `_drafts` file is not in, so it would
report nothing and the gate would pass vacuously. `--entry` resolves `_drafts`
explicitly and prints `(draft)` so the log shows what was gated.

**Never copy a draft into the live directory to make lint see it.** That was the
old workaround and it leaves an orphan the next `regenerateIndex()` sweeps into
the registry and publishes unreviewed — the exact failure review mode exists to
prevent.

`--drafts` writes to `src/content/_drafts/`, invisible to the registry. **Keep review mode ON until ~14 days / ~25 clean pages.** Then drop `--drafts`.

Use `build-app`, never `build` — `build` runs `check-db`, which opens a live production database connection. The writer must never touch prod Postgres.

Lint fails → fix the draft and re-run. Never bypass the gate. Never edit `.lint-baseline.json` to make a new violation pass.

## 5. RECORD

```bash
node scripts/seo/kwstore.mjs published "<keyword>" "<slug>"
```

## 6. SHIP (only when review mode is off)

```bash
git add -A && git commit --no-verify -m "chore(seo): <slug> [skip ci]"
git push origin HEAD:master && git push origin HEAD
fly deploy -a conclick --remote-only
node scripts/seo/indexnow.mjs --new
```

Push **both** refs — the working branch and master silently diverge otherwise.
The working tree is what ships, so deploy AFTER committing.

**Run `indexnow.mjs --new` on EVERY run, even when you published nothing.** It
diffs the live sitemap against `indexnow-submitted.json` and submits only what has
never been announced, then records it. That makes it self-healing: if an earlier
run crashed before shipping, or ran in review mode, the page it missed goes out on
the next run instead of being silently lost forever. Re-running submits nothing, so
there is no cost to calling it every time. Never go back to `--urls <the one page
I just wrote>`; that is the version that loses pages.

Verify the new URL returns 200 before reporting success.

**Sitemap, RSS and llms.txt need no action** — all three are generated from the
content registry at build time, so the deploy above updates them. Confirm the new
slug appears in `conclick.io/sitemap.xml` as part of your verification.

## 7. REPAIR (moratorium slot, or when the backlog is dry)

Instead of publishing: run `node scripts/seo/lint.mjs --all`, pick the top orphaned or weakest existing page, and improve it — add genuine internal links, tighten a title that earns impressions but no clicks, add a missing source. Bump `dateModified` **only** for a substantive change, never for a reformat.

## 8. REPORT

≤15 lines: quota, what was picked and why, what was rejected and why, lint result, what shipped (or why nothing did), and the backlog count remaining.

Be honest. "Nothing worth publishing today" is a real and correct outcome.
