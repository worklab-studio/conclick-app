// The content backlog. The daily generator walks this list top-to-bottom and
// produces the next topic that doesn't yet have a file on disk. Order = priority
// (highest-intent / fastest-to-rank first). Add rows to grow the site; each topic
// may carry an explicit `keyword` (the exact query it targets) — otherwise the
// pipeline derives the obvious one in keywordFor().

import { COMP } from './prompts.mjs';

// Bottom-funnel first (highest commercial intent), then long-tail informational.
const COMPARE_KEYS = [
  'plausible', 'fathom', 'google-analytics', 'matomo', 'umami', 'simple-analytics',
  'posthog', 'pirsch', 'datafast', 'hotjar', 'clarity', 'mixpanel',
  'amplitude', 'heap', 'cloudflare-web-analytics', 'vercel-analytics', 'goatcounter',
];
const ALT_KEYS = [
  'google-analytics', 'plausible', 'fathom', 'matomo', 'hotjar', 'mixpanel',
  'posthog', 'umami', 'simple-analytics', 'clarity', 'amplitude', 'heap',
];

// { slug, title, keyword? } — keyword overrides the derived term when the exact
// high-volume query differs from the display title.
const GLOSSARY = [
  { slug: 'utm', title: 'UTM parameters' },
  { slug: 'marketing-attribution', title: 'Marketing attribution' },
  { slug: 'bounce-rate', title: 'Bounce rate' },
  { slug: 'conversion-funnel', title: 'Conversion funnel' },
  { slug: 'sessions-vs-visitors', title: 'Sessions vs visitors' },
  { slug: 'first-party-cookies', title: 'First-party cookies' },
  { slug: 'cookieless-analytics', title: 'Cookieless analytics' },
  { slug: 'gdpr-compliant-analytics', title: 'GDPR-compliant analytics' },
  { slug: 'heatmap', title: 'Heatmap (website)', keyword: 'website heatmap' },
  { slug: 'revenue-attribution', title: 'Revenue attribution' },
  { slug: 'click-tracking', title: 'Click tracking' },
  { slug: 'scroll-depth', title: 'Scroll depth' },
  { slug: 'conversion-rate', title: 'Conversion rate' },
  { slug: 'customer-acquisition-cost', title: 'Customer acquisition cost (CAC)', keyword: 'customer acquisition cost' },
  { slug: 'customer-lifetime-value', title: 'Customer lifetime value (LTV)', keyword: 'customer lifetime value' },
  { slug: 'churn-rate', title: 'Churn rate' },
  { slug: 'north-star-metric', title: 'North star metric' },
  { slug: 'event-tracking', title: 'Event tracking' },
  { slug: 'cohort-analysis', title: 'Cohort analysis' },
  { slug: 'referral-traffic', title: 'Referral traffic' },
  { slug: 'direct-traffic', title: 'Direct traffic' },
  { slug: 'session-duration', title: 'Average session duration', keyword: 'average session duration' },
  { slug: 'exit-rate', title: 'Exit rate' },
  { slug: 'ab-testing', title: 'A/B testing' },
  { slug: 'server-side-tracking', title: 'Server-side tracking' },
  { slug: 'attribution-models', title: 'Attribution models' },
  { slug: 'rage-click', title: 'Rage click' },
  { slug: 'goal-conversion', title: 'Goal conversion' },
];

const USECASES = [
  { slug: 'saas', title: 'SaaS' },
  { slug: 'ecommerce', title: 'Ecommerce' },
  { slug: 'agencies', title: 'Agencies' },
  { slug: 'indie-hackers', title: 'Indie hackers' },
  { slug: 'newsletters', title: 'Newsletters and creators' },
  { slug: 'startups', title: 'Startups' },
  { slug: 'bloggers', title: 'Bloggers', keyword: 'blog analytics' },
  { slug: 'developers', title: 'Developers' },
  { slug: 'shopify-stores', title: 'Shopify stores', keyword: 'shopify analytics' },
  { slug: 'course-creators', title: 'Course creators' },
];

const GUIDES = [
  { slug: 'is-ga4-sampling-your-data', title: 'Is GA4 sampling your data? How to tell and what to do', keyword: 'ga4 sampling' },
  { slug: 'gdpr-analytics-checklist', title: 'The GDPR-compliant analytics checklist for 2026', keyword: 'gdpr analytics checklist' },
  { slug: 'how-to-read-a-funnel', title: 'How to read a conversion funnel and fix the biggest leak', keyword: 'how to read a conversion funnel' },
  { slug: 'ga4-migration-guide', title: 'Migrating off Google Analytics 4: a practical guide', keyword: 'ga4 migration' },
  { slug: 'cookie-banner-free-analytics', title: 'How to run analytics without a cookie banner', keyword: 'analytics without cookie banner' },
  { slug: 'how-to-track-conversions', title: 'How to track conversions on your website (2026)', keyword: 'how to track conversions' },
  { slug: 'utm-best-practices', title: 'UTM tracking best practices that keep your data clean', keyword: 'utm best practices' },
  { slug: 'reduce-bounce-rate', title: 'How to actually reduce your bounce rate', keyword: 'how to reduce bounce rate' },
  { slug: 'attribution-models-explained', title: 'Attribution models explained: which one to use', keyword: 'marketing attribution models' },
  { slug: 'measure-marketing-roi', title: 'How to measure marketing ROI for a small SaaS', keyword: 'how to measure marketing roi' },
  { slug: 'set-up-conversion-goals', title: 'How to set up conversion goals the right way', keyword: 'how to set up conversion goals' },
  { slug: 'stripe-revenue-analytics', title: 'How to connect Stripe revenue to your marketing data', keyword: 'stripe revenue analytics' },
];

// Integration/how-to-install pages — dev long-tail, low competition, scale well.
const INTEGRATIONS = [
  { slug: 'add-analytics-to-nextjs', title: 'How to add analytics to a Next.js site', keyword: 'nextjs analytics' },
  { slug: 'add-analytics-to-astro', title: 'How to add analytics to an Astro site', keyword: 'astro analytics' },
  { slug: 'add-analytics-to-webflow', title: 'How to add analytics to Webflow', keyword: 'webflow analytics' },
  { slug: 'add-analytics-to-shopify', title: 'How to add privacy-first analytics to Shopify', keyword: 'shopify analytics' },
  { slug: 'add-analytics-to-framer', title: 'How to add analytics to a Framer site', keyword: 'framer analytics' },
  { slug: 'add-analytics-to-wordpress', title: 'How to add cookieless analytics to WordPress', keyword: 'wordpress analytics' },
  { slug: 'add-analytics-to-react', title: 'How to add analytics to a React app', keyword: 'react analytics' },
  { slug: 'add-analytics-to-vue', title: 'How to add analytics to a Vue app', keyword: 'vue analytics' },
  { slug: 'add-analytics-to-svelte', title: 'How to add analytics to a SvelteKit app', keyword: 'sveltekit analytics' },
];

// Blog posts — opinionated editorial. Existing seeded posts stay; these extend it.
const BLOG = [
  { slug: 'stop-checking-google-analytics', title: 'Stop checking Google Analytics every morning', keyword: 'checking google analytics' },
  { slug: 'traffic-without-revenue-is-a-vanity-trap', title: 'Traffic without revenue is a vanity trap', keyword: 'traffic vs revenue' },
  { slug: 'what-founders-get-wrong-about-attribution', title: 'What founders get wrong about attribution', keyword: 'marketing attribution mistakes' },
  { slug: 'privacy-first-analytics-is-not-a-tradeoff', title: 'Privacy-first analytics is not a tradeoff anymore', keyword: 'privacy first analytics' },
  { slug: 'the-one-metric-early-saas-should-obsess-over', title: 'The one metric early SaaS should obsess over', keyword: 'most important saas metric' },
  { slug: 'why-your-funnel-is-lying-to-you', title: 'Why your funnel is lying to you', keyword: 'conversion funnel mistakes' },
  { slug: 'heatmaps-are-underrated', title: 'Heatmaps are underrated for small teams', keyword: 'website heatmaps' },
  { slug: 'ga4-is-not-built-for-founders', title: 'GA4 is not built for founders (and that is fine)', keyword: 'ga4 for founders' },
];

// type -> directory, mirrors lib.mjs DIR.
const DIRS = {
  comparison: 'comparisons',
  alternative: 'alternatives',
  glossary: 'glossary',
  useCase: 'use-cases',
  guide: 'guides',
  blog: 'blog',
};

export const TOPICS = [
  ...COMPARE_KEYS.map(k => ({ type: 'comparison', slug: k, kind: 'comparison', comp: COMP[k], dir: DIRS.comparison })),
  ...ALT_KEYS.map(k => ({ type: 'alternative', slug: k, kind: 'alternative', comp: COMP[k], dir: DIRS.alternative })),
  ...GLOSSARY.map(t => ({ type: 'glossary', slug: t.slug, kind: 'glossary', title: t.title, keyword: t.keyword, dir: DIRS.glossary })),
  ...USECASES.map(u => ({ type: 'useCase', slug: u.slug, kind: 'useCase', title: u.title, keyword: u.keyword, dir: DIRS.useCase })),
  ...GUIDES.map(g => ({ type: 'guide', slug: g.slug, kind: 'guide', title: g.title, keyword: g.keyword, dir: DIRS.guide })),
  ...INTEGRATIONS.map(g => ({ type: 'guide', slug: g.slug, kind: 'guide', title: g.title, keyword: g.keyword, dir: DIRS.guide })),
  ...BLOG.map(b => ({ type: 'blog', slug: b.slug, kind: 'blog', title: b.title, keyword: b.keyword, dir: DIRS.blog })),
];
