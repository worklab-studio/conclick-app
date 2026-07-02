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

export function glossaryPrompt(t, keyword) {
  return `Write an authoritative glossary/definition page for the term: "${t.title}" (in the context of web analytics and growth). The reader searched this term to understand it.

PRIMARY KEYWORD (target this exact search intent): "${keyword}"

PRODUCT FACTS (mention Conclick only briefly and only where genuinely relevant, near the end — this is an educational page, not an ad):
${FACTS}

${VOICE}

${RULES}

Structure: tldr = a crisp, quotable 1-2 sentence definition. sections: what it is, why it matters, how to measure/use it correctly, common mistakes, and a short note on how Conclick handles it. Do NOT include a comparisonTable. Do NOT include comparisonRows.`;
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
  return `Write a genuinely useful, opinionated how-to guide titled: "${t.title}". This is editorial/educational, founder voice, NOT a sales page (mention Conclick only where it honestly helps, briefly).

PRIMARY KEYWORD (target this exact search intent): "${keyword}"

PRODUCT FACTS (for the brief, relevant mention only):
${FACTS}

${VOICE}

${RULES}

Structure: tldr = the key takeaway up front. sections: a clear, practical walkthrough or argument with concrete steps and examples. No comparisonTable, no comparisonRows.`;
}

export function blogPrompt(t, keyword) {
  return `Write an opinionated blog post titled: "${t.title}". This is editorial thought-leadership in the founder's voice — a real point of view backed by specifics, not a generic explainer. Take a clear stance.

PRIMARY KEYWORD (target this search intent): "${keyword}"

PRODUCT FACTS (weave Conclick in only where it genuinely supports the argument — this is a post, not an ad):
${FACTS}

${VOICE}

${RULES}

Structure: tldr = the thesis in 1-2 sharp, quotable sentences. sections: open with a concrete hook or a claim most people get wrong, build the argument with real examples and numbers, include one contrarian or non-obvious point, and land on what the reader should actually do differently. No comparisonTable, no comparisonRows.`;
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
