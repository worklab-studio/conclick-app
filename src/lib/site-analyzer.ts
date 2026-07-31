import * as cheerio from 'cheerio';

// Heuristic "read my site → suggest goals & funnels" analyzer (no LLM). Reads the
// homepage AND a few key linked pages (pricing, signup, …), finds the real
// interactive elements (CTAs, links, forms), and proposes event-based
// goals/funnels (named to match autocapture's "Clicked: <label>" /
// "Submitted: <label>") plus page-based ones from the nav.

export interface SuggestedGoal {
  name: string;
  type: 'path' | 'event';
  value: string;
}
export interface SuggestedFunnel {
  name: string;
  window: number;
  steps: { type: 'path' | 'event'; value: string }[];
}
export interface SiteSuggestions {
  goals: SuggestedGoal[];
  funnels: SuggestedFunnel[];
  meta: {
    url: string;
    links: number;
    buttons: number;
    forms: number;
    pages: number;
    note?: string;
  };
}

const CONVERSION = [
  'sign up',
  'signup',
  'sign-up',
  'register',
  'create account',
  'get started',
  'start free',
  'start trial',
  'free trial',
  'try free',
  'try it',
  'buy',
  'purchase',
  'order',
  'checkout',
  'add to cart',
  'add to bag',
  'subscribe',
  'book a demo',
  'request demo',
  'get a demo',
  'contact sales',
  'talk to sales',
  'get quote',
  'get a quote',
  'download',
  'install',
  'join',
  'start now',
  'claim',
];
const CONSIDERATION = [
  'pricing',
  'plans',
  'features',
  'how it works',
  'learn more',
  'see more',
  'explore',
  'tour',
  'compare',
  'use cases',
  'solutions',
  'product',
  'benefits',
  'docs',
];
const CONVERSION_PATH = [
  'signup',
  'sign-up',
  'register',
  'checkout',
  'thank',
  'success',
  'order',
  'subscribe',
  'get-started',
  'trial',
  'demo',
  'contact',
  'quote',
];
const CONSIDERATION_PATH = ['pricing', 'plans', 'features', 'product', 'solutions', 'use-cases'];

const clean = (s?: string) => (s || '').replace(/\s+/g, ' ').trim().slice(0, 40);
const has = (text: string, list: string[]) => {
  const t = text.toLowerCase();
  return list.some(k => t.includes(k));
};
const cap = (s: string) => s.slice(0, 50);
const evt = (label: string) => cap(`Clicked: ${label}`);

function empty(url: string, note: string): SiteSuggestions {
  return { goals: [], funnels: [], meta: { url, links: 0, buttons: 0, forms: 0, pages: 0, note } };
}

interface PageData {
  clickables: { text: string; href?: string }[];
  forms: number;
  paths: Set<string>;
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(7000),
      redirect: 'follow',
      headers: { 'user-agent': 'ConclickBot/1.0 (+https://conclick.io)' },
    });
    if (!res.ok) return null;
    return (await res.text()).slice(0, 1_500_000);
  } catch {
    return null;
  }
}

function parsePage(html: string, domain: string): PageData {
  const $ = cheerio.load(html);
  const clickables: { text: string; href?: string }[] = [];
  $('a[href], button, [role="button"], input[type="submit"], input[type="button"]').each(
    (_, el) => {
      const $el = $(el);
      const text = clean(
        $el.attr('aria-label') || $el.text() || $el.attr('value') || $el.attr('title') || '',
      );
      if (text) clickables.push({ text, href: $el.attr('href') });
    },
  );
  const paths = new Set<string>();
  for (const c of clickables) {
    if (!c.href) continue;
    let p = '';
    try {
      if (c.href.startsWith('/') && !c.href.startsWith('//')) p = c.href;
      else if (c.href.includes(domain)) p = new URL(c.href).pathname;
    } catch {
      /* ignore */
    }
    p = p.split('?')[0].split('#')[0];
    if (p && p !== '/' && p.length < 60) paths.add(p);
  }
  return { clickables, forms: $('form').length, paths };
}

export async function analyzeSite(rawDomain: string): Promise<SiteSuggestions> {
  const domain = (rawDomain || '')
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .trim();

  if (!domain || /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|169\.254\.|\[)/.test(domain)) {
    return empty('', 'No public domain is set for this website.');
  }

  const url = `https://${domain}/`;
  const home = await fetchHtml(url);
  if (home === null) {
    return empty(url, "Couldn't reach your site to read it, check the domain is public.");
  }

  const homeData = parsePage(home, domain);

  // follow up to 3 high-signal linked pages (pricing, signup, checkout, …)
  const priority = [...homeData.paths]
    .filter(p => has(p, [...CONVERSION_PATH, ...CONSIDERATION_PATH]))
    .slice(0, 3);
  const subHtml = await Promise.all(priority.map(p => fetchHtml(`https://${domain}${p}`)));
  const pages = [
    homeData,
    ...subHtml.filter((h): h is string => !!h).map(h => parsePage(h, domain)),
  ];

  const allClickables = pages.flatMap(p => p.clickables);
  const formCount = pages.reduce((s, p) => s + p.forms, 0);
  const internalPaths = new Set<string>();
  pages.forEach(p => p.paths.forEach(x => internalPaths.add(x)));

  // unique CTAs by label, bucketed by intent
  const seen = new Set<string>();
  const conv: string[] = [];
  const cons: string[] = [];
  for (const c of allClickables) {
    const key = c.text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (has(c.text, CONVERSION)) conv.push(c.text);
    else if (has(c.text, CONSIDERATION)) cons.push(c.text);
  }

  // ---- Goals ----
  const goals: SuggestedGoal[] = [];
  const goalKeys = new Set<string>();
  const pushGoal = (g: SuggestedGoal) => {
    const k = g.type + ':' + g.value.toLowerCase();
    if (goalKeys.has(k)) return;
    goalKeys.add(k);
    goals.push(g);
  };
  conv.slice(0, 3).forEach(t => pushGoal({ name: evt(t), type: 'event', value: evt(t) }));
  if (formCount) pushGoal({ name: 'Submitted a form', type: 'event', value: 'Submitted: form' });
  [...internalPaths]
    .filter(p => has(p, CONVERSION_PATH))
    .slice(0, 2)
    .forEach(p => pushGoal({ name: `Visited ${p}`, type: 'path', value: p }));

  // ---- Funnels ----
  const funnels: SuggestedFunnel[] = [];
  if (cons.length && conv.length) {
    funnels.push({
      name: cap(`${cons[0]} → ${conv[0]}`),
      window: 60,
      steps: [
        { type: 'event', value: evt(cons[0]) },
        { type: 'event', value: evt(conv[0]) },
      ],
    });
  } else if (conv.length >= 2) {
    funnels.push({
      name: cap(`${conv[0]} → ${conv[1]}`),
      window: 60,
      steps: conv.slice(0, 3).map(t => ({ type: 'event' as const, value: evt(t) })),
    });
  }

  const consPage = [...internalPaths].find(p => has(p, CONSIDERATION_PATH));
  const convPage = [...internalPaths].find(p => has(p, CONVERSION_PATH));
  const pageSteps: { type: 'path'; value: string }[] = [{ type: 'path', value: '/' }];
  if (consPage) pageSteps.push({ type: 'path', value: consPage });
  if (convPage && convPage !== consPage) pageSteps.push({ type: 'path', value: convPage });
  if (pageSteps.length >= 2) {
    funnels.push({ name: 'Site journey', window: 60, steps: pageSteps });
  }

  return {
    goals: goals.slice(0, 5),
    funnels: funnels.slice(0, 2),
    meta: {
      url,
      links: allClickables.length,
      buttons: 0,
      forms: formCount,
      pages: pages.length,
      note:
        goals.length || funnels.length
          ? undefined
          : "We read your site but couldn't spot obvious CTAs, add steps manually, or turn on Autocapture and revisit.",
    },
  };
}
