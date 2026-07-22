---
name: conclick-daily-content
description: Write, gate, and publish Conclick SEO pages from the keyword backlog. No API — you are the writer.
---

# Conclick daily content

Repo: `/Users/worklab/Conclick beta/umami` — always `cd` there first.
You are the writer. There is no LLM API in this pipeline.

**A run that correctly publishes nothing is a successful run.** But it is not a
run that does nothing: when publishing is off the table, go to step 7 and
repair. Idling was the 2026-07-22 failure — two of three slots reported "quota
met" and stopped, spending an agent's full context to print a sentence.

---

## 0. QUOTA

```bash
cd "/Users/worklab/Conclick beta/umami" && node scripts/seo/kwstore.mjs stats
node scripts/seo/gsc.mjs ratio
```

`ENGINE_START = 2026-02-01`.

**Write exactly ONE page per run.** Three scheduled runs a day (09:12, 14:22, 18:42 local) = three posts a day. Never write two in one run: quality degrades across a single context, one failure would lose the whole batch, and three pages committed in the same minute reads as a burst rather than a cadence.

**Hard ceiling: 3 non-draft pages per calendar day.** Count entries whose `datePublished` is today. If three already exist, print `quota met` and **go to step 7 (REPAIR)** — do not stop, and do not write a fourth. Never compute `days_since_START × 3` and try to settle a debt — from a February start that arithmetic claims ~500 pages owed, and publishing into that is precisely the velocity fingerprint that gets a site classified as scaled content. The start date is for reporting, not a backlog to repay.

**A hand-written batch counts against the ceiling.** If a human committed pages today, the quota is consumed by them. That is correct and not a bug to route around.

**Never backdate `datePublished`.** A page's date is the day it was written. Fabricating a publication history is trivially detectable (sitemap lastmod, first-crawl date, and the Wayback record all contradict it) and it is the one lie that costs the whole domain its credibility.

**Indexation signal — report it, never silently skip.** `gsc.mjs ratio` prints `ratio=` as its last line; put that number in every run report. A low ratio means Google is not keeping up with what already exists, so new pages spread crawl budget thinner rather than adding reach. The operator chose 3/day knowingly, so this is a number to surface, not a veto: publish anyway, but **if the ratio is under 40%, skip writing and go to step 7 (REPAIR)** instead, and say why.

If `gsc.mjs ratio` fails because the credential is missing, print its error verbatim in the report and continue — an unmeasurable ratio is a reason to flag, not a reason to skip the day's page.

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
node scripts/seo/write.mjs scripts/seo/drafts/<slug>.json   # writes the live entry
node scripts/seo/lint.mjs --entry <type>/<slug>
pnpm run build-app
```

**Review mode is OFF.** Pages go straight to `src/content/<dir>/`. It was on for
the first two weeks; 15/15 of the first real batch passed lint on the first pass,
so the training wheels came off on 2026-07-22. Do not pass `--drafts` and do not
reintroduce a promote step.

Use `--entry <type>/<slug>` rather than `--changed`. Both work now that entries
are written live, but `--entry` names the thing you gated, so the log says what
was checked instead of implying it by a diff.

**If lint fails, you must leave the registry clean.** `write.mjs` has already run
`regenerateIndex()`, so a failed entry is *in* `src/content/index.ts` right now.
Either fix the draft and re-run `write.mjs` until lint is green, or back the
entry out completely:

```bash
git checkout -- src/content/index.ts && rm src/content/<dir>/<slug>.ts
node scripts/seo/write.mjs --reindex   # or re-run write.mjs on a fixed draft
```

Never leave a lint-failing entry in the tree at the end of a run: the next run
commits everything with `git add -A` and would publish it unreviewed.

Use `build-app`, never `build` — `build` runs `check-db`, which opens a live production database connection. The writer must never touch prod Postgres.

Never bypass the gate. Never edit `.lint-baseline.json` to make a new violation pass.

## 5. RECORD

```bash
node scripts/seo/kwstore.mjs published "<keyword>" "<slug>"
```

## 6. SHIP

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
run crashed before shipping, the page it missed goes out on the next run instead
of being silently lost forever. Re-running submits nothing, so
there is no cost to calling it every time. Never go back to `--urls <the one page
I just wrote>`; that is the version that loses pages.

Verify the new URL returns 200 before reporting success.

**Sitemap, RSS and llms.txt need no action** — all three are generated from the
content registry at build time, so the deploy above updates them. Confirm the new
slug appears in `conclick.io/sitemap.xml` as part of your verification.

## 7. REPAIR

**You arrive here whenever writing is off the table:** quota already met for
today, indexation ratio under 40%, the backlog is dry, or every candidate failed
step 1. This is the normal state of a slot, not an exception — expect to spend
more runs here than in step 3, and treat it as the real work rather than a
consolation prize.

Repair exactly **one** page per run, for the same reason you write only one.

Pick the target with evidence, in this order:

```bash
node scripts/seo/gsc.mjs opportunities   # real impressions: retitle + striking distance
node scripts/seo/lint.mjs --all          # grandfathered violations, worst first
```

1. **Retitle** — a page with impressions and CTR under 2%. The title and meta
   description are the whole problem; the body is already earning attention.
2. **Striking distance** — a page ranking 5-20 for a real query. Deepen the
   section that query implies, add the primary source it is missing.
3. **Orphan repair** — a page with no contextual inbound links. Add genuine
   in-prose `[anchor](/path)` links **from** related pages **to** it. Never add a
   link that a reader would not want to follow.
4. **Grandfathered lint** — clear violations off the baseline, oldest first.

Then gate exactly as step 4 does (`lint.mjs --entry`, `pnpm run build-app`) and
ship as step 6 does.

Bump `dateModified` **only** for a substantive change, never for a reformat. A
sitemap full of pages whose `lastmod` moves without their content moving is a
freshness signal that stops being believed.

**Always commit at the end of a repair run, even if the only change is
`indexnow-submitted.json`.** A dirty ledger left in the working tree rides along
on some unrelated future commit, and if the tree is ever reset it takes the
record of what was announced with it — after which the pages in it are never
re-submitted, because the ledger is what makes `--new` self-healing.

## 8. REPORT

≤15 lines: quota, indexation ratio, whether this was a WRITE or a REPAIR run and why, what was picked and rejected and why, lint result, what shipped, and the backlog count remaining.

Be honest. "Nothing worth publishing today, so I repaired X instead" is a real and correct outcome. "Quota met, stopped" is not — that means step 7 was skipped.
