---
name: conclick-analytics-news-watch
description: Watch the analytics/SEO/privacy beat. When something genuinely changes, queue the evergreen page it makes searchable. Never publishes.
---

# Conclick analytics news watch

Repo: `/Users/worklab/Conclick beta/umami` — always `cd` there first.
Runs 4x/day (07:40, 11:40, 16:40, 21:40 local).

**This routine never writes a page, never commits content, and never deploys.**
Its entire output is: zero or one new backlog rows, plus a report.

**Roughly 25 of every 28 runs should correctly do nothing.** That is the design,
not underperformance. A watcher that finds something every run is a watcher
inventing things. If you find yourself queueing on most runs, the bar has
drifted and the correct response is to raise it.

---

## 0. THE BEAT

Six things are worth watching. Nothing else is.

1. **Google Search** — ranking system updates, spam policy changes, Search
   Console feature or data changes, anything affecting how pages get indexed.
2. **GA4** — feature removals, data retention or sampling changes, migration
   deadlines, UI changes that break a documented workflow.
3. **Browser and privacy tech** — third-party cookie state, ITP/ETP changes,
   referrer policy, anything that changes what a tracker can observe.
4. **Privacy law** — a specific DPA ruling, a court decision, an enforcement
   action against an analytics vendor. Must have an authority, a date, and a
   document.
5. **Competitors** — Umami, Plausible, Fathom, Matomo, PostHog, Simple
   Analytics, Clarity, Hotjar: pricing changes, shutdowns, acquisitions, major
   features. **Umami first**, and it was missing from this list until
   2026-07-26. It is the vendor whose releases invalidate our corpus fastest:
   `/vs/umami` and `/alternatives/umami` both assert things Umami does not have,
   and Conclick is built on the Umami codebase, so an upstream release can make
   a claim false and land in our own repo in the same week. Watch its GitHub
   releases and its cloud changelog, not just its blog.
6. **AI retrieval** — how ChatGPT, Perplexity, Claude and Google AI surfaces
   pick and cite sources; crawler policy changes; llms.txt adoption. This is the
   highest-value beat because it is the one where Conclick is first-hand
   credible and the SERP is still thin.

## 1. LOOK

Use WebSearch. Restrict to the **last 3 days** and prefer primary sources:
official blogs, changelogs, regulator publications, vendor pricing pages. A
secondary article reporting on an announcement is a pointer to the primary
source, not the source.

Read `scripts/seo/news-seen.json` first. It is a ledger of what has already been
evaluated:

```json
{ "seen": [ { "url": "…", "title": "…", "at": "2026-07-22", "verdict": "queued|ignored", "keyword": "…" } ] }
```

Skip anything whose URL is already in it. Without this the same announcement
gets evaluated four times a day for a week.

## 2. JUDGE

A story is worth queueing only if **all four** hold:

- **Real.** A primary source confirms it. Not a rumour, not a roadmap, not a
  single unattributed tweet.
- **Changes what someone should do.** A version bump nobody acts on is not news.
- **Creates a query that did not exist before, or makes an existing one urgent.**
  This is the actual test. Ask: what would someone type into Google *because* of
  this?
- **Conclick can answer it honestly.** From the product facts in `prompts.mjs`
  and first-hand experience. If answering well requires data or measurement that
  does not exist, it fails.

If any one fails, record it as `ignored` with the reason and move on.

## 3. QUEUE

Queue the **evergreen, query-shaped page** the news makes searchable. Never the
news summary itself.

The distinction is the whole point of this routine. "Google announces X" is dead
in a month, competes with every publication on earth, and is the kind of page
that makes a site look like an aggregator. "How to do Y now that X changed" is
searched for years and is the page Conclick can actually win.

```bash
node scripts/seo/kwstore.mjs add "<the query someone would type>" <content_type> "<why, + primary source URL>"
node scripts/seo/kwstore.mjs prioritize "<the query>"
```

`content_type` is one of the `ContentType` values: `guide`, `blog`, `glossary`,
`comparison`, `alternative`, `useCase`, `tool`.

Prioritize **only** when the topic is genuinely time-sensitive: a deadline, an
enforcement action, a shutdown. Most queued items should not be prioritized —
jumping the queue is how a well-ordered backlog turns back into FIFO.

**One row per run, at most.** If a run turns up three genuine stories, queue the
strongest and record the other two as `ignored` with reason "deferred, see next
run". Three rows from one run means three near-simultaneous pages on the same
theme, which is the burst pattern the whole engine is built to avoid.

## 4. RECORD

Append every story evaluated, queued or not, to `scripts/seo/news-seen.json`.
Keep the most recent 200 entries and drop the rest. Both verdicts are recorded:
knowing what was rejected and why is what stops the next run re-litigating it.

Commit the ledger:

```bash
git add scripts/seo/news-seen.json scripts/seo/backlog-state.json scripts/seo/keywords.sqlite
git commit --no-verify -m "chore(seo): news watch — <queued keyword | nothing> [skip ci]"
git push origin HEAD:master && git push origin HEAD
```

No deploy. Nothing user-visible changed.

If nothing was evaluated at all, commit nothing and say so.

## 5. REPORT

≤10 lines: what was searched, how many stories were evaluated, what was queued
and why, what was rejected and why, and the ledger size.

"Nothing happened on the beat today" is the expected report. Write it plainly and
stop. Do not pad it with what *might* happen, and do not lower the bar to have
something to say.
