// Keyword gates for the Conclick pSEO autopilot.
//
// Four pure functions, no I/O, no deps. Everything downstream (kwstore.mjs,
// score.mjs, the expansion/publish pipeline) treats these as the single source
// of truth for "is this keyword ours?" and "what shape of page does it want?".
//
//   normalize(kw)  -> canonical string form (the kwstore primary key)
//   clusterOf(kw)  -> token signature used to collapse near-duplicates
//   relevant(kw)   -> 'accept' | 'reject' | 'needs-human'
//   classify(kw)   -> { content_type, format, intent }
//
// content_type is ALWAYS a member of Conclick's real ContentType union in
// src/content/schema.ts: comparison | alternative | tool | glossary | useCase |
// guide | blog. Never invent a type — lib.mjs DIR[] would throw.

// ---------------------------------------------------------------------------
// normalize
// ---------------------------------------------------------------------------

/**
 * Canonical string form. This is the kwstore PRIMARY KEY, so it must be
 * stable and idempotent: normalize(normalize(x)) === normalize(x).
 */
export function normalize(kw) {
  if (kw == null) return '';
  return String(kw)
    .replace(/[‘’‛]/g, "'") // smart quotes -> ascii
    .replace(/[“”]/g, '"')
    .replace(/[‐-―]/g, '-') // unicode dashes -> hyphen
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// clusterOf
// ---------------------------------------------------------------------------

// Pure function words only. Interrogatives (what/how/why/which) and intent
// words (best/top/free/vs/without/not) are DELIBERATELY kept — they split
// clusters that genuinely deserve separate pages.
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'at', 'by',
  'with', 'from', 'is', 'are', 'am', 'be', 'been', 'was', 'were', 'do', 'does',
  'did', 'my', 'your', 'our', 'their', 'its', 'it', 'this', 'that', 'these',
  'those', 'i', 'you', 'we', 'they', 'me', 'us', 'as', 'so', 'if', 'than',
  'then', 'there', 'here', 'about', 'into', 'over', 'per', 'up', 'out', 'can',
  'should', 'would', 'will', 'have', 'has',
  // Superlatives are NOT a distinct search intent for us. Without these,
  // "google analytics alternative" and "best google analytics alternative"
  // land in different clusters and the engine happily writes both — which is
  // self-cannibalization, the exact thing clustering exists to prevent.
  // NOTE: changing this set invalidates stored cluster signatures. Run
  // `node scripts/seo/kwstore.mjs recluster` after any edit here.
  'best', 'top', 'free', 'good', 'great', 'cheap', 'cheapest', 'popular',
]);

// Applied AFTER plural stripping. Collapses phrasings that want ONE page.
const SYNONYMS = new Map(Object.entries({
  versus: 'vs',
  analytic: 'analytics',
  analytics: 'analytics',
  stat: 'analytics',
  metric: 'analytics',
  price: 'price',
  pricing: 'price',
  cost: 'price',
  plan: 'price',
  what: 'definition',
  mean: 'definition',
  meaning: 'definition',
  definition: 'definition',
  explained: 'definition',
  define: 'definition',
  tool: 'tool',
  software: 'tool',
  platform: 'tool',
  app: 'tool',
  service: 'tool',
  site: 'site',
  website: 'site',
  web: 'site',
  setup: 'install',
  install: 'install',
  add: 'install',
  integrate: 'install',
  integration: 'install',
  migrate: 'migrate',
  migration: 'migrate',
  switch: 'migrate',
  ga: 'ga4',
  ga4: 'ga4',
  broken: 'fix',
  fix: 'fix',
  error: 'fix',
}));

function stripPlural(tok) {
  if (tok.length > 3 && tok.endsWith('s') && !tok.endsWith('ss') && !tok.endsWith('us')) {
    return tok.slice(0, -1);
  }
  return tok;
}

/**
 * Sorted non-stopword token signature. Two keywords sharing a cluster should
 * never both get published — kwstore's ROW_NUMBER() OVER (PARTITION BY cluster)
 * de-dupe relies entirely on this.
 *
 *   clusterOf('plausible vs fathom') === clusterOf('fathom versus plausible')
 *   clusterOf('what is a heatmap')   === clusterOf('heatmap definition')
 */
export function clusterOf(kw) {
  const norm = normalize(kw);
  if (!norm) return '';
  const toks = norm
    .replace(/[^a-z0-9\s.+-]/g, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/^[.\-+]+|[.\-+]+$/g, ''))
    .filter(Boolean)
    .filter((t) => !STOPWORDS.has(t))
    .map(stripPlural)
    .map((t) => SYNONYMS.get(t) ?? t);

  const uniq = [...new Set(toks)].sort();
  return uniq.length ? uniq.join('+') : norm;
}

// ---------------------------------------------------------------------------
// relevant
// ---------------------------------------------------------------------------

// PHASE 1 — hard reject. This exists because the moment you seed anything with
// "google analytics" in it, autocomplete expansion drags in an entire orbit of
// careers/training/spam intent that will never convert for an analytics SaaS.
const NEGATIVE = [
  /\b(certification|certified|certificate|course|courses|exam|quiz|academy|training|bootcamp|syllabus|skillshop)\b/,
  /\b(jobs?|salary|salaries|career|careers|hiring|hire|internship|intern|recruiter|resume|cv template|cover letter|interview questions)\b/,
  /\b(freelancer|freelance|upwork|fiverr|consultant near me|agency near me|near me)\b/,
  /\btutorial pdf\b|\bpdf download\b|\bebook pdf\b|\bcheat sheet pdf\b|\bnotes pdf\b/,
  /\b(crack|cracked|nulled|torrent|keygen|serial key|apk|mod apk|free download)\b/,
  /\b(crypto|cryptocurrency|bitcoin|casino|betting|forex|nft|airdrop|token price|stock price)\b/,
  /\b(porn|xxx|escort|dating app)\b/,
  /\b(login|log in|sign in|signin|customer service number|phone number|contact number|helpline)\b/,
  /\b(meaning in hindi|in urdu|in tamil|traduccion|kya hai)\b/,
];

// PHASE 2 — must match at least one. Domain surface + every competitor brand.
const POSITIVE = [
  // core domain
  /\banalytic(s)?\b|\btracking\b|\btracker\b|\btrack\b|\btelemetry\b/,
  /\bheat ?map(s)?\b|\bclick ?map(s)?\b|\bscroll ?map(s)?\b|\bsession (replay|recording|record)\b|\breplay(s)?\b/,
  /\bfunnel(s)?\b|\bcohort(s)?\b|\bretention\b|\bchurn\b|\bab test\w*\b|\ba\/b test\w*\b/,
  /\battribution\b|\butm\b|\breferrer\b|\breferral\b|\bcampaign(s)?\b/,
  /\bpage ?view(s)?\b|\bbounce rate\b|\bexit rate\b|\bsession(s)?\b|\bvisitor(s)?\b|\bunique visitor\w*\b|\bdau\b|\bmau\b/,
  /\bconversion(s)?\b|\bgoal(s)?\b|\bevent(s)?\b|\bsignup(s)?\b|\bclick(s|through)?\b|\bctr\b/,
  /\blanding page\b|\bentry page\b|\bexit page\b|\btime on page\b|\bsession duration\b|\bsampling\b|\bthresholding\b|\bdata retention\b/,
  // "traffic" is only ours when qualified — this keeps "traffic ticket lawyer" out.
  /\b(direct|organic|referral|paid|bot|search|social|website|web|blog|store|ai) traffic\b|\btraffic (source|channel|analytics|report|drop|spike|quality)\b/,
  // privacy / compliance surface (Conclick's moat)
  /\bcookieless\b|\bcookie ?less\b|\bcookie banner\b|\bcookie(s)?\b|\bconsent( mode)?\b|\bfingerprint\w*\b/,
  /\bgdpr\b|\bccpa\b|\bschrems\b|\bdpa\b|\bprivacy\b|\bprivacy.?first\b|\bfirst.?party\b|\bthird.?party\b|\banonymi[sz]\w*\b|\bpii\b/,
  // GA orbit (survivors of the negative phase are real pain queries)
  /\bga4\b|\bgoogle analytics\b|\buniversal analytics\b|\bgtag\b|\bgtm\b|\btag manager\b|\bgoogle tag\b|\blooker studio\b|\bsearch console\b/,
  // revenue / ICP
  /\bstripe\b|\bpaddle\b|\blemon ?squeezy\b|\bpolar\b|\bdodo\b|\brevenue\b|\bmrr\b|\barr\b|\bltv\b|\bcac\b|\bcheckout\b|\bsubscription\w*\b/,
  /\bdashboard(s)?\b|\breport(s|ing)?\b|\bkpi(s)?\b|\bmetric(s)?\b|\bsegment\w*\b|\bself.?host\w*\b|\bopen.?source\b/,
  // AI / MCP (Conclick ships conclick-mcp; almost no competitor does)
  /\bmcp\b|\bmodel context protocol\b|\bclaude\b|\bchatgpt\b|\bperplexity\b|\bllm(s)?\b|\bai (agent|assistant|crawler|referral|traffic|analytics)\b|\bgenerative engine\b|\bgeo\b/,
  // competitor brands
  /\bplausible\b|\bfathom\b|\bmatomo\b|\bpiwik\b|\bposthog\b|\bmixpanel\b|\bamplitude\b|\bheap\b|\bhotjar\b/,
  /\bmicrosoft clarity\b|\bclarity\b|\bumami\b|\bsimple analytics\b|\bpirsch\b|\bswetrix\b|\bgoatcounter\b|\bcounter\.dev\b/,
  /\bcloudflare (web )?analytics\b|\bvercel analytics\b|\bdatafast\b|\bsplitbee\b|\bstatcounter\b|\bchartbeat\b|\bcountly\b|\bopen ?panel\b/,
  /\bfullstory\b|\bsmartlook\b|\bmouseflow\b|\bcrazy ?egg\b|\blucky orange\b|\bptengine\b|\bcontentsquare\b|\bglassbox\b|\blogrocket\b|\bquantcast\b/,
  /\bvwo\b|\boptimizely\b|\badobe analytics\b|\bkissmetrics\b|\bwoopra\b|\bsimilarweb\b|\bjune\.so\b|\buserpilot\b|\bjune analytics\b/,
];

// PHASE 2b — no positive hit, but close enough to our world that a human
// should look rather than silently dropping a possible opportunity.
const ADJACENT = [
  /\bseo\b|\btraffic\b|\bgrowth\b|\bmarketing\b|\bsaas\b|\becommerce\b|\be-commerce\b|\bshopify\b|\bwebflow\b|\bframer\b/,
  /\bwordpress\b|\bghost\b|\bsquarespace\b|\bastro\b|\bnext\.?js\b|\bsvelte\w*\b|\bremix\b|\bnuxt\b|\bwix\b|\bcarrd\b|\bbubble\b/,
  /\bindie hacker\w*\b|\bbootstrapped\b|\bfounder(s)?\b|\bstartup(s)?\b|\bnewsletter(s)?\b|\bdata\b|\buser behavio\w*\b/,
];

const any = (patterns, s) => patterns.some((re) => re.test(s));

/**
 * Two-phase gate. NEGATIVE runs FIRST and unconditionally — a keyword that
 * matches both ("google analytics certification cost") must reject, because
 * the negative signal describes the searcher, not the topic.
 */
export function relevant(kw) {
  const s = normalize(kw);
  if (!s) return 'reject';
  if (any(NEGATIVE, s)) return 'reject';
  if (any(POSITIVE, s)) return 'accept';
  if (any(ADJACENT, s)) return 'needs-human';
  return 'reject';
}

// ---------------------------------------------------------------------------
// classify
// ---------------------------------------------------------------------------

// Brand presence is what separates a PRODUCT comparison (/vs/ page) from a
// DEFINITIONAL comparison ("exit rate vs bounce rate" -> glossary).
const BRAND = /\b(plausible|fathom|matomo|piwik|posthog|mixpanel|amplitude|heap|hotjar|clarity|umami|pirsch|swetrix|goatcounter|datafast|splitbee|statcounter|chartbeat|countly|fullstory|smartlook|mouseflow|crazy ?egg|lucky orange|ptengine|contentsquare|glassbox|logrocket|quantcast|vwo|optimizely|kissmetrics|woopra|similarweb|userpilot|conclick|ga4|google analytics|universal analytics|simple analytics|cloudflare (web )?analytics|vercel analytics|microsoft clarity|adobe analytics|google tag manager|tag manager|gtag|gtm)\b/;

// Words that turn a bare brand lookup into an actual research query.
const MODIFIER = /\b(vs|versus|alternative|alternatives|instead of|pricing|price|cost|costs|review|reviews|best|top|how|what|why|which|for|free|compare|comparison|vs\.|setup|install|migrate|migration|switch|not|fix|error|tutorial|guide|features?|limits?|api|mcp)\b/;

const RULES = [
  // 1. product comparison — but only when a real product is named.
  {
    test: (s) => /\b(vs\.?|versus)\b/.test(s) && BRAND.test(s),
    out: { content_type: 'comparison', format: 'comparison', intent: 'commercial' },
  },
  // 1b. brandless "x vs y" is a concept comparison, not a product page.
  //     e.g. "exit rate vs bounce rate", "pageviews vs sessions", "dau vs mau"
  {
    test: (s) => /\b(vs\.?|versus)\b/.test(s),
    out: { content_type: 'glossary', format: 'explainer', intent: 'informational' },
  },
  // 2. alternative
  {
    test: (s) => /\b(alternatives?|instead of|replacement for)\b/.test(s),
    out: { content_type: 'alternative', format: 'comparison', intent: 'commercial' },
  },
  // 3. pricing — MUST precede the generic buckets. These are the x1.4
  //    transactional rows and they used to fall through to explainer.
  {
    test: (s) => /\b(pricing|price|prices|cost|costs|how much|free tier|free plan|cheaper|cheapest|affordable|paid plan|per month)\b/.test(s),
    out: { content_type: 'comparison', format: 'pricing', intent: 'transactional' },
  },
  // 4. listicle — explicit ("best x"), and bare product-CATEGORY queries.
  //    A category noun phrase ("privacy friendly analytics", "cookieless
  //    session replay") is commercial shortlist intent, not a blog essay;
  //    without this clause the whole money cluster fell through to blog.
  {
    test: (s) =>
      /\b(best|top|cheap|popular|recommended)\b/.test(s) ||
      /\b(tools?|software|apps?|platforms?|options?) for\b/.test(s) ||
      (/\b(privacy|privacy.?first|privacy.?friendly|cookieless|cookie ?less|gdpr|ccpa|self.?hosted|open.?source|lightweight|simple|minimal|real.?time|free|no.?cookie)\b/.test(s) &&
        /\b(analytics|heat ?maps?|tracking|tracker|session (replay|recording)|dashboard|attribution|funnels?)\b/.test(s)) ||
      /\b(analytics|heat ?map|funnel|attribution|tracking) (tools?|software|apps?|platforms?)\b/.test(s),
    out: { content_type: 'alternative', format: 'listicle', intent: 'commercial' },
  },
  // 5. how-to / install / migration
  {
    test: (s) =>
      /\bhow (to|do i|can i)\b/.test(s) ||
      /\b(add|install|set ?up|configure|implement|embed|connect|integrate|track|record|export|migrate|migration|move from|switch (from|to))\b/.test(s),
    out: { content_type: 'guide', format: 'how-to', intent: 'informational' },
  },
  // 6. troubleshooting
  {
    test: (s) =>
      /\b(not working|not tracking|not showing|not firing|doesn'?t work|broken|fix|error|errors|missing|wrong|why is|why are|zero|undercount\w*|skew\w*|troubleshoot|data loss|data gone|thresholding|sampling|blocked|adblock\w*|duplicate)\b/.test(s),
    out: { content_type: 'guide', format: 'troubleshooting', intent: 'informational' },
  },
  // 7. definitional
  {
    test: (s) => /\b(what is|what are|whats|meaning|definition|defined|explained|define)\b/.test(s),
    out: { content_type: 'glossary', format: 'explainer', intent: 'informational' },
  },
  // 8. persona / use case
  {
    test: (s) =>
      /\bfor (saas|ecommerce|e-commerce|shopify|startups?|founders?|indie hackers?|bloggers?|blogs?|agencies|agency|newsletters?|developers?|marketers?|freelancers?|nonprofits?|small business(es)?|creators?|publishers?|smbs?|solopreneurs?)\b/.test(s),
    out: { content_type: 'useCase', format: 'use-case', intent: 'commercial' },
  },
];

/**
 * Map a keyword to the page shape it deserves. Order matters, first match wins.
 * content_type is guaranteed to be a member of the ContentType union.
 */
export function classify(kw) {
  const s = normalize(kw);
  if (!s) return { content_type: 'blog', format: 'explainer', intent: 'informational' };

  for (const rule of RULES) {
    if (rule.test(s)) return { ...rule.out };
  }

  // Fallback, with two refinements over a bare blog/explainer:
  // interactive utilities become /tools/ pages...
  if (/\b(calculator|generator|builder|checker|tester|validator|template|preview tool)\b/.test(s)) {
    return { content_type: 'tool', format: 'tool', intent: 'commercial' };
  }
  // ...and developer-surface queries are how-to shaped, not essay shaped.
  if (/\b(mcp|model context protocol|api|sdk|webhook|cli|self.?host\w*|docker)\b/.test(s)) {
    return { content_type: 'guide', format: 'how-to', intent: 'informational' };
  }
  return { content_type: 'blog', format: 'explainer', intent: 'informational' };
}

// Tokens that add nothing to a brand lookup. Anything NOT in here is a real
// qualifier and disqualifies the navigational penalty.
const NAV_FILLER = new Set([
  'com', 'io', 'net', 'org', 'co', 'app', 'site', 'website', 'web', 'dashboard',
  'home', 'homepage', 'official', 'download', 'analytics', 'analytic',
  'account', 'portal', 'page', 'online',
]);

/**
 * True when the query is a bare brand lookup ("plausible", "google analytics",
 * "hotjar dashboard"). These are the ONLY rows that earn score.mjs's x0.6
 * penalty — exported so score.mjs and the seed linter share one rule.
 *
 * Deliberately NOT a token-count heuristic: "ga4 data thresholding" is three
 * tokens containing a brand, and counting tokens wrongly penalised the entire
 * GA4-pain cluster. Instead, strip the brand and require that literally nothing
 * meaningful is left over.
 */
export function isNavigational(kw) {
  const s = normalize(kw);
  if (!s) return false;
  if (!BRAND.test(s)) return false;
  if (MODIFIER.test(s)) return false;
  const rest = s
    .replace(new RegExp(BRAND.source, 'g'), ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => !NAV_FILLER.has(t));
  return rest.length === 0;
}

export const _internals = { STOPWORDS, SYNONYMS, NEGATIVE, POSITIVE, ADJACENT, BRAND, RULES };
