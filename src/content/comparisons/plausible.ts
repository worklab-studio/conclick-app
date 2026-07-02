import type { ContentEntry } from '../schema';

const entry: ContentEntry = {
  type: 'comparison',
  slug: 'plausible',
  h1: 'Conclick vs Plausible: which privacy analytics actually shows you revenue?',
  metaTitle: 'Conclick vs Plausible (2026): Honest Comparison',
  metaDescription:
    'Plausible is great for simple, privacy-first traffic. But it can’t tie a visit to a dollar. Here’s an honest, founder-written Conclick vs Plausible comparison.',
  tldr: 'Plausible is the better pick if all you want is a clean, lightweight, privacy-first pageview counter. Conclick is the better pick if you also want heatmaps, funnels, and revenue attribution — i.e. you want to know which traffic actually makes money, not just how many people visited. Both are cookieless and EU-friendly; Conclick is $9/mo, Plausible starts around $9/mo too but charges more for funnels/ecommerce.',
  intro:
    'I built Conclick because I was tired of analytics that told me everything except the one thing I cared about: which traffic was making money. Plausible is a genuinely good product — I’ll say so plainly below — but it answers a narrower question than Conclick does. Here’s the honest breakdown, including where Plausible wins.',
  sections: [
    { type: 'h2', text: 'The short version', id: 'short-version' },
    {
      type: 'p',
      text: 'Plausible is a simple, open-source, privacy-first traffic dashboard. It does that job beautifully: a tiny script, no cookie banner, clean charts, EU hosting. If you only need to know your pageviews, top sources, and top pages, Plausible is an excellent, no-nonsense choice.',
    },
    {
      type: 'p',
      text: 'Conclick covers that same privacy-first traffic layer, then adds the behavioral and money layers on top: heatmaps and click maps, auto-detected funnels with the biggest drop-off called out, visual user journeys, and — the part nothing else in this category does well — revenue attribution that ties each payment back to the source, campaign, and funnel that earned it.',
    },
    { type: 'comparisonTable' },
    { type: 'h2', text: 'Where Plausible is the better choice', id: 'where-plausible-wins' },
    {
      type: 'p',
      text: 'I’m not going to pretend Conclick wins on everything. Plausible genuinely beats Conclick if:',
    },
    {
      type: 'ul',
      items: [
        'You want open-source you can self-host and audit yourself — Plausible is open-source; Conclick is a hosted product (built on the open-source umami engine, but the product is hosted).',
        'You want the absolute lightest possible footprint and the simplest possible dashboard, and you do not care about heatmaps, funnels, or revenue.',
        'You are an established privacy-purist brand and Plausible’s reputation and EU hosting are part of your story.',
      ],
    },
    { type: 'h2', text: 'Where Conclick pulls ahead', id: 'where-conclick-wins' },
    {
      type: 'p',
      text: 'The gap shows up the moment you ask a question Plausible was never built to answer: "is this traffic actually paying?"',
    },
    {
      type: 'ul',
      items: [
        'Revenue attribution: connect Stripe, Paddle, Polar, Lemon Squeezy, or Dodo and Conclick shows revenue by source, by campaign, and the exact dollars you are losing to each funnel drop-off. Plausible has no revenue attribution.',
        'Heatmaps + click maps: see where people actually click, scroll, and rage-click. Plausible has no heatmaps.',
        'Funnels that find their own leaks: Conclick auto-detects your conversion funnel and surfaces the single biggest drop-off. Plausible’s funnels are basic and manual.',
        'Behavior in one place: visual user journeys and a live global visitor map sit next to the numbers.',
      ],
    },
    {
      type: 'callout',
      text: 'Rule of thumb: if your analytics question starts with "how many", Plausible is enough. If it starts with "which" or "why" — which traffic pays, why are people dropping off — you want Conclick.',
    },
    { type: 'cta', variant: 'leadMagnet' },
    { type: 'h2', text: 'Pricing', id: 'pricing' },
    {
      type: 'p',
      text: 'Both land around $9/mo at the entry level and both are far cheaper than enterprise analytics. The difference is what you get for it: Plausible reserves funnels and ecommerce revenue for higher tiers, while Conclick includes heatmaps, funnels, journeys, and revenue attribution from the start, with a 14-day free trial and no card required.',
    },
    { type: 'h2', text: 'Migrating from Plausible', id: 'migrating' },
    {
      type: 'p',
      text: 'It’s a script swap. Add the Conclick snippet to your site (about two minutes), connect your payment provider so revenue starts attributing, and you can run both in parallel for a week to compare. You keep your Plausible data; Conclick starts collecting from day one.',
    },
  ],
  faq: [
    {
      question: 'Is Conclick a Plausible alternative?',
      answer:
        'Yes — Conclick covers the same privacy-first, cookieless traffic analytics as Plausible, then adds heatmaps, funnels, visual journeys, and revenue attribution. If you want Plausible plus the behavior and money layers, Conclick is the closest alternative.',
    },
    {
      question: 'Is Conclick cookieless and GDPR-friendly like Plausible?',
      answer:
        'Yes. Conclick is cookieless and privacy-first, so for most sites you do not need a cookie consent banner, and it is GDPR/CCPA-friendly — the same privacy posture that makes Plausible popular.',
    },
    {
      question: 'Does Plausible have heatmaps or revenue tracking?',
      answer:
        'No. Plausible is focused on simple traffic analytics — it has no heatmaps and no revenue attribution. Those are core reasons people move to Conclick.',
    },
    {
      question: 'How much does Conclick cost vs Plausible?',
      answer:
        'Conclick is $9/mo (or $7/mo billed yearly) with a 14-day free trial and no card required. Both start near $9/mo, but Conclick includes heatmaps, funnels, and revenue attribution at that price, whereas Plausible reserves funnels/ecommerce for higher tiers.',
    },
    {
      question: 'Is Conclick open-source like Plausible?',
      answer:
        'Conclick is a hosted product built on the open-source umami engine. If self-hosting open-source is a hard requirement, Plausible (or umami) is the better fit; if you want a managed product with revenue and heatmaps, Conclick is.',
    },
    {
      question: 'Can I switch from Plausible without losing data?',
      answer:
        'Yes. Switching is a script swap — your existing Plausible data stays where it is, and Conclick starts collecting immediately. You can run both side by side for a week to compare before fully switching.',
    },
  ],
  comparison: {
    competitor: 'Plausible',
    competitorUrl: 'https://plausible.io',
    rows: [
      { feature: 'Privacy-first / cookieless', conclick: true, competitor: true },
      { feature: 'No cookie banner needed', conclick: true, competitor: true },
      { feature: 'Real-time analytics', conclick: true, competitor: true },
      { feature: 'Heatmaps & click maps', conclick: true, competitor: false },
      { feature: 'Auto-detected funnels + biggest leak', conclick: true, competitor: 'Basic, manual' },
      { feature: 'Visual user journeys', conclick: true, competitor: false },
      { feature: 'Revenue attribution (Stripe/Paddle/etc.)', conclick: true, competitor: false },
      { feature: 'Live visitor map', conclick: true, competitor: false },
      { feature: 'Open-source / self-host', conclick: 'Hosted (umami engine)', competitor: true },
      { feature: 'Entry price', conclick: '$9/mo', competitor: '~$9/mo' },
      { feature: 'Free trial', conclick: '14 days, no card', competitor: '30 days' },
    ],
  },
  internalLinks: [
    { href: '/vs/fathom', label: 'Conclick vs Fathom', group: 'comparison' },
    { href: '/vs/google-analytics', label: 'Conclick vs Google Analytics', group: 'comparison' },
    { href: '/alternatives/plausible', label: 'Best Plausible alternatives', group: 'alternative' },
    { href: '/glossary/revenue-attribution', label: 'What is revenue attribution?', group: 'glossary' },
  ],
  relatedTools: ['utm-builder'],
  leadMagnet: {
    kind: 'addWebsite',
    headline: 'See which traffic actually makes you money',
    sub: 'Add your site and watch revenue line up against the exact source that earned it. Free for 14 days, no card.',
    ctaLabel: 'Add My Website',
  },
  datePublished: '2026-06-18',
  dateModified: '2026-06-18',
};

export default entry;
