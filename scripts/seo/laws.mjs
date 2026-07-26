// The law book. Notchbay's 26-law HTML validator ported to Conclick's
// ContentEntry OBJECT reality — there is no HTML file to parse, so every law
// reads the loaded entry plus a precomputed ctx (bodyText, words, validPaths).
//
// Each law: { name, appliesTo, check(entry, ctx) }
//   appliesTo : '*' | ContentType[] | (rec) => boolean
//   check     : returns null (pass) | 'message' | { message, count }
//
// `count` is what the ratchet in lint.mjs stores. For countable laws (em
// dashes, banned phrases, unresolved links) it is the number of occurrences, so
// a grandfathered entry that ADDS a new occurrence still fails. For binary laws
// it is 1.

/* ------------------------------------------------------------------ */
/* Shared data                                                         */
/* ------------------------------------------------------------------ */

// Per-type word floors AND ceilings, computed over bodyText.
// A FLAT floor would be wrong: tools/utm-builder is 414 words and that is
// correct — on a tool page the tool IS the content, and a 850/1200-word floor
// would push the generator to pad it with filler, which is precisely the
// thin-content behaviour this gate exists to prevent.
export const WORD_RANGE = {
  tool: [250, 1500],
  glossary: [900, 4500],
  comparison: [1100, 4500],
  alternative: [1100, 4500],
  guide: [1200, 4500],
  blog: [900, 4500],
  useCase: [1000, 4500],
};

export const BANNED_PHRASES = [
  'delve into',
  'leverage the',
  "in today's fast-paced world",
  "it's important to note that",
  'in this guide',
  "let's explore",
  'at the heart of',
  'the bottom line is',
  "it's crucial to",
  'as you can see',
  'game-changer',
  'unlock the power',
  'seamlessly integrate',
  'in the ever-evolving',
  'navigating the landscape',
];

// Competitor / analytics-vendor names the honesty laws watch for.
export const COMPETITORS = [
  'Google Analytics', 'GA4', 'Universal Analytics', 'Plausible', 'Fathom', 'Matomo', 'Piwik',
  'Umami', 'PostHog', 'Mixpanel', 'Amplitude', 'Heap', 'Hotjar', 'Microsoft Clarity', 'Clarity',
  'Simple Analytics', 'Pirsch', 'Datafast', 'Adobe Analytics', 'Kissmetrics', 'Statcounter',
  'Countly', 'Splitbee', 'Panelbear', 'Usermaven', 'Vercel Analytics', 'Cloudflare Analytics',
  'Fullstory', 'FullStory', 'Smartlook', 'Crazy Egg', 'CrazyEgg', 'Mouseflow', 'Lucky Orange',
  'Segment', 'Woopra', 'Chartbeat', 'Quantcast', 'GoatCounter', 'Ackee', 'Shynet', 'Swetrix',
  'Seline', 'Rybbit', 'Baremetrics', 'ProfitWell', 'Optimizely', 'VWO', 'Contentsquare',
];

const STOPWORDS = new Set(
  ('a an and are as at be but by can do does for from has have how i if in is it its me my no not of on or our so that the their then there these they this to up us was we what when where which who why will with you your'
  ).split(' '),
);

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const norm = s => String(s).replace(/[’‘]/g, "'").replace(/[“”]/g, '"');
const snip = (text, i, before = 70, after = 70) =>
  ('…' + text.slice(Math.max(0, i - before), i + after).replace(/\s+/g, ' ').trim() + '…');

function countMatches(text, re) {
  const m = text.match(re);
  return m ? m.length : 0;
}

/** All hits of `re` in `text` as [{index, match}]. */
function hits(text, re) {
  const out = [];
  const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  let m;
  while ((m = r.exec(text)) !== null) {
    out.push({ index: m.index, match: m[0] });
    if (m.index === r.lastIndex) r.lastIndex++;
  }
  return out;
}

const windowAt = (text, i, len, back, fwd) => text.slice(Math.max(0, i - back), i + len + fwd);

/* ------------------------------------------------------------------ */
/* STRUCTURE                                                           */
/* ------------------------------------------------------------------ */

const structure = [
  {
    name: 'meta-title-length',
    appliesTo: '*',
    check: e => {
      const n = (e.metaTitle || '').length;
      if (!e.metaTitle) return 'metaTitle is missing';
      return n > 70 ? `metaTitle is ${n} chars (max 70): "${e.metaTitle}"` : null;
    },
  },
  {
    name: 'meta-description-length',
    appliesTo: '*',
    check: e => {
      const n = (e.metaDescription || '').length;
      if (!e.metaDescription) return 'metaDescription is missing';
      return n > 165 ? `metaDescription is ${n} chars (max 165)` : null;
    },
  },
  {
    name: 'h2-count',
    appliesTo: '*',
    check: e => {
      const n = (e.sections || []).filter(s => s && s.type === 'h2').length;
      return n < 4 ? `only ${n} h2 section${n === 1 ? '' : 's'} (min 4)` : null;
    },
  },
  {
    name: 'faq-count',
    appliesTo: '*',
    check: e => {
      const n = (e.faq || []).filter(f => f && f.question && f.answer).length;
      return n < 3 ? `only ${n} complete faq item${n === 1 ? '' : 's'} (min 3)` : null;
    },
  },
  {
    name: 'tldr-present',
    appliesTo: '*',
    check: e => {
      if (!e.tldr || !String(e.tldr).trim()) return 'tldr is missing or empty';
      const n = String(e.tldr).length;
      return n > 400 ? `tldr is ${n} chars (max 400)` : null;
    },
  },
  {
    name: 'date-parses',
    appliesTo: '*',
    check: e => {
      const bad = [];
      for (const f of ['datePublished', 'dateModified']) {
        const v = e[f];
        if (!v) bad.push(`${f} is missing`);
        else if (Number.isNaN(Date.parse(v))) bad.push(`${f} "${v}" does not parse as a date`);
      }
      if (!bad.length && Date.parse(e.dateModified) < Date.parse(e.datePublished)) {
        bad.push(`dateModified (${e.dateModified}) is before datePublished (${e.datePublished})`);
      }
      return bad.length ? bad.join('; ') : null;
    },
  },
  {
    name: 'h1-present',
    appliesTo: '*',
    check: e => (e.h1 && String(e.h1).trim() ? null : 'h1 is missing or empty'),
  },
  {
    name: 'intro-present',
    appliesTo: '*',
    check: e => (e.intro && String(e.intro).trim() ? null : 'intro is missing or empty'),
  },
  {
    name: 'comparison-table-populated',
    appliesTo: ['comparison', 'alternative'],
    check: e => {
      const rows = e.comparison?.rows || [];
      if (rows.length < 4) return `comparison table has ${rows.length} rows (min 4)`;
      const hasBlock = (e.sections || []).some(s => s && s.type === 'comparisonTable');
      return hasBlock ? null : 'comparison rows exist but no {type:"comparisonTable"} section renders them';
    },
  },
];

/* ------------------------------------------------------------------ */
/* WORD FLOORS / CEILINGS                                              */
/* ------------------------------------------------------------------ */

const length = [
  {
    name: 'word-count-min',
    appliesTo: '*',
    check: (e, ctx) => {
      const range = WORD_RANGE[e.type];
      if (!range) return null;
      return ctx.wordCount < range[0]
        ? `${ctx.wordCount} words of body copy, floor for type "${e.type}" is ${range[0]}`
        : null;
    },
  },
  {
    name: 'word-count-max',
    appliesTo: '*',
    check: (e, ctx) => {
      const range = WORD_RANGE[e.type];
      if (!range) return null;
      return ctx.wordCount > range[1]
        ? `${ctx.wordCount} words of body copy, ceiling for type "${e.type}" is ${range[1]}`
        : null;
    },
  },
];

/* ------------------------------------------------------------------ */
/* HUMANIZATION                                                        */
/* ------------------------------------------------------------------ */

const humanization = [
  {
    name: 'no-em-dash',
    appliesTo: '*',
    check: (e, ctx) => {
      const n = countMatches(ctx.allText, /[—–]/g);
      if (!n) return null;
      const i = ctx.allText.search(/[—–]/);
      return { message: `${n} em/en dash${n === 1 ? '' : 'es'} (run --fix), first at ${snip(ctx.allText, i)}`, count: n };
    },
  },
  {
    name: 'no-banned-phrases',
    appliesTo: '*',
    check: (e, ctx) => {
      const hay = norm(ctx.allText).toLowerCase();
      const found = [];
      let total = 0;
      for (const p of BANNED_PHRASES) {
        const n = countMatches(hay, new RegExp(esc(norm(p).toLowerCase()), 'g'));
        if (n) {
          found.push(`"${p}"${n > 1 ? ` x${n}` : ''}`);
          total += n;
        }
      }
      return total ? { message: `banned filler: ${found.join(', ')}`, count: total } : null;
    },
  },
  {
    name: 'first-person-present',
    appliesTo: '*',
    check: (e, ctx) => {
      const n = countMatches(ctx.bodyText, /\b(I|I'm|I've|I'd|I'll|we|we're|we've|my|our|ours|us)\b/gi);
      return n === 0 ? 'no first-person voice (I/we/my/our) anywhere in the body — reads machine-written' : null;
    },
  },
  {
    name: 'keyword-density',
    appliesTo: '*',
    check: (e, ctx) => {
      if (ctx.wordCount < 100) return null;
      const lower = ctx.words.map(w => w.toLowerCase().replace(/['’]s$/, ''));
      const freq = new Map();
      for (const w of lower) {
        if (w.length < 3 || STOPWORDS.has(w) || /^\d+$/.test(w)) continue;
        freq.set(w, (freq.get(w) || 0) + 1);
      }
      let worst = null;
      for (const [w, n] of freq) {
        const d = n / ctx.wordCount;
        if (!worst || d > worst.d) worst = { w, n, d };
      }
      // The slug phrase is the page's target keyword; check it too.
      const phrase = ctx.slug.replace(/-/g, ' ');
      const pw = phrase.split(' ').length;
      if (pw > 1) {
        const n = countMatches(ctx.bodyText.toLowerCase(), new RegExp(esc(phrase), 'g'));
        const d = (n * pw) / ctx.wordCount;
        if (!worst || d > worst.d) worst = { w: phrase, n, d };
      }
      if (!worst || worst.d <= 0.025) return null;
      const pct = (worst.d * 100).toFixed(2);
      return {
        message: `keyword density ${pct}% for "${worst.w}" (${worst.n}/${ctx.wordCount}), max 2.50%`,
        count: worst.n,
      };
    },
  },
];

/* ------------------------------------------------------------------ */
/* LINKING                                                             */
/* ------------------------------------------------------------------ */

const linking = [
  {
    name: 'internal-links-min',
    appliesTo: '*',
    check: e => {
      const n = (e.internalLinks || []).length;
      return n < 2 ? `${n} internalLinks (min 2)` : null;
    },
  },
  {
    name: 'internal-links-resolve',
    appliesTo: '*',
    check: (e, ctx) => {
      const bad = [];
      for (const l of e.internalLinks || []) {
        const href = String(l?.href || '');
        if (!href) {
          bad.push('(empty href)');
          continue;
        }
        if (/^https?:\/\//i.test(href)) {
          bad.push(`${href} (internalLinks must be site-relative paths)`);
          continue;
        }
        const clean = href.split('#')[0].split('?')[0].replace(/\/$/, '') || '/';
        if (!ctx.validPaths.has(clean)) bad.push(href);
      }
      return bad.length
        ? { message: `internalLink href does not resolve to a live page: ${bad.join(', ')}`, count: bad.length }
        : null;
    },
  },
  {
    name: 'no-self-link',
    appliesTo: '*',
    check: (e, ctx) => {
      const n = (e.internalLinks || []).filter(l => String(l?.href || '').replace(/\/$/, '') === ctx.path).length;
      return n ? { message: `internalLinks link to the page itself (${ctx.path})`, count: n } : null;
    },
  },
];

/* ------------------------------------------------------------------ */
/* CONCLICK-SPECIFIC HONESTY LAWS                                      */
/* These are the ones that protect the business.                       */
/* ------------------------------------------------------------------ */

// "no cookie banner" is a legal claim about OUR product, and the Conclick
// tracker writes a persistent localStorage identifier. The claim is defensible
// only when qualified. Unqualified, it is the kind of sentence that ends up in
// a regulator's screenshot.
const BANNER_QUALIFIERS =
  /(localstorage|local storage|persistent|identifier|device id|depends|jurisdict|not legal advice|consult|your (own )?(lawyer|counsel|dpo)|may still|might still|check with|in most cases|generally|talk to|varies|configur|opt[- ]out|first[- ]party (id|identifier))/i;

const RULING_AUTHORITY =
  /(cnil|noyb|datenschutzbehörde|datenschutzbehorde|dsb|garante|edps|edpb|ico\b|court|dpa\b|data protection authorit|regulator|supervisory authorit|schrems)/i;
const RULING_WORD = /(ruling|ruled|decision|decided|judgment|judgement|found|order|verdict|case|complaint|opinion)/i;
const YEAR = /\b(19|20)\d{2}\b/;

// What counts as attribution for a claim about somebody else's product.
//
// A DATE IS NOT ATTRIBUTION. "as of June 2026" asserts only that we believed it
// in June, which is exactly what an unsourced claim already asserts. The old
// pattern accepted a bare date, so writing the date became the way to walk an
// unchecked claim past this law — the shape now appears 42 times in the corpus,
// and it is what let a false claim ship. Attribution has to be something a
// reader can go and check: a link, or a named artefact that belongs to the
// vendor (their docs, their pricing page, their changelog). A date is welcome
// NEXT TO one, because capability claims go stale; it just cannot stand in for
// one.
//
// AND THE ARTEFACT HAS TO BE THEIRS. Ownership is the whole point: "per our
// docs" or a conclick.io link says a competitor lacks a feature on our own
// say-so, which is the bare-date loophole moved one step over. The negative
// lookaheads below refuse our own brand as the possessor and refuse our own
// host as the link, so laundering a claim needs a real vendor artefact. (Only
// `competitor-feature-claim-needs-source` reads this, so it is tightened here
// rather than duplicated inside the law.)
const VENDOR_ARTEFACT =
  '(?:docs|documentation|pricing(?: page)?|plans page|changelog|release notes|' +
  'help c(?:enter|entre)|knowledge base|status page|repo(?:sitory)?|github|readme)';

const SOURCE_MARKERS = new RegExp(
  [
    // a link the reader can follow — anywhere but back to us
    'https?://(?!(?:www\\.)?conclick\\.io\\b)',
    // "per their docs", "according to the Matomo pricing page" — but not "our docs"
    `\\b(?:according to|per)\\s+(?:the\\s+|their\\s+|its\\s+)?(?:own\\s+)?(?:(?!our\\b)[\\w.-]+\\s+)?${VENDOR_ARTEFACT}\\b`,
    // "their changelog", "Plausible's pricing page" — but not "Conclick's docs"
    `\\b(?:their|its|(?!(?:our|conclick)\\b)[\\w.-]+'s)\\s+(?:own\\s+)?${VENDOR_ARTEFACT}\\b`,
    '\\bsource:',
    '\\[source',
  ].join('|'),
  'i',
);

// Nouns that follow a negation in an English idiom rather than in a claim about
// a product. Kept deliberately short and concrete: nothing here is ever the name
// of a shipped feature, so no real competitor claim can hide behind it.
const NOT_A_FEATURE =
  /^\s+(idea|clue|room|patience|interest|business|intention|appetite|way of knowing|choice but)\b/i;

const honesty = [
  {
    name: 'consent-banner-claim-qualified',
    appliesTo: '*',
    check: (e, ctx) => {
      const text = norm(ctx.allText);
      const re =
        /((?:no|without|never (?:need|needs|needing)|don't need|do not need|doesn't need|does not need|skip|skipping|zero|free (?:of|from))\s+(?:a\s+|the\s+|any\s+)?(?:cookie|consent|gdpr)\s+banner|(?:cookie|consent)\s+banner[- ]free|banner[- ]free)/i;
      const found = hits(text, re).filter(h => !BANNER_QUALIFIERS.test(windowAt(text, h.index, h.match.length, 320, 320)));
      if (!found.length) return null;
      return {
        message:
          `unqualified "${found[0].match.trim()}" claim — the Conclick tracker writes a persistent localStorage id, ` +
          `so this needs qualification: ${snip(text, found[0].index)}`,
        count: found.length,
      };
    },
  },
  {
    name: 'no-ga4-is-illegal',
    appliesTo: '*',
    check: (e, ctx) => {
      const text = norm(ctx.allText);
      const re = new RegExp(
        '(?:(ga4|google analytics|universal analytics)[^.!?]{0,80}?\\b(?:is|are|was|were|being|been|becomes?|remains?)\\s+(?:now\\s+|technically\\s+|effectively\\s+|basically\\s+)?(?:illegal|unlawful|banned|outlawed|prohibited)' +
          '|\\b(?:illegal|unlawful|banned|outlawed|prohibited)[^.!?]{0,60}?(ga4|google analytics|universal analytics))',
        'i',
      );
      const found = hits(text, re).filter(h => {
        const w = windowAt(text, h.index, h.match.length, 400, 400);
        // Attribution requires ALL THREE: an authority, a ruling word, and a date.
        return !(RULING_AUTHORITY.test(w) && RULING_WORD.test(w) && YEAR.test(w));
      });
      if (!found.length) return null;
      return {
        message:
          `unattributed "Google Analytics is illegal" phrasing — not accurate in 2026 (the EU-US Data Privacy ` +
          `Framework addressed the transfer defect). Attribute to a specific ruling + authority + date, or drop it: ` +
          snip(text, found[0].index),
        count: found.length,
      };
    },
  },
  {
    name: 'competitor-feature-claim-needs-source',
    appliesTo: '*',
    check: (e, ctx) => {
      const text = norm(ctx.allText);
      const negRe =
        /\b(doesn't have|does not have|don't have|do not have|lacks|lacking|can't do|cannot do|can not do|has no|have no|doesn't support|does not support|doesn't offer|does not offer|no support for|isn't able to|is not able to|there's no|has never|will never)\b/gi;
      const nameRe = new RegExp(`\\b(${COMPETITORS.map(esc).join('|')}|Conclick)\\b`, 'gi');
      const bad = [];
      for (const h of hits(text, negRe)) {
        // "I have no idea", "no room to be vague" — idioms, not feature denials.
        // The nearest-preceding-subject heuristic below cannot tell that the real
        // subject is the writer rather than the vendor named earlier in the same
        // sentence, so exclude the handful of nouns no product ships as a feature.
        // Without this the law flags first-person narration in two entries.
        if (NOT_A_FEATURE.test(text.slice(h.index + h.match.length))) continue;
        // Whose feature is being denied? Take the nearest preceding subject.
        const left = text.slice(Math.max(0, h.index - 110), h.index);
        const subjects = hits(left, nameRe);
        const subject = subjects.length ? subjects[subjects.length - 1].match : null;
        if (!subject) continue;
        if (/^conclick$/i.test(subject)) continue; // self-criticism is fine
        const w = windowAt(text, h.index, h.match.length, 260, 260);
        if (SOURCE_MARKERS.test(w)) continue;
        bad.push(`"${subject} ${h.match}" @ ${snip(text, h.index, 40, 70)}`);
      }
      if (!bad.length) return null;
      return {
        message:
          `competitor-lacks-a-feature claim with no source (Matomo DOES have heatmaps — getting this wrong on a ` +
          `page titled "honest comparison" is fatal). A date is not a source: cite a URL, "per their docs", or ` +
          `their pricing page/changelog: ${bad.slice(0, 3).join(' | ')}${bad.length > 3 ? ` (+${bad.length - 3} more)` : ''}`,
        count: bad.length,
      };
    },
  },
  {
    name: 'umami-lineage-disclosed',
    appliesTo: rec => /umami/i.test(rec.slug) || /umami/i.test(rec.entry.h1 || ''),
    check: (e, ctx) => {
      const text = norm(ctx.allText);
      const lineage =
        /(fork(ed)? (of|from)|built on (top of )?umami|based on umami|derived from umami|umami's (open[- ]source )?(code|codebase)|started (out )?as (a )?(fork|umami)|began (life )?as (a )?(fork|umami)|conclick (is|was) built (on|from)|lineage|upstream)/i;
      return lineage.test(text)
        ? null
        : 'Umami-adjacent page with no lineage disclosure — Conclick is built on the Umami codebase and must say so on any page about Umami';
    },
  },
  {
    name: 'no-voltra',
    appliesTo: '*',
    check: (e, ctx) => {
      const n = countMatches(ctx.allText, /voltra/gi);
      return n ? { message: `"Voltra" appears ${n}x (Framer template leftover)`, count: n } : null;
    },
  },
];

/* ------------------------------------------------------------------ */

export const LAWS = [...structure, ...length, ...humanization, ...linking, ...honesty];

/** Does a law apply to this record? */
export function lawApplies(law, rec) {
  if (law.appliesTo === '*' || law.appliesTo == null) return true;
  if (typeof law.appliesTo === 'function') return !!law.appliesTo(rec);
  if (Array.isArray(law.appliesTo)) return law.appliesTo.includes(rec.type);
  return law.appliesTo === rec.type;
}

/** Run every applicable law. Returns [{ law, message, count }] */
export function runLaws(rec, ctx) {
  const out = [];
  for (const law of LAWS) {
    if (!lawApplies(law, rec)) continue;
    let res;
    try {
      res = law.check(rec.entry, ctx);
    } catch (err) {
      res = { message: `law threw: ${err.message}`, count: 1 };
    }
    if (!res) continue;
    if (typeof res === 'string') out.push({ law: law.name, message: res, count: 1 });
    else out.push({ law: law.name, message: res.message, count: res.count ?? 1 });
  }
  return out;
}
