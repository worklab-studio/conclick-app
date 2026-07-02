import type { ContentEntry } from '../schema';

const entry: ContentEntry = {
  type: 'tool',
  slug: 'utm-builder',
  h1: 'Free UTM Builder — tag your campaign links in seconds',
  metaTitle: 'Free UTM Builder (2026) — Campaign URL Generator',
  metaDescription:
    'A free, no-signup UTM builder. Add source, medium, and campaign tags to any URL and copy a clean, trackable campaign link. Built by Conclick.',
  tldr: 'Paste your URL, fill in the source, medium, and campaign, and copy a tagged link. UTM parameters tell your analytics exactly where a visit (and any revenue) came from. This tool is free, runs in your browser, and needs no signup.',
  intro:
    'UTM tags are the simplest way to know which campaign, email, or post actually drove a visit — and, if you track revenue, which one made money. Build a clean tagged link below, then drop it in your ad, email, or social post.',
  sections: [
    { type: 'h2', text: 'What the UTM parameters mean', id: 'parameters' },
    {
      type: 'ul',
      items: [
        'utm_source — where the traffic comes from: google, newsletter, twitter.',
        'utm_medium — the channel type: cpc, email, social, referral.',
        'utm_campaign — the specific campaign: spring_sale, launch_week.',
        'utm_term — (optional) the paid keyword.',
        'utm_content — (optional) which link/version, e.g. logolink vs textlink, for A/B tests.',
      ],
    },
    { type: 'h2', text: 'Best practices', id: 'best-practices' },
    {
      type: 'ul',
      items: [
        'Stay consistent: pick one casing (all lowercase) and stick to it — Google, google, and GOOGLE are three different sources.',
        'Use real names, not codes you’ll forget. Future-you has to read these reports.',
        'Never UTM-tag internal links between your own pages — it overwrites the original source.',
        'Keep a simple spreadsheet of the source/medium/campaign values you use so the team stays consistent.',
      ],
    },
    {
      type: 'callout',
      text: 'UTMs tell you which link was clicked. To see which of those clicks actually paid, you need analytics that ties the tagged visit to revenue — that’s what Conclick does.',
    },
    { type: 'cta', variant: 'leadMagnet' },
  ],
  faq: [
    {
      question: 'What is a UTM builder?',
      answer:
        'A UTM builder adds tracking parameters (utm_source, utm_medium, utm_campaign, and optionally utm_term and utm_content) to a URL so your analytics can attribute the visit to a specific campaign or channel.',
    },
    {
      question: 'Is this UTM builder free?',
      answer:
        'Yes — it’s completely free, requires no signup, and runs entirely in your browser. Nothing you type is sent anywhere.',
    },
    {
      question: 'Which UTM parameters are required?',
      answer:
        'utm_source, utm_medium, and utm_campaign are the three that matter most. utm_term and utm_content are optional and mainly used for paid search and A/B testing.',
    },
    {
      question: 'Do UTM tags hurt my SEO?',
      answer:
        'Not when used correctly. Only tag external campaign links (ads, emails, social). Never UTM-tag internal links between your own pages, and set a canonical URL so search engines index the clean version.',
    },
    {
      question: 'How do I see which UTM campaigns made money?',
      answer:
        'You need analytics that connects the tagged visit to revenue. Conclick attributes every payment back to the source, campaign, and funnel that earned it — so you can see which UTM campaigns actually paid, not just which got clicks.',
    },
  ],
  internalLinks: [
    { href: '/glossary/utm', label: 'What is a UTM parameter?', group: 'glossary' },
    { href: '/vs/plausible', label: 'Conclick vs Plausible', group: 'comparison' },
  ],
  relatedTools: [],
  leadMagnet: {
    kind: 'addWebsite',
    headline: 'See which UTM campaigns actually pay',
    sub: 'Tag your links here, then let Conclick show you the revenue behind each one. Free for 14 days, no card.',
    ctaLabel: 'Add My Website',
  },
  datePublished: '2026-06-18',
  dateModified: '2026-06-18',
};

export default entry;
