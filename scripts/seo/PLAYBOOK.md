# Conclick Content Engine — Playbook

The pSEO/blog traffic engine for conclick.io. Modeled on the notchbay/commenti machine,
adapted to this repo's reality: **typed `ContentEntry` objects + Next.js**, not static HTML,
and **Claude Code scheduled routines as the writer — no LLM API anywhere**.

> **The thesis:** one git-committed keyword backlog (SQLite via Node's built-in `node:sqlite`,
> zero new deps) feeding three local Claude routines that write typed entries through the
> *existing* `scripts/seo/lib.mjs` codegen, gated by a changed-files-only lint pass, shipped
> and pinged to IndexNow. Nine-tenths of the value is the machinery, not the writing.
>
> **But the single biggest lever is not code.** Two independent Cloudflare features are
> currently 403-ing every AI crawler. Until that toggle flips, every GEO deliverable here is
> being built for readers who receive an error page.

---

## 0. What we found in the existing code (verified, not inferred)

These change the plan. Each was confirmed by reading the repo.

| # | Finding | Consequence |
|---|---|---|
| 1 | **The prose renderer cannot make links.** `Section` is `{type:'p'; text: string}` and `prose.tsx` renders `<p>{section.text}</p>` — no anchor path exists. 42 of 44 entries have `internalLinks: []`. | 100% of current internal links are template chrome (the class Google discounts most). The entire linking strategy is *structurally impossible* until this is fixed. **Fix first.** |
| 2 | **A corpus-wide lint gate fails 44/44 on run one.** Every entry has em dashes (~800 total); 9 metaDescriptions are over length. | notchbay's fail-hard property would mean the engine never publishes anything. Need a committed `.lint-baseline.json` ratchet + per-entry quarantine. |
| 3 | **notchbay's scoring formula collapses here.** With no paid volume data, every row scores `log10(10)×(100−35)/50 = 1.3` identically. | The backlog becomes FIFO wearing a score column. Needs tiered demand by evidence provenance. |
| 4 | **`relatedFor()` ranks by raw array position** — alphabetical by directory. | `alternatives_*` always wins; `use-cases/*` and `tools/*` structurally starve. A built-in orphan generator, not a tuning problem. |
| 5 | **The blog is untracked by its own product.** No tracker script in `(seo)/layout.tsx`. CTAs send visitors cross-origin to `app.conclick.io/register`. | Blog→trial conversion is unmeasurable, and the session severs at the exact moment of conversion. |
| 6 | **`cleanSection()` drops `{type:'cta'}`** — yet the two hand-written pages both use one and render it. | The two most conversion-focused pages have something the machine is forbidden from producing. |
| 7 | **`typescript.ignoreBuildErrors: true`** in next.config. | The build gate will NOT catch a malformed field. Lint must cover schema shape itself. |
| 8 | **Two separate Cloudflare blocks**, not one: an edge AI-bot 403, *and* a managed robots.txt **prepended above** the Worker's own response. | No code change can fix it. Dashboard only. |
| 9 | **The existing GSC service-account integration is reusable** (`src/lib/google.ts` already mints a JWT scoped to `webmasters.readonly`). | Skip notchbay's OAuth flow entirely — and its 7-day refresh-token expiry failure mode simply doesn't exist for a service account. |

---

## 1. Strategy pillars

1. **GEO is gated, not slow.** Allow the *retrieval* agents (OAI-SearchBot, PerplexityBot,
   Claude-User, Google-Extended, and ClaudeBot if you want Claude citations). Keep pure
   training scrapers (CCBot, Bytespider, meta-externalagent) blocked if you want to preserve
   the `ai-train=no` posture. Verify with a five-user-agent curl loop; all must return 200.
2. **Claude routines are the writer, full stop.** Delete `.github/workflows/seo-daily.yml` and
   `scripts/seo/generate.mjs` (the OpenAI path). **Keep `lib.mjs` verbatim** — it's provider
   agnostic and is the same code path that produced the existing 44 pages.
3. **Score by demand × opportunity × value × fit**, with demand *tiered by evidence
   provenance*: real GSC impressions > Wikipedia pageviews (free, official, absolute — a
   legitimate ordinal signal for glossary) > an autocomplete proxy using suggestion **position**
   and cross-engine agreement. Persist all four factors so any pick is auditable.
4. **Anti-cannibalization is SQL, not prose.** A `cluster` column + `ROW_NUMBER() OVER
   (PARTITION BY cluster)` + four named pick buckets (money/breadth/explore/refresh). Hard
   exemption: `/vs/X` and `/alternatives/X` are *supposed* to overlap — 8 such pairs exist.
5. **Throttle to indexation, not to a quota.** At ~1 of 55 indexed, publishing 2/day into an
   unindexed corpus manufactures a crawl-budget problem *and* a thin-content signal. Below
   ~60% indexed, the daily slot repairs orphans instead. **A run that publishes nothing is a
   successful run.**
6. **One deterministic mesh module** serves both the in-page hero and the OG card — but the
   **word is never inside the shared SVG** (see §4).

---

## 2. Phases

### P0 — Unblock, retire, survive (week 1)
- **Cloudflare:** AI Crawl Control → Allow the retrieval agents; **disable managed robots.txt**.
- **Delete the dead OpenAI pipeline** (`seo-daily.yml`, `generate.mjs`). Keep `lib.mjs`; demote
  `prompts.mjs` from API payload to the routine's voice/facts reference.
- **In-prose links:** `RichText.tsx` + `validPaths()` + the `prose.tsx` swap. Allow
  `[anchor](/path)` inside existing `text` strings, validated against the live registry,
  degrading unknown slugs to plain text. `grep -ro '](/' src/content` returns **0** today, so
  all 44 pages render byte-identically.
- **Optional schema fields:** `primaryKeyword`, `sources`, `heroWord`, `category`, `topics`,
  `cluster`, `tags`, `provenance`. All optional (ignoreBuildErrors is on).
- **Lint with a baseline ratchet:** `--baseline-init` captures the current violation state;
  quarantine is per-entry (move to `src/content/_quarantine/` — `regenerateIndex()` globs a
  fixed DIR map, so it vanishes from the registry). Lint **before** codegen.
- **Per-type word floors**, not a flat 850: `tool 250` (utm-builder is *correctly* 402 words —
  a flat floor would push the machine to pad tool pages, the exact thin-content behavior the
  gate exists to prevent), glossary 900, comparison/alternative 1100, guide 1200, blog 900.

### P1 — The backlog engine (week 1–2)
- `kwstore.mjs` on **`node:sqlite`** (verified working on Node v24.7.0 here, zero new deps),
  WAL + `busy_timeout=30000`. Alongside it `backlog-state.json` holds only the irreplaceable
  decisions (keyword → status/slug/reason) — the file a human reviews in a diff.
- Schema: `keywords` (PK normalized keyword, `cluster`, `content_type` matching the
  `ContentType` union exactly, `money_tier`, `volume_source` provenance, four persisted score
  components) + append-only evidence ledger + `serp_data`, `generation_log`, `gsc_metrics`,
  `actions`, news ledger.
- `pickNext(db, {bucket, n})` — four SQL buckets, one row per cluster, excluding clusters
  already covered by a published entry. **Delete `min_volume` entirely.**
- `seeds.txt` — ~134 phrases in 12 groups. The highest-leverage clusters are **absent from the
  current 96 topics**: the AI/GEO group (`llm referral traffic`, `track ai traffic` — genuinely
  low competition today, and Conclick sees those referrers first-party) and the bot-traffic
  group (3-layer filtering incl. datacenter-IP is a real differentiator with zero pages today).
- Harvesters, each independently non-fatal: `suggest.mjs` (Google/Bing/DDG/YouTube
  autocomplete), `harvest.mjs` (StackOverflow API, HN Algolia — free, keyless, no WAF, and
  where the GA4-exodus discourse actually happens), `wiki.mjs` (Wikipedia pageviews).
- **SERP grounding ladder:** Brave Search API → DDG html scrape (local only) → autocomplete
  question reconstruction → none. Record which rung produced the data, because computing
  hardness from a CAPTCHA page silently poisons the opportunity factor.
- **Stable CLI** is the only interface SKILL.md uses: `kwstore.mjs report | pick <bucket> [n] |
  brief | published | covered | skip | prioritize`. (commenti's routine calls named commands
  and is a third the length of notchbay's inlined-heredoc version. Copy commenti's shape.)

### P2 — The three routines + indexing surfaces (week 2–3)
- **`conclick-daily-content`** (10:05 + 17:05 IST, quota 2/day clamped at 6): QUOTA → LOCK →
  DRAIN actions → REFRESH sources → PICK (buckets + servability) → GROUND → WRITE drafts →
  GATE → RECORD → SHIP + IndexNow → REPORT (≤15 lines). Two slots is cheap insurance against a
  sleeping laptop, safe only because quota is computed from committed state.
- **How a ContentEntry is emitted** (where Conclick diverges hardest from both references):
  the routine writes a **draft JSON**, then `write.mjs` calls `assembleEntry/writeEntry/
  regenerateIndex` from `lib.mjs`. It must **never** hand-write `src/content/**/<slug>.ts` and
  **never** touch `src/content/index.ts`. Say this explicitly or the model will hand-write it.
- **Review gate via `_drafts/`** for ~2 weeks — costs zero schema change because
  `regenerateIndex()` iterates only `Object.values(DIR)`.
- **`conclick-weekly-traffic`** (Mon 09:15) — the flywheel. Extract the credential layer from
  `src/lib/google.ts` into `google-core.ts` with **no prisma import** (that module-scope import
  is the only thing preventing CLI reuse). Harvest unserved queries back into the backlog;
  retitle opportunity pages (CTR < 2% — note `max_ctr` is a **fraction**).
- **`conclick-analytics-news-watch`** (4×/day) — beat: Google Search updates, GA4 changes,
  browser/privacy-tech changes, privacy-law rulings, competitor pricing/shutdowns, payment
  platform changes. **~25 of every 28 runs should correctly do nothing.** Never publish the
  news summary; publish the evergreen query-shaped page the news makes searchable.
- **IndexNow served from the Worker** (not Next — the Worker is a strict path allowlist, and a
  Next-served key would 404 on any cold start, permanently invalidating the key with Bing).
  Bing's index is ChatGPT search's retrieval backend, so this is the fastest path from
  "published" to "citable by ChatGPT": minutes, not the weeks Googlebot will take.
- **RSS** at `src/app/(seo)/blog/rss.xml/route.ts`.
- **Allowlist the Bash commands** in `.claude/settings.json` before the first scheduled run — a
  non-interactive run hangs silently on a permission prompt, the same invisible-failure shape
  that hid the no-op OpenAI Action for 9 days.

### P3 — The commenti-structure UI in Conclick's language (week 3–4)
- **`src/lib/mesh/spec.ts`** — pure, deterministic: FNV-1a of slug → mulberry32 → 5 blurred
  blobs, **blob 0 locked to the brand hue near `#6C63C9`** so every image still reads as
  Conclick, the rest fanned by the golden angle for guaranteed separation.
- **THE GOTCHA:** the word is **never** inside the shared SVG. `next/og` rasterizes through
  resvg, whose font database contains only fonts passed to `ImageResponse` — `<text>` inside an
  embedded data-URI SVG renders as **tofu with no error**. So hero and OG share the *art*
  byte-for-byte; each renders the word in its own layer.
- **Instrument Serif** (not Playfair/Lora/EB Garamond) — and decisively it ships as **`.woff`,
  which satori accepts and `.woff2` does not**.
- **`BlogIndex.tsx` as a NEW component beside `Hub.tsx`** — HubGrid has **7 callers**; adding a
  rail + categories + mesh art either breaks the other six or forces six conditional branches.
  The blog is also the only hub where a magazine layout is right.
- **CSS-only category filter** (radio + `:checked` siblings). Both alternatives are wrong: a
  `?category=` searchParam forces the route dynamic and kills `revalidate = 86400`; minting
  `/blog/topic/[slug]` creates thin 2-post index pages — the doorway pattern that suppresses
  whole sites.
- **FAST FACTS 01–05** is the single most GEO-productive element on either reference site — a
  numbered list of concrete statistics with linked anchors is exactly what ChatGPT and
  Perplexity lift verbatim, sitting on the highest-authority page in the cluster.
- **Post body:** render `tldr` as a bordered "THE SHORT VERSION" box (no schema change), drop
  cap guarded by `/^[A-Za-z]/`, **SOURCES** list (genuinely new, and it matters most for GEO —
  an explicit citation list is the structure LLM retrievers use to judge trustworthiness),
  card-style read-next.
- **Editorial vs commercial hero split:** `ContentArticle` currently puts `HeroWebsiteInput` +
  `TrustRow` above the fold on *every* type. Correct on `/vs` and `/for`; it's the main reason
  blog posts read as landing pages.

### P4 — Flywheel, graph, GEO depth, distribution (month 2+)
- Cluster taxonomy (5 clusters, each with a designated pillar) + rewritten `relatedFor()`.
- Glossary auto-linking with **anchor-text variation** picked from `hash(sourceSlug)` — 40 pages
  linking with the identical anchor is the classic exact-match footprint.
- `graph.mjs` — orphans, simplified PageRank, over-linked targets (>15% of inbound),
  reciprocal-only pairs. `--check` fails if an entry older than 14 days has zero contextual
  inbound links. The weekly routine repairs the top 3.
- **Instrument conclick.io with Conclick** + fix the cross-origin conversion break. Then goals
  (`cta_click`, `register_start`, `website_added`, `trial_active`) wired to the
  **webhook-verified `RevenueEvent`** ledger — not the legacy client-written `revenue` table —
  because blog-attributed revenue must be trustworthy if you're going to publish it.
- **llms.txt v2** — replace the link dump with *extractable claims*. Every fact line must name
  its subject ("Conclick costs $X" NOT "It costs $X") because a pronoun-led chunk is uncitable.
- **The linkable data asset, sequenced by when the data exists.** Rung 1 ships now, zero
  customers needed: a reproducible measurement of every analytics script's transfer size, parse
  time and main-thread blocking (GA4, GTM, Plausible, Fathom, PostHog, Matomo, Clarity, Hotjar,
  Conclick) using the puppeteer-core + system-chromium setup the click-map feature already
  proved. **Independently reproducible is what makes people cite it.**

---

## 3. The unique-data doctrine (three tiers)

- **Tier 1 — publish freely, start now.** Conclick's own first-party data about conclick.io:
  its funnel, which sources convert, its own bot-filter hit rates, its own heatmap findings.
  Deepak's own site; no customer data, no consent question.
- **Tier 2 — do NOT publish.** Cross-customer aggregate benchmarks. Requires, in order: an
  explicit ToS/DPA clause, a k-anonymity floor (n≥50 sites/cell, reject cells where one site is
  >20% of volume), an opt-out, and a notification. **Recommendation: defer indefinitely.** A
  privacy-first analytics brand monetizing customer aggregates is a durable attack line, and
  tiers 1 + 3 supply more than enough material.
- **Tier 3 — always safe, badly underused.** Reproducible first-party experiments. The highest
  single asset available: run GA4, Plausible and Conclick side-by-side on conclick.io for 30
  days and publish the measured discrepancy with full methodology.

---

## 4. Gotchas (don't relearn these)

1. The mesh **word must not be in the shared SVG** — resvg renders it as tofu, silently.
2. satori accepts **`.woff`**, not `.woff2`.
3. A `?category=` searchParam **kills `revalidate`**; thin `/blog/topic/*` routes are doorway pages.
4. **Lint before `regenerateIndex()`**, so a broken entry never enters the registry.
5. `max_ctr` is a **fraction** (0.02 = 2%).
6. The gate is **`pnpm run build-app`, not `build`** — `build` runs `check-db`, which opens a
   live production DATABASE_URL connection. The daily writer must never touch prod Postgres.
7. Cloudflare's managed robots.txt is **prepended above** the Worker's response — unfixable in code.
8. A non-interactive scheduled run **hangs silently** on an un-allowlisted permission prompt.
9. `/vs/X` and `/alternatives/X` are *supposed* to overlap — a naive cannibalization checker
   hard-fails all 8 existing pairs.
10. Outreach is **human-only**. The engine surfaces prospects; it never contacts anyone and
    never records a contact status it did not observe.
