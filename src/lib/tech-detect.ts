/**
 * Detect the stack a site runs on, from its HTML and response headers alone.
 * No external API, no key, no cost.
 *
 * This does double duty:
 *  1. Onboarding credibility. Telling someone "this is a Framer site" the
 *     moment they type their domain proves Conclick already understands their
 *     setup, before they install anything.
 *  2. Install instructions. The detected platform picks the exact snippet
 *     guide on the install step, so nobody reads Shopify docs for a Next.js
 *     site.
 *
 * Detection is deliberately conservative: a wrong confident answer is worse
 * than "Custom site", because the whole point is looking like we know the
 * user's stack.
 */

export type PlatformId =
  | 'framer'
  | 'webflow'
  | 'wordpress'
  | 'shopify'
  | 'wix'
  | 'squarespace'
  | 'ghost'
  | 'nextjs'
  | 'nuxt'
  | 'astro'
  | 'svelte'
  | 'react'
  | 'vue'
  | 'custom';

export interface DetectedTech {
  /** Platform used for install instructions. Always set; 'custom' is the floor. */
  platform: PlatformId;
  /** Human label for the UI, e.g. "Framer" or "Next.js". */
  platformLabel: string;
  /** Which install guide to show. Hosted builders need a settings-panel flow. */
  installStyle: 'head-snippet' | 'builder-settings' | 'plugin-or-theme';
  /** Other notable tech found (frameworks, tag managers, ecommerce). */
  stack: string[];
  /** Analytics or tag tools already on the page. */
  analytics: string[];
  /** True when Conclick's own tracker is already installed. */
  hasConclick: boolean;
}

interface Rule {
  id: PlatformId;
  label: string;
  installStyle: DetectedTech['installStyle'];
  /** Any match confirms the platform. */
  html?: RegExp[];
  /** Header name to value pattern. */
  headers?: Array<[string, RegExp]>;
}

// Ordered: hosted builders first, since a Framer site is also "React" and the
// builder answer is the one that matters for installing a snippet.
const PLATFORMS: Rule[] = [
  {
    id: 'framer',
    label: 'Framer',
    installStyle: 'builder-settings',
    html: [/framerusercontent\.com/i, /<meta[^>]+name=["']generator["'][^>]+content=["']Framer/i],
    headers: [['x-framer-hosting', /.*/]],
  },
  {
    id: 'webflow',
    label: 'Webflow',
    installStyle: 'builder-settings',
    html: [
      /<html[^>]+data-wf-(page|site)/i,
      /assets\.website-files\.com/i,
      /<meta[^>]+content=["']Webflow["']/i,
    ],
  },
  {
    id: 'shopify',
    label: 'Shopify',
    installStyle: 'builder-settings',
    html: [/cdn\.shopify\.com/i, /Shopify\.theme/i],
    headers: [
      ['x-shopify-stage', /.*/],
      ['powered-by', /shopify/i],
    ],
  },
  {
    id: 'wix',
    label: 'Wix',
    installStyle: 'builder-settings',
    html: [/static\.parastorage\.com/i, /<meta[^>]+content=["']Wix\.com/i],
  },
  {
    id: 'squarespace',
    label: 'Squarespace',
    installStyle: 'builder-settings',
    html: [/squarespace\.com/i, /static1\.squarespace\.com/i, /Static\.SQUARESPACE_CONTEXT/i],
  },
  {
    id: 'wordpress',
    label: 'WordPress',
    installStyle: 'plugin-or-theme',
    html: [/\/wp-content\//i, /\/wp-includes\//i, /<meta[^>]+content=["']WordPress/i],
  },
  {
    id: 'ghost',
    label: 'Ghost',
    installStyle: 'plugin-or-theme',
    html: [/<meta[^>]+content=["']Ghost\s/i, /ghost\.io/i],
  },
  {
    id: 'nextjs',
    label: 'Next.js',
    installStyle: 'head-snippet',
    html: [/\/_next\/static\//i, /id=["']__NEXT_DATA__["']/i],
    headers: [['x-powered-by', /next\.js/i]],
  },
  {
    id: 'nuxt',
    label: 'Nuxt',
    installStyle: 'head-snippet',
    html: [/\/_nuxt\//i, /window\.__NUXT__/i],
  },
  {
    id: 'astro',
    label: 'Astro',
    installStyle: 'head-snippet',
    html: [/<meta[^>]+content=["']Astro\s/i, /astro-island/i],
  },
  {
    id: 'svelte',
    label: 'SvelteKit',
    installStyle: 'head-snippet',
    html: [/\/_app\/immutable\//i, /__sveltekit_/i],
  },
  {
    id: 'react',
    label: 'React',
    installStyle: 'head-snippet',
    html: [/data-reactroot/i, /react(-dom)?[.@][\d.]+.*\.js/i],
  },
  {
    id: 'vue',
    label: 'Vue',
    installStyle: 'head-snippet',
    html: [/data-v-app/i, /vue(@|\.runtime)[\d.]*.*\.js/i],
  },
];

const ANALYTICS: Array<[string, RegExp]> = [
  ['Google Analytics', /googletagmanager\.com\/gtag\/js|google-analytics\.com\/analytics\.js/i],
  ['Google Tag Manager', /googletagmanager\.com\/gtm\.js/i],
  ['Meta Pixel', /connect\.facebook\.net\/[^"']*\/fbevents\.js/i],
  ['Plausible', /plausible\.io\/js\//i],
  ['Fathom', /cdn\.usefathom\.com/i],
  ['Umami', /umami\.is\/script\.js|\/umami\.js/i],
  ['PostHog', /posthog\.com\/static\/array\.js|posthog\.init/i],
  ['Hotjar', /static\.hotjar\.com/i],
  ['Microsoft Clarity', /clarity\.ms\/tag/i],
  ['Mixpanel', /cdn\.mxpnl\.com/i],
  ['Amplitude', /cdn\.amplitude\.com/i],
  ['Segment', /cdn\.segment\.com\/analytics\.js/i],
  ['Intercom', /widget\.intercom\.io/i],
  ['Stripe', /js\.stripe\.com/i],
];

const EXTRA_STACK: Array<[string, RegExp]> = [
  ['Tailwind CSS', /tailwind(css)?[.@-][\d.]*.*\.css|--tw-/i],
  ['Cloudflare', /cdn-cgi\/|cloudflare/i],
  ['Vercel', /vercel\.app|vercel-insights/i],
  ['HubSpot', /js\.hs-scripts\.com/i],
  ['Calendly', /assets\.calendly\.com/i],
];

/** Detect platform + stack from raw HTML and optional response headers. */
export function detectTech(html: string, headers?: Record<string, string>): DetectedTech {
  const head = (html || '').slice(0, 400_000);
  const hdr = headers || {};

  let matched: Rule | null = null;
  for (const rule of PLATFORMS) {
    const byHtml = rule.html?.some(re => re.test(head));
    const byHeader = rule.headers?.some(([name, re]) => {
      const v = hdr[name.toLowerCase()];
      return typeof v === 'string' && re.test(v);
    });
    if (byHtml || byHeader) {
      matched = rule;
      break;
    }
  }

  const analytics = ANALYTICS.filter(([, re]) => re.test(head)).map(([name]) => name);
  const stack = EXTRA_STACK.filter(([, re]) => re.test(head)).map(([name]) => name);

  // Conclick's own tracker, so we can say "already installed" instead of
  // walking someone through an install they have already done.
  const hasConclick = /app\.conclick\.io\/script\.js|conclick\.io\/script\.js/i.test(head);

  return {
    platform: matched?.id || 'custom',
    platformLabel: matched?.label || 'Custom site',
    installStyle: matched?.installStyle || 'head-snippet',
    stack,
    analytics,
    hasConclick,
  };
}
