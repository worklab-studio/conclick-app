import type { ContentEntry } from '../schema';

const entry: ContentEntry = {
  type: 'tool',
  slug: 'utm-builder',
  h1: 'Free UTM Builder: tag your campaign links in seconds',
  metaTitle: 'Free UTM Builder (2026): Campaign URL Generator',
  metaDescription:
    'A free, no-signup UTM builder. Add source, medium, and campaign tags to any URL and copy a clean, trackable campaign link. Built by Conclick.',
  primaryKeyword: 'utm builder',
  tldr: 'Paste your URL, fill in the source, medium, and campaign, and copy a tagged link. UTM parameters tell your analytics exactly where a visit (and any revenue) came from. This tool is free, runs in your browser, and needs no signup.',
  intro:
    'UTM tags are the simplest way to know which campaign, email, or post actually drove a visit and, if you track revenue, which one made money. Build a clean tagged link below, then drop it in your ad, email, or social post.',
  sections: [
    { type: 'h2', text: 'What the UTM parameters mean', id: 'parameters' },
    {
      type: 'ul',
      items: [
        'utm_source: where the traffic comes from, like google, newsletter, or twitter.',
        'utm_medium: the channel type, like cpc, email, social, or referral.',
        'utm_campaign: the specific push, like spring_sale or launch_week.',
        'utm_term: optional, the paid keyword.',
        'utm_content: optional, which link or version (logolink vs textlink) for A/B tests.',
      ],
    },
    { type: 'h2', text: 'Best practices', id: 'best-practices' },
    {
      type: 'ul',
      items: [
        'Stay consistent: pick one casing (all lowercase) and stick to it. Google, google, and GOOGLE are three different sources.',
        'Use real names, not codes you’ll forget. Future-you has to read these reports.',
        'Only tag links that point at your site from somewhere else: ads, emails, social posts, partner pages.',
      ],
    },
    { type: 'h2', text: 'Naming conventions that survive a year of campaigns', id: 'naming-conventions' },
    {
      type: 'p',
      text: 'The tags you create today become the report you read next January, so name things the way future-you will search for them. I use all-lowercase snake_case everywhere: spring_sale, not Spring-Sale. Put the year in names that repeat (black_friday_2026), keep the source field for the platform (newsletter, google), keep the medium field for the channel type (email, cpc), and never encode the same fact twice. When one value tries to do two jobs, your reports stop adding up.',
    },
    {
      type: 'p',
      text: 'Write the rules down. A ten-row spreadsheet listing your approved values beats any tooling, because most attribution mess is just two people tagging the same channel two different ways. If a value is not on the sheet, it does not go in a link.',
    },
    { type: 'h2', text: 'Common tagging mistakes that corrupt attribution', id: 'common-mistakes' },
    {
      type: 'ul',
      items: [
        'Tagging internal links. The moment someone clicks a tagged link in your own nav or footer, their original source is overwritten and the sale gets credited to your own website.',
        'Tagging links people re-share. The tag follows the URL wherever it is copied, so a link built for your newsletter can end up crediting the newsletter for a visit that actually came from a forum thread. Accept that some drift is unavoidable and keep the tags anyway.',
        'Putting the campaign name in the source field. When spring_sale shows up as a source, you can no longer tell which platform actually sent the click.',
        'Losing parameters through redirects. Some link shorteners and redirect chains strip query strings, so test the final URL in a private window before you ship it. Stripped tags are one reason paid and social visits [show up as direct](/guides/organic-traffic-showing-as-direct).',
      ],
    },
    {
      type: 'p',
      text: 'One habit fixes most of this: build every campaign link with the tool above, using values from the shared sheet, and paste the finished URL wherever it needs to go. Hand-typed tags are where the typos come from.',
    },
    {
      type: 'callout',
      text: 'UTMs tell you which link was clicked. To see which of those clicks actually paid, you need analytics that ties the tagged visit to revenue; that’s what Conclick does.',
    },
    { type: 'cta', variant: 'leadMagnet' },
  ],
  faq: [
    {
      question: 'What is a UTM builder?',
      answer:
        'A UTM builder appends the standard tracking parameters (source, medium, campaign, and optionally term and content) to a URL so your analytics can attribute the visit to a specific campaign or channel.',
    },
    {
      question: 'Is this UTM builder free?',
      answer:
        'Yes. It’s completely free, requires no signup, and runs entirely in your browser. Nothing you type is sent anywhere.',
    },
    {
      question: 'Which UTM parameters are required?',
      answer:
        'Source, medium, and campaign are the three that matter in practice; term and content are optional and mainly used for paid search and A/B testing. The builder above writes the exact parameter names for you, so you never have to remember or mistype them.',
    },
    {
      question: 'Do UTM tags hurt my SEO?',
      answer:
        'Not when used correctly. Only tag external campaign links (ads, emails, social). Never tag internal links between your own pages, and set a canonical URL so search engines index the clean version.',
    },
    {
      question: 'How do I see which UTM campaigns made money?',
      answer:
        'You need analytics that connects the tagged visit to revenue. Conclick attributes every payment back to the source, campaign, and funnel that earned it, so you can see which campaigns actually paid, not just which got clicks.',
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
  dateModified: '2026-07-22',
};

export default entry;
