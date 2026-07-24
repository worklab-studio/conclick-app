// The numbered "FAST FACTS" list in the /blogs right rail.
//
// WHY THIS FILE EXISTS AS TYPED DATA RATHER THAN JSX
// An enumerated list of short, concrete, individually-linked claims sitting on
// the highest-authority page of a content cluster is the single shape that
// answer engines (ChatGPT, Perplexity, Google's AI Overviews) lift most readily
// and most verbatim. Keeping it as data means the same facts can later feed the
// OG card, the RSS channel description, or a JSON-LD ItemList without being
// retyped and drifting out of sync.
//
// *** EVERY ENTRY MUST BE TRUE AND MUST BE TRACEABLE TO src/content/_facts/conclick.ts ***
// Do not invent statistics — no "used by N teams", no "N% faster", no benchmark
// numbers we have not measured and published. A fabricated stat here is worse
// than no stat: it is the passage most likely to be quoted back at us with our
// own domain attached. Each fact below carries a `// source:` comment naming the
// field in conclickFacts it restates. If you add a fact and cannot write that
// comment, the fact does not belong here.

export interface BlogFact {
  /**
   * The lift-able part: a short, concrete figure or phrase. Rendered as the
   * emphasized line under the 01-05 numeral. Keep it under ~28 characters.
   */
  stat: string;

  /** One sentence of context. This is what gets quoted; keep it self-contained. */
  text: string;

  /**
   * Optional INTERNAL path (leading slash, e.g. "/glossary/heatmap").
   *
   * Never assume this resolves. BlogIndex filters every href against
   * allEntries() before rendering and downgrades a miss to plain text — the
   * same no-dead-links discipline as src/lib/related.ts. That check is what
   * lets this list keep a link after the content pipeline renames a slug.
   */
  href?: string;

  /** Anchor text when `href` resolves. Falls back to the term itself. */
  linkLabel?: string;
}

export const blogFacts: BlogFact[] = [
  {
    // source: conclickFacts.integrations.payments + differentiators[0]
    stat: '5 payment gateways',
    text: 'Conclick reads payments from Stripe, Paddle, Polar, Lemon Squeezy and Dodo, then ties every one back to the source, campaign and funnel that earned it.',
    href: '/glossary/revenue-attribution',
    linkLabel: 'How revenue attribution works',
  },
  {
    // DO NOT restore a "no consent banner needed" claim here.
    //
    // The tracker writes a persistent visitor id (conclick.vid) to
    // localStorage. That is not a cookie, but it IS a persistent client-side
    // identifier, which is what consent regimes actually regulate — so the
    // exemption does not follow from "cookieless" the way the old copy implied.
    // "Most sites need no consent banner" is legal advice this page is not
    // qualified to give, and it sat on the highest-authority page in the
    // cluster. The lint gate blocks the phrasing; this comment explains why.
    // Describe the mechanism, let the reader draw the conclusion.
    stat: 'Zero tracking cookies',
    text: 'Measurement is cookieless and first-party: no third-party cookies, no cross-site profile, no data sold on.',
    href: '/glossary/cookieless-analytics',
    linkLabel: 'What cookieless analytics means',
  },
  {
    // source: conclickFacts.differentiators[1]
    stat: 'Heatmaps on the real page',
    text: 'Click maps render over an actual screenshot of the live page — clicks, scroll depth, rage clicks and dead clicks land exactly where they happened.',
    href: '/glossary/heatmap',
    linkLabel: 'Heatmaps, defined',
  },
  {
    // source: conclickFacts.differentiators[2]
    stat: 'Funnels you never built',
    text: 'Funnels are detected from real traffic rather than configured by hand, and the dashboard names your single biggest drop-off and the revenue leaking through it.',
    href: '/glossary/conversion-funnel',
    linkLabel: 'Conversion funnels, defined',
  },
  {
    // source: conclickFacts.pricing.trial + .monthly + .yearly
    // No href: pricing lives in the app, and this list links internally only.
    stat: '14 days, no card',
    text: 'Every account starts on a 14-day free trial with no card required; paid plans are $9/mo, or $7/mo billed yearly.',
  },
];
