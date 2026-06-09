// Smart funnel templates. Each step carries keyword patterns; the builder scans
// the site's real page paths and fills the best match, leaving a blank when
// nothing matches (the user then picks it). Keeps non-technical setup one click.

export type TemplateIcon = 'signup' | 'cart' | 'mail' | 'phone';

export interface TemplateStep {
  label: string;
  patterns: RegExp[];
}

export interface FunnelTemplate {
  id: string;
  name: string;
  label: string; // short chip label
  icon: TemplateIcon;
  steps: TemplateStep[];
}

export const FUNNEL_TEMPLATES: FunnelTemplate[] = [
  {
    id: 'signup',
    name: 'Signup funnel',
    label: 'Signup',
    icon: 'signup',
    steps: [
      { label: 'Landing', patterns: [/^\/$/, /home/, /index/] },
      { label: 'Pricing / features', patterns: [/pricing/, /plans?/, /features?/] },
      {
        label: 'Sign up',
        patterns: [/sign[-_]?up/, /register/, /create[-_]?account/, /get[-_]?started/, /trial/],
      },
    ],
  },
  {
    id: 'checkout',
    name: 'Checkout funnel',
    label: 'Checkout',
    icon: 'cart',
    steps: [
      { label: 'Product', patterns: [/product/, /shop/, /store/, /item/] },
      { label: 'Cart', patterns: [/cart/, /basket/, /bag/] },
      { label: 'Checkout', patterns: [/checkout/, /payment/, /\/pay\b/] },
      {
        label: 'Success',
        patterns: [/thank[-_]?you/, /success/, /order[-_]?confirm/, /complete/, /receipt/],
      },
    ],
  },
  {
    id: 'newsletter',
    name: 'Newsletter signup',
    label: 'Newsletter',
    icon: 'mail',
    steps: [
      { label: 'Any page', patterns: [/^\/$/, /home/, /blog/] },
      { label: 'Subscribe', patterns: [/subscribe/, /newsletter/, /sign[-_]?up/] },
    ],
  },
  {
    id: 'contact',
    name: 'Contact / lead',
    label: 'Contact',
    icon: 'phone',
    steps: [
      { label: 'Landing', patterns: [/^\/$/, /home/] },
      { label: 'Contact', patterns: [/contact/, /demo/, /book/, /call/, /lead/] },
      { label: 'Thanks', patterns: [/thank[-_]?you/, /success/, /submitted/, /confirm/] },
    ],
  },
];

export type FunnelStep = { type: 'path' | 'event'; value: string };

// Build prefilled steps for a template against the site's real page paths.
// Each step gets the best unused matching page, or '' when nothing matches.
export function applyTemplate(template: FunnelTemplate, pages: string[]): FunnelStep[] {
  const used = new Set<string>();
  return template.steps.map(step => {
    const match = pages.find(
      p => !used.has(p) && step.patterns.some(rx => rx.test(p.toLowerCase())),
    );
    if (match) used.add(match);
    return { type: 'path', value: match || '' };
  });
}
