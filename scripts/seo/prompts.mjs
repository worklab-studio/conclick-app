// Canonical prompts + competitor facts + output schema for the SEO content
// pipeline. The daily generator (generate.mjs) imports these. Keep facts accurate.

export const FACTS = `Conclick — privacy-first web analytics. Pricing: $9/mo (or $7/mo billed yearly), 14-day free trial no card required, optional one-time lifetime deal. What makes it different (do not invent beyond this): (1) Revenue attribution — connects Stripe, Paddle, Polar, Lemon Squeezy, or Dodo and ties every payment back to the source, campaign, and funnel that earned it. (2) Real-screenshot heatmaps and click maps (clicks, scroll depth, rage clicks, dead clicks). (3) Auto-detected funnels that surface your single biggest drop-off and the revenue lost to it. (4) Visual user journeys and a live global visitor map. (5) A hyped daily digest by email + Slack/Discord/Telegram with spikes and milestones. Privacy: cookieless, usually no consent banner needed, GDPR/CCPA-friendly, lightweight script, ~2-minute setup. Also: Google Search Console + GA4 import, goals/conversions with revenue per goal, team sharing + public dashboards. Positioning: for bootstrapped founders and small SaaS/ecommerce teams who distrust vanity metrics and want to know which traffic actually makes money — and where they are losing it.`;

export const VOICE = `VOICE: a founder writing to other founders. First person ("I built Conclick because..."). Blunt, specific, money-first. Be genuinely HONEST — state plainly where the competitor is actually better; that honesty builds trust and is what ranks. Use concrete numbers, real scenarios, and at least one first-hand observation or opinion no other page would have. Vary sentence length hard — mix 4-word sentences with 25-word ones. Never open two consecutive paragraphs with the same word or structure.
BANNED AI TELLS (never use): "in today's fast-paced world", "look no further", "game-changer", "game changer", "unlock", "unleash", "elevate", "seamless", "seamlessly", "robust", "leverage", "delve", "dive in", "navigate the landscape", "when it comes to", "in the world of", "it's worth noting", "that being said", "at the end of the day", "the bottom line is", "in conclusion", "furthermore", "moreover", "a testament to", "plays a crucial role", "in an increasingly", "let's face it", "here's the thing". No listicle filler, no rhetorical-question padding, no empty transition sentences, minimal em-dashes (prefer periods). Do not hedge with "can", "may", "might" when you can state a fact. Write like a smart human who ships product and is slightly impatient.`;

export const RULES = `OUTPUT RULES (return via the structured schema only):
- metaTitle: 50-60 characters, front-load the PRIMARY KEYWORD, compelling. Do NOT append the brand name (the site adds "| Conclick" itself — for comparison pages it is already in the H1, so keep the title clean).
- metaDescription: 140-155 characters, must contain the primary keyword or a close variant, state a specific benefit + an implicit reason to click. No "Learn more", no ellipsis.
- h1: distinct from metaTitle, includes the primary keyword naturally, reads like a human wrote it (not keyword-stuffed).
- tldr: the answer-first summary, 2-3 sentences, <= 320 chars. The FIRST sentence must directly and completely answer the query in a self-contained, quotable way (this is the featured-snippet + AI-Overview + ChatGPT-citation bait). Assume it may be lifted verbatim with no surrounding context.
- intro: 2-3 sentences, founder voice, works in the primary keyword once, naturally.
KEYWORD PLACEMENT (for ranking): the primary keyword (or a natural variant) must appear in the metaTitle, the h1, the FIRST sentence of the tldr, the intro, and at least one h2. Weave in 2-4 semantic variants / related entities across the body. Never stuff — if it reads awkwardly, rephrase.
STRUCTURE (for Google + AI answer engines):
- sections: 'h2' for main sections, 'h3' for sub-points, 'p' for prose, 'ul'/'ol' for lists, exactly one 'callout' with a sharp non-obvious insight. Do NOT emit any 'cta' block (the page template supplies all CTAs).
- Phrase at least half the h2s as the actual question or task a searcher types ("How much does X cost?", "Is X worth it in 2026?") — this wins People-Also-Ask, voice, and AI extraction.
- Include at least one concrete number, benchmark, or specific example in the body. Ground every claim; no vague superlatives.
- Target 1000-1500 words total across sections. Each h2 section should be genuinely useful standalone (AI engines cite sections, not whole pages).
- faq: 6 real, People-Also-Ask-style questions a buyer actually types. Each answer 2-4 sentences, and its FIRST sentence must answer the question directly and self-containedly (AI engines quote FAQ answers in isolation).
ANTI-PENALTY (Google Helpful-Content / scaled-content-abuse): every page must carry one original angle, opinion, or first-hand detail; no boilerplate that could be copy-pasted between pages; no thin restating of the meta description. Demonstrate first-hand experience (E-E-A-T).`;

// The conversion frame for MONEY pages (comparison / alternative / useCase /
// switching-intent guides). The reader is someone paying for — or drowning in —
// another analytics tool. The page's business job is to make switching feel
// SMALL. Bolted on to the sell-side briefs; never to masterclass content.
export const SWITCHING = `SWITCHING FRAME (this page sells; the reader currently uses another tool):
- Assume the reader is mid-frustration: a bill that grew, a dashboard they dread, a number they cannot find. Name that feeling specifically in the intro; do not describe the category.
- Somewhere natural, answer the three switch-blockers in plain words:
  1) Effort: one script tag, ~2-minute setup, and Search Console + GA4 import so history comes along.
  2) Risk: the old tool keeps running; nothing is lost by trying it next to what they have during the 14-day trial (no card).
  3) Cost: $9/month flat ($7/mo yearly). When their current tool's price is public and you are CERTAIN, contrast the models (per-seat, per-event, per-session vs flat); otherwise contrast pricing MODELS only, never invented figures.
- NEVER trash the incumbent. The reader chose it once; insulting it insults them. Respect what it does well, then show the specific job it is not doing (usually: tying traffic to revenue).
- The wedge sentence every money page must earn its version of: the moment analytics shows WHICH traffic makes money, it stops being a reporting cost and becomes a decision tool. Phrase it in the page's own context; never paste this sentence.
- End sections that resolve a pain with the smallest possible next step (look at one report, run the trial next to the old tool), not a hard sell.
All honesty laws still bind: qualified consent-banner claims, sourced competitor claims, disclosed lineage, no invented numbers. A switching page that overclaims converts once and churns; the honest version compounds.`;

// The masterclass hub changes what a "good" page is for editorial content.
// Product pages (comparison / alternative / useCase) still sell. Guides, blog
// posts and glossary entries on general SEO, GEO, measurement, CRO and growth
// exist to earn topical authority, links and AI citation — which is what makes
// the money pages rank later. A page that pitches Conclick into a topic it does
// not belong in fails at BOTH jobs: it does not rank and it does not convert.
//
// Appended to the glossary / guide / blog briefs only. Never to compPrompt or
// useCasePrompt — those pages are supposed to sell.
export const MASTERCLASS = `MASTERCLASS RULE (this page is authority content, not a pitch):
- The page must be genuinely, completely useful ON ITS OWN to a reader who has never heard of Conclick and never will. Someone should be able to act on it with no product, no signup, and no further reading.
- Mention Conclick ONLY where it is honestly, specifically relevant to the point being made — which for most topics on this list is NOT AT ALL. If the honest answer involves server logs, Search Console, a spreadsheet, a competitor's tool, or just thinking harder, say that.
- A page that never mentions Conclick once is a SUCCESS, not a failure. Its job is authority, links and citation. Do not treat the absence of a product mention as a gap to fill.
- NEVER bend the topic toward the product. Do not invent a Conclick angle, do not steer the conclusion toward a feature, do not add a "how Conclick helps" section because the structure feels like it wants one, and do not close by implying the reader needs a tool when they do not.
- If you do mention Conclick, it must be one honest, specific, subordinate sentence that a skeptical reader would agree is fair — not a paragraph, not a recommendation, not a comparison the topic did not ask for.
- Where Conclick genuinely cannot do the thing being discussed, say so plainly if it comes up. Being caught overclaiming costs more authority than the mention could ever earn.
- Recommending a competitor, a free tool, or no tool at all is CORRECT when it is the honest answer. Do not hedge around it.
All the honesty, voice and anti-penalty rules above still apply in full. This rule constrains the pitch; it does not relax the standard of the writing.`;

export const COMP = {
  plausible: { name: 'Plausible', url: 'https://plausible.io', knownFor: 'Simple, open-source, privacy-first traffic analytics; lightweight script; EU-hosted.', lacks: 'No heatmaps, no revenue attribution; funnels/goals are basic; ecommerce behind higher tiers.' },
  fathom: { name: 'Fathom Analytics', url: 'https://usefathom.com', knownFor: 'Clean, simple privacy-first analytics; fast; no cookie banner.', lacks: 'No heatmaps, no funnels, no revenue attribution.' },
  'google-analytics': { name: 'Google Analytics 4', url: 'https://analytics.google.com', knownFor: 'Free, ubiquitous, deep reporting and audiences; integrates with Google Ads.', lacks: 'Steep learning curve, data sampling, cookie consent required, no revenue attribution tied to sessions out of the box, privacy concerns.' },
  matomo: { name: 'Matomo', url: 'https://matomo.org', knownFor: 'Powerful open-source GA alternative; self-hostable; heatmaps as a paid plugin.', lacks: 'Heavier to run/self-host; heatmaps and some features are paid add-ons; no first-class revenue attribution.' },
  umami: { name: 'Umami', url: 'https://umami.is', knownFor: 'Open-source, simple, privacy-first analytics; self-hostable.', lacks: 'No heatmaps, no revenue attribution, basic funnels; you manage hosting.' },
  'simple-analytics': { name: 'Simple Analytics', url: 'https://simpleanalytics.com', knownFor: 'Minimal, privacy-first, beautiful single-page dashboard.', lacks: 'No heatmaps, no funnels, no revenue attribution.' },
  posthog: { name: 'PostHog', url: 'https://posthog.com', knownFor: 'Powerful product analytics: funnels, retention, session replay, feature flags, A/B tests.', lacks: 'Complex and heavier for simple web analytics; not privacy-first by default; revenue tracking needs setup.' },
  pirsch: { name: 'Pirsch', url: 'https://pirsch.io', knownFor: 'Cookie-free, privacy-first analytics for developers; simple.', lacks: 'No heatmaps, limited funnels, no revenue attribution.' },
  datafast: { name: 'DataFast', url: 'https://datafa.st', knownFor: 'Revenue analytics for founders — attributes revenue to marketing channels.', lacks: 'No heatmaps, no visual journeys; narrower behavioral feature set than Conclick.' },
  hotjar: { name: 'Hotjar', url: 'https://hotjar.com', knownFor: 'Heatmaps, session recordings, surveys, feedback.', lacks: 'Not a full analytics tool, no revenue attribution, can be pricey; sampling on lower tiers.' },
  clarity: { name: 'Microsoft Clarity', url: 'https://clarity.microsoft.com', knownFor: 'Free heatmaps and session recordings.', lacks: 'No revenue attribution, limited traffic analytics/funnels, data goes to Microsoft.' },
  mixpanel: { name: 'Mixpanel', url: 'https://mixpanel.com', knownFor: 'Event-based product analytics: funnels, retention, cohorts.', lacks: 'Complex setup, not privacy-first by default, pricey at scale, no heatmaps.' },
  amplitude: { name: 'Amplitude', url: 'https://amplitude.com', knownFor: 'Enterprise product analytics: behavioral cohorts, funnels, experimentation.', lacks: 'Overkill and expensive for small teams, steep learning curve, not privacy-first, no heatmaps, no first-class revenue attribution to marketing source.' },
  heap: { name: 'Heap', url: 'https://heap.io', knownFor: 'Autocapture product analytics — records everything so you can analyze events retroactively.', lacks: 'Enterprise pricing, heavy, not privacy-first by default, no revenue-to-source attribution, no real-screenshot heatmaps.' },
  'cloudflare-web-analytics': { name: 'Cloudflare Web Analytics', url: 'https://www.cloudflare.com/web-analytics/', knownFor: 'Free, privacy-first, cookieless traffic counts with no performance hit.', lacks: 'Very basic — no heatmaps, no funnels, no goals, no revenue attribution, no user journeys.' },
  'vercel-analytics': { name: 'Vercel Web Analytics', url: 'https://vercel.com/analytics', knownFor: 'Privacy-friendly pageview and Web Vitals analytics baked into Vercel deploys.', lacks: 'Pageview-level only, priced per event, no heatmaps, no funnels, no revenue attribution, tied to Vercel hosting.' },
  goatcounter: { name: 'GoatCounter', url: 'https://www.goatcounter.com', knownFor: 'Free/open-source, privacy-friendly, extremely lightweight traffic counter.', lacks: 'Minimal by design — no heatmaps, no funnels, no goals, no revenue attribution.' },
};

// The primary keyword each page targets. Topics may override with topic.keyword;
// otherwise we derive the obvious high-intent query from the type.
export function keywordFor(t) {
  if (t.keyword) return t.keyword;
  if (t.kind === 'alternative') return `${t.comp.name} alternative`;
  if (t.kind === 'comparison') return `Conclick vs ${t.comp.name}`;
  if (t.kind === 'glossary') return String(t.title).replace(/\s*\(.*\)\s*$/, '').toLowerCase();
  if (t.kind === 'useCase') return `${t.title} analytics`;
  return String(t.title || '').toLowerCase();
}

export function compPrompt(c, kind, keyword) {
  const framing = kind === 'alternative'
    ? `Write a page targeting the search "${c.name} alternative" — the reader already uses or knows ${c.name} and wants a better or different option. Frame Conclick as the alternative that adds revenue attribution, heatmaps, and auto-funnels, while being honest about what ${c.name} does well.`
    : `Write a head-to-head "Conclick vs ${c.name}" comparison page.`;
  return `${framing}

PRIMARY KEYWORD (target this exact search intent): "${keyword}"

PRODUCT FACTS (do not contradict or invent beyond this):
${FACTS}

COMPETITOR — ${c.name} (${c.url})
Genuinely good at: ${c.knownFor}
Where it falls short: ${c.lacks}

${VOICE}

${RULES}

EXTRA for this comparison: include exactly one section block of {type:'comparisonTable'} at the point the table should render, and a dedicated 'h2' section that honestly explains where ${c.name} is the better choice. Provide comparisonRows: 7-9 fair feature rows comparing Conclick vs ${c.name}. Use boolean true/false for clear yes/no capabilities and short strings (<=4 words) for nuanced cells. Include at least one row where ${c.name} wins or ties. Be fair, not a hit piece.`;
}

/**
 * Is this an AUTHORITY page rather than a product page?
 *
 * Only editorial kinds can qualify — comparison / alternative / useCase pages
 * exist to sell and are never masterclass. Within the editorial kinds, a page
 * is a product page when the product IS the answer: an integration walkthrough
 * ("how to add analytics to Framer") or anything naming a competitor. Every
 * other guide, glossary entry and blog post is masterclass by DEFAULT — the
 * default matters, because the failure mode we are correcting is pitching
 * Conclick into topics it does not belong in.
 *
 * Callers that know the seed cluster can override with t.masterclass.
 */
const PRODUCT_SURFACE = [
  /\b(plausible|fathom|matomo|piwik|posthog|mixpanel|amplitude|hotjar|clarity|umami|pirsch|swetrix|goatcounter|datafast|fullstory|smartlook|mouseflow|crazy ?egg|lucky orange|ga4|google analytics|universal analytics|conclick)\b/,
  /\b(add|install|set ?up|integrate|connect|embed) [a-z0-9 ]*\b(analytics|heat ?map|tracking (script|code)|session (replay|recording)|conclick)\b/,
  /\bself.?host\w*\b|\bmcp\b|\bmodel context protocol\b/,
];

export function isMasterclass(t) {
  if (typeof t?.masterclass === 'boolean') return t.masterclass;
  if (!['glossary', 'guide', 'blog'].includes(t?.kind)) return false;
  const s = `${t.title || ''} ${t.keyword || ''}`.toLowerCase();
  return !PRODUCT_SURFACE.some((re) => re.test(s));
}

// Product pages get the sell-side framing; masterclass pages get the brief that
// tells the writer an unmentioned Conclick is a win.
const factsBlock = (mc, sellLine) => mc
  ? `PRODUCT FACTS (context ONLY — for your understanding of who publishes this page. Do NOT work these into the page unless one is directly, honestly relevant to a point you are already making):
${FACTS}

${MASTERCLASS}`
  : `PRODUCT FACTS (${sellLine}):
${FACTS}`;

export function glossaryPrompt(t, keyword) {
  const mc = isMasterclass(t);
  return `Write an authoritative glossary/definition page for the term: "${t.title}" (in the context of web analytics and growth). The reader searched this term to understand it.

PRIMARY KEYWORD (target this exact search intent): "${keyword}"

${factsBlock(mc, 'mention Conclick only briefly and only where genuinely relevant, near the end — this is an educational page, not an ad')}

${VOICE}

${RULES}

Structure: tldr = a crisp, quotable 1-2 sentence definition. sections: what it is, why it matters, how to measure/use it correctly, and common mistakes.${mc ? ' Do NOT add a "how Conclick handles it" section — this is a reference entry and it should end on the reader\'s problem, not on the product.' : ' Then a short note on how Conclick handles it.'} Do NOT include a comparisonTable. Do NOT include comparisonRows.`;
}

export function useCasePrompt(t, keyword) {
  return `Write an "Analytics for ${t.title}" page — who they are, what they actually need from analytics, and how Conclick fits.

PRIMARY KEYWORD (target this exact search intent): "${keyword}"

PRODUCT FACTS:
${FACTS}

${VOICE}

${RULES}

Structure: tldr = the one-line answer for why ${t.title} should care. sections: the metrics that actually matter for ${t.title}, the mistakes they make with generic analytics, how Conclick's revenue attribution + funnels + heatmaps apply to their situation, and setup. No comparisonTable, no comparisonRows.`;
}

export function guidePrompt(t, keyword) {
  const mc = isMasterclass(t);
  return `Write a genuinely useful, opinionated how-to guide titled: "${t.title}". This is editorial/educational, founder voice, NOT a sales page${mc ? '' : ' (mention Conclick only where it honestly helps, briefly)'}.

PRIMARY KEYWORD (target this exact search intent): "${keyword}"

${factsBlock(mc, 'for the brief, relevant mention only')}

${VOICE}

${RULES}

Structure: tldr = the key takeaway up front. sections: a clear, practical walkthrough or argument with concrete steps and examples.${mc ? ' The reader must be able to finish this guide and actually do the thing, using whatever tools they already have. If a step genuinely requires something Conclick does not do, name what does it.' : ''} No comparisonTable, no comparisonRows.`;
}

export function blogPrompt(t, keyword) {
  const mc = isMasterclass(t);
  return `Write an opinionated blog post titled: "${t.title}". This is editorial thought-leadership in the founder's voice — a real point of view backed by specifics, not a generic explainer. Take a clear stance.

PRIMARY KEYWORD (target this search intent): "${keyword}"

${factsBlock(mc, 'weave Conclick in only where it genuinely supports the argument — this is a post, not an ad')}

${VOICE}

${RULES}

Structure: tldr = the thesis in 1-2 sharp, quotable sentences. sections: open with a concrete hook or a claim most people get wrong, build the argument with real examples and numbers, include one contrarian or non-obvious point, and land on what the reader should actually do differently.${mc ? ' The closing move is what the reader should DO, never what they should buy.' : ''} No comparisonTable, no comparisonRows.`;
}

export function promptFor(t) {
  const kw = keywordFor(t);
  if (t.kind === 'comparison' || t.kind === 'alternative') return compPrompt(t.comp, t.kind, kw);
  if (t.kind === 'glossary') return glossaryPrompt(t, kw);
  if (t.kind === 'useCase') return useCasePrompt(t, kw);
  if (t.kind === 'blog') return blogPrompt(t, kw);
  return guidePrompt(t, kw);
}

export const DRAFT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['h1', 'metaTitle', 'metaDescription', 'tldr', 'intro', 'sections', 'faq'],
  properties: {
    h1: { type: 'string' },
    metaTitle: { type: 'string' },
    metaDescription: { type: 'string' },
    tldr: { type: 'string' },
    intro: { type: 'string' },
    sections: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['type'],
        properties: {
          type: { type: 'string', enum: ['h2', 'h3', 'p', 'ul', 'ol', 'quote', 'callout', 'comparisonTable', 'cta'] },
          text: { type: 'string' },
          items: { type: 'array', items: { type: 'string' } },
          id: { type: 'string' },
          cite: { type: 'string' },
          variant: { type: 'string' },
        },
      },
    },
    faq: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['question', 'answer'],
        properties: { question: { type: 'string' }, answer: { type: 'string' } },
      },
    },
    // Optional pass-throughs that lib.mjs assembleEntry already consumes. They
    // have to be declared even though nothing validates against this schema
    // today: with additionalProperties:false, the first consumer to pick it up
    // would silently strip a draft's citation list, which is the one field the
    // content laws treat as non-negotiable for competitor claims.
    heroWord: { type: 'string' },
    category: { type: 'string' },
    topics: { type: 'array', items: { type: 'string' } },
    sources: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'url'],
        properties: { label: { type: 'string' }, url: { type: 'string' } },
      },
    },
    comparisonRows: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['feature', 'conclick', 'competitor'],
        properties: {
          feature: { type: 'string' },
          conclick: { type: ['string', 'boolean'] },
          competitor: { type: ['string', 'boolean'] },
          note: { type: 'string' },
        },
      },
    },
  },
};
