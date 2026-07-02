// Canonical, single-source-of-truth product facts. The content pipeline feeds
// this to Claude Sonnet so it never hallucinates product claims, and the
// comparison templates pull defaults from here. Keep it accurate — every page
// inherits it.

export const conclickFacts = {
  name: 'Conclick',
  tagline: 'Analytics, heatmaps, funnels, and revenue — in one dashboard',
  url: 'https://conclick.io',
  appUrl: 'https://app.conclick.io',
  category: 'Privacy-first web analytics',

  pricing: {
    monthly: '$9/mo',
    yearly: '$7/mo billed yearly',
    trial: '14-day free trial, no card required',
    lifetime: 'optional one-time lifetime deal',
  },

  // The things only Conclick (vs the privacy-analytics field) brings together.
  differentiators: [
    'Revenue attribution — connects Stripe, Paddle, Polar, Lemon Squeezy, or Dodo and ties every payment back to the source, campaign, and funnel that earned it',
    'Real-screenshot heatmaps and click maps (clicks, scroll depth, rage/dead clicks)',
    'Auto-detected funnels that surface your single biggest drop-off and the revenue lost to it',
    'Visual user journeys and a live global visitor map',
    'A hyped daily digest (email + Slack/Discord/Telegram) with spikes and milestones',
  ],

  features: [
    'Real-time analytics + live visitor map',
    'Privacy-first: cookieless, no consent banner usually needed, GDPR/CCPA-friendly',
    'Heatmaps + click maps',
    'Auto-detected funnels + biggest-leak diagnosis',
    'Goals & conversions with revenue per goal',
    'Visual user journeys',
    'Revenue attribution across 5 payment gateways',
    'Google Search Console + GA4 import',
    'Team sharing + public dashboards',
    'Lightweight script, ~2-minute setup',
  ],

  integrations: {
    payments: ['Stripe', 'Paddle', 'Polar', 'Lemon Squeezy', 'Dodo'],
    search: ['Google Search Console', 'Google Analytics 4 import'],
    alerts: ['Slack', 'Discord', 'Telegram'],
  },

  positioning:
    'Conclick is for bootstrapped founders and small SaaS/ecommerce teams who distrust vanity metrics and want to know which traffic actually makes money — and where they are losing it.',

  // What rivals are genuinely known for + what they lack. Used to write HONEST
  // comparisons (say where the competitor wins) — which is what builds trust and
  // clears Google's helpful-content bar. Keep factual and fair.
  competitors: {
    plausible: {
      name: 'Plausible',
      url: 'https://plausible.io',
      knownFor: 'Simple, open-source, privacy-first traffic analytics; lightweight script; EU-hosted.',
      lacks: 'No heatmaps, no revenue attribution; funnels/goals are basic; ecommerce behind higher tiers.',
    },
    fathom: {
      name: 'Fathom Analytics',
      url: 'https://usefathom.com',
      knownFor: 'Clean, simple privacy-first analytics; fast; no cookie banner.',
      lacks: 'No heatmaps, no funnels, no revenue attribution.',
    },
    'google-analytics': {
      name: 'Google Analytics 4',
      url: 'https://analytics.google.com',
      knownFor: 'Free, ubiquitous, deep reporting and audiences; integrates with Google Ads.',
      lacks: 'Steep learning curve, data sampling, cookie consent required, no revenue attribution tied to sessions out of the box, privacy concerns.',
    },
    matomo: {
      name: 'Matomo',
      url: 'https://matomo.org',
      knownFor: 'Powerful open-source GA alternative; self-hostable; heatmaps as a paid plugin.',
      lacks: 'Heavier to run/self-host; heatmaps and some features are paid add-ons; no first-class revenue attribution.',
    },
    umami: {
      name: 'Umami',
      url: 'https://umami.is',
      knownFor: 'Open-source, simple, privacy-first analytics; self-hostable.',
      lacks: 'No heatmaps, no revenue attribution, basic funnels; you manage hosting.',
    },
    'simple-analytics': {
      name: 'Simple Analytics',
      url: 'https://simpleanalytics.com',
      knownFor: 'Minimal, privacy-first, beautiful single-page dashboard.',
      lacks: 'No heatmaps, no funnels, no revenue attribution.',
    },
    posthog: {
      name: 'PostHog',
      url: 'https://posthog.com',
      knownFor: 'Powerful product analytics: funnels, retention, session replay, feature flags, A/B tests.',
      lacks: 'Complex and heavier for simple web analytics; not privacy-first by default; revenue tracking needs setup.',
    },
    pirsch: {
      name: 'Pirsch',
      url: 'https://pirsch.io',
      knownFor: 'Cookie-free, privacy-first analytics for developers; simple.',
      lacks: 'No heatmaps, limited funnels, no revenue attribution.',
    },
    datafast: {
      name: 'DataFast',
      url: 'https://datafa.st',
      knownFor: 'Revenue analytics for founders — attributes revenue to marketing channels.',
      lacks: 'No heatmaps, no visual journeys; narrower behavioral feature set than Conclick.',
    },
    hotjar: {
      name: 'Hotjar',
      url: 'https://hotjar.com',
      knownFor: 'Heatmaps, session recordings, surveys, feedback.',
      lacks: 'Not a full analytics tool, no revenue attribution, can be pricey; sampling on lower tiers.',
    },
    clarity: {
      name: 'Microsoft Clarity',
      url: 'https://clarity.microsoft.com',
      knownFor: 'Free heatmaps and session recordings.',
      lacks: 'No revenue attribution, limited traffic analytics/funnels, data goes to Microsoft.',
    },
    mixpanel: {
      name: 'Mixpanel',
      url: 'https://mixpanel.com',
      knownFor: 'Event-based product analytics: funnels, retention, cohorts.',
      lacks: 'Complex setup, not privacy-first by default, pricey at scale, no heatmaps.',
    },
  },
} as const;

export type CompetitorKey = keyof typeof conclickFacts.competitors;
