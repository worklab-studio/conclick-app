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
  // Added alongside the masterclass POSITIVE widening. Accepting bare "seo"
  // opens the done-for-you SERVICES orbit, which is buying intent for an agency
  // retainer — a thing Conclick does not sell and cannot honestly write.
  /\bseo (services?|compan(y|ies)|agenc(y|ies)|expert(s)?|specialists?|consultants?|packages?|reseller|audit service|outsourc\w*|freelancer)\b/,
  /\b(marketing|advertising|web design|link building) (agency|agencies|services?|company|companies)\b/,
  // Blackhat / paid-link orbit. Same reason: not ours, and not defensible.
  /\b(buy backlinks|backlink packages?|guest post service|pbn|link farm|private blog network|black ?hat seo|rank and rent)\b/,
  // "geo" is a POSITIVE token (generative engine optimization) but is also an
  // ordinary networking prefix. Reject the networking sense explicitly.
  /\bgeo.?(blocking|fencing|restrict\w*|location|targeting|ip|redirect)\b/,
];

// PHASE 2 — must match at least one. Domain surface + every competitor brand.
//
// SCOPE NOTE (masterclass hub). This list used to describe Conclick's PRODUCT
// surface only, which meant the gate rejected most of the topics the hub exists
// to own: SEO, GEO/AI-search, CRO and experimentation, growth measurement. On a
// naturally-phrased sample of masterclass queries it rejected or deferred 14/30.
// The vocabulary blocks below widen the topic surface deliberately.
//
// This does NOT make the gate a pass-through. Two things keep it a filter:
//   1. NEGATIVE still runs first and unconditionally, so the careers /
//      certification / agency / spam orbit that "seo" and "keyword" otherwise
//      drag in ("seo jobs near me", "seo salary", "google analytics academy
//      exam") rejects before a single POSITIVE pattern is evaluated.
//   2. Every widened token is still a MEASUREMENT-or-SEARCH term. Generic
//      software, generic business and generic consumer queries have no match
//      here and fall through to reject exactly as before.
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
  // NOTE the trailing (s)? on the "ai <noun>" group. Without it the \b after
  // "crawler" could not match before the plural "s", so "ai crawlers" — the
  // more natural search phrasing — rejected while "ai crawler" accepted.
  /\bmcp\b|\bmodel context protocol\b|\bclaude\b|\bchatgpt\b|\bperplexity\b|\bllm(s)?\b|\bai (agent|assistant|crawler|bot|referral|traffic|analytics|search|citation|overview|answer|visibility)(s)?\b|\bgenerative engine\b|\bgeo\b/,

  // ---- MASTERCLASS: organic search -----------------------------------------
  // "seo" is ours now. It is safe as a bare token ONLY because NEGATIVE already
  // strips the entire careers/training/agency orbit ahead of this phase.
  /\bseo\b|\bserp(s)?\b|\bsearch engine optimi[sz]\w*\b|\bai overview(s)?\b|\borganic search\b|\bsearch visibility\b/,
  /\bkeyword(s)?\b|\bkeyword difficulty\b|\bsearch intent\b|\bcannibali[sz]\w*\b|\blong.?tail\b|\bhead term(s)?\b/,
  /\bindexed\b|\bindexing\b|\bnoindex\b|\bdeindex\w*\b|\bindexnow\b|\bcrawl\w*\b|\brobots ?\.?txt\b|\bsitemap(s)?\b|\bcanonical\b/,
  /\bmeta description\b|\btitle tag\b|\bh1\b|\bmeta ?data\b|\bschema markup\b|\bstructured data\b|\brich result(s)?\b|\bopen graph\b/,
  /\binternal link\w*\b|\bbacklink(s)?\b|\banchor text\b|\borphan page(s)?\b|\btopical authority\b|\be-?e-?a-?t\b|\bdomain authority\b/,
  /\brank(ing|s)? (for|in|on|higher|number|position)\b|\bsearch rank\w*\b|\bprogrammatic (seo|page|content)\w*\b|\bthin (page|content)\w*\b|\bduplicate content\b/,
  /\bsubdomain\b|\bsubfolder\b|\bsubdirector\w*\b|\bprerender\w*\b|\b(client|server).?side render\w*\b|\bsingle page app(s)?\b|\bapp router\b/,

  // ---- MASTERCLASS: GEO / AI-search surface --------------------------------
  // Named crawlers are the block-or-allow decision the hub is built to answer.
  /\bllms?\.txt\b|\bgptbot\b|\bcc ?bot\b|\bclaude ?bot\b|\boai.?search ?bot\b|\bperplexity ?bot\b|\bbytespider\b|\bgoogle.?extended\b/,
  /\bgemini\b|\bcited by\b|\bcitation(s)?\b|\bquotable\b|\bbrand mention(s)?\b|\bcrawl to refer\b/,

  // ---- MASTERCLASS: CRO / experimentation ----------------------------------
  /\bsplit test\w*\b|\bstatistical(ly)? significan\w*\b|\bsample size\b|\bholdout\b|\bincrementality\b|\bfalse positive(s)?\b|\bpainted door\b/,
  /\bcta(s)?\b|\bcall to action\b|\babove the fold\b|\bsocial proof\b|\btestimonial(s)?\b|\bheadline\b|\bplan tier(s)?\b/,
  /\b(cart|checkout|form|basket) abandon\w*\b|\babandon\w* (a )?(rate|cart|checkout|form)\b|\bdrop.?off\b|\bform field(s)?\b|\brage click\w*\b|\bdead click\w*\b/,

  // ---- MASTERCLASS: growth / lifecycle measurement -------------------------
  /\bnorth star metric\b|\bproduct market fit\b|\bpmf\b|\bproduct hunt\b|\blaunch day\b|\bactivation\b|\baha moment\b|\bonboarding\b/,
  /\b(traffic|marketing|acquisition|distribution) channel(s)?\b|\bchannel (mix|strategy|report|quality)\b|\bcohort analysis\b|\bretention curve\b|\bexpansion revenue\b|\bfeature adoption\b/,

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
  //
  //    Split into strong and weak signals. The old single regex treated bare
  //    "cost" and "how much" as purchase intent, which published masterclass
  //    queries as competitor pricing pages: "canonical tag mistakes that cost
  //    organic traffic" and "how much bandwidth do ai crawlers use" both became
  //    comparison/pricing/transactional. Weak signals now need a product in view.
  {
    test: (s) => {
      if (/\b(pricing|prices|free tier|free plan|paid plan|per month|per year|cheaper|cheapest|affordable|billing)\b/.test(s)) return true;
      if (!/\b(price|cost|costs|how much)\b/.test(s)) return false;
      return BRAND.test(s) || /\b(tools?|software|apps?|platforms?|plans?|subscription|licen[cs]e|seat|tier)\b/.test(s);
    },
    out: { content_type: 'comparison', format: 'pricing', intent: 'transactional' },
  },
  // 4. listicle — explicit ("best x"), and bare product-CATEGORY queries.
  //    A category noun phrase ("privacy friendly analytics", "cookieless
  //    session replay") is commercial shortlist intent, not a blog essay;
  //    without this clause the whole money cluster fell through to blog.
  //    GUARD: a question is never a shortlist. "why is my heatmap all red above
  //    the top" tripped on the substring "the top", and "why is my conversion
  //    rate different in two analytics tools" tripped on "analytics tools" —
  //    both published as commercial listicles. A query that OPENS with an
  //    interrogative and carries no superlative is asking, not shopping.
  {
    test: (s) =>
      !(/^(why|how|what|which|when|where|should|does|do|is|are|can|will|did)\b/.test(s) &&
        !/\b(best|top \d|cheapest|most popular|recommended)\b/.test(s)) &&
      (/\b(best|top|cheap|popular|recommended)\b/.test(s) ||
      /\b(tools?|software|apps?|platforms?|options?) for\b/.test(s) ||
      (/\b(privacy|privacy.?first|privacy.?friendly|cookieless|cookie ?less|gdpr|ccpa|self.?hosted|open.?source|lightweight|simple|minimal|real.?time|free|no.?cookie)\b/.test(s) &&
        /\b(analytics|heat ?maps?|tracking|tracker|session (replay|recording)|dashboard|attribution|funnels?)\b/.test(s)) ||
      /\b(analytics|heat ?map|funnel|attribution|tracking) (tools?|software|apps?|platforms?)\b/.test(s)),
    out: { content_type: 'alternative', format: 'listicle', intent: 'commercial' },
  },
  // 5. how-to / install / migration
  //    MASTERCLASS: procedural shapes that carry no "how to" ("nextjs seo
  //    checklist", "how to audit an existing tracking setup", "ghost blog seo
  //    settings") are walkthroughs, not essays. Note "template" is deliberately
  //    NOT here — it must reach the /tools/ fallback below.
  {
    test: (s) =>
      /\bhow (to|do i|can i)\b/.test(s) ||
      /\b(add|install|set ?up|configure|implement|embed|connect|integrate|track|record|export|migrate|migration|move from|switch (from|to))\b/.test(s) ||
      /\b(checklist|step.?by.?step|walkthrough|audit|convention)\b/.test(s) ||
      /\b(seo|analytics|tracking|privacy|cookie|consent|sitemap) settings\b/.test(s),
    out: { content_type: 'guide', format: 'how-to', intent: 'informational' },
  },
  // 6. troubleshooting
  //    MASTERCLASS: the diagnosis long tail is the highest-trust shape we have,
  //    and it barely overlapped this rule. "why is"/"why are" matched but
  //    "why do my"/"why does my"/"why did my" did not, so "why does my checkout
  //    convert worse on mobile" fell through to a blog essay. The possessive is
  //    load-bearing: "why do llms prefer comparison pages" is an opinion piece,
  //    "why do my pageviews double" is a support problem.
  {
    test: (s) =>
      /\b(not working|not tracking|not showing|not firing|not indexed|doesn'?t work|broken|fix|error|errors|missing|wrong|why is|why are|zero|undercount\w*|skew\w*|troubleshoot|data loss|data gone|thresholding|sampling|blocked|adblock\w*|duplicate)\b/.test(s) ||
      /\bwhy (do|does|did|are|is)? ?(my|our|i|we)\b/.test(s) ||
      /\b(mismatch|do not match|does not match|doubling|inflat\w*|stripped|discrepanc\w*|suddenly|spiking)\b/.test(s),
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
