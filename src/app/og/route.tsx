import { readFile } from 'node:fs/promises';
import { ImageResponse } from 'next/og';
import { meshSpec } from '@/lib/mesh/spec';
import { meshSvgDataUri } from '@/lib/mesh/svg';

export const runtime = 'nodejs';

// Dynamic per-page OG image (1200x630). Two contracts live here:
//
//   ?slug=<meshKey>&word=<word.>   -> the mesh card (the current design)
//   ?title=...&eyebrow=...         -> the legacy dark card
//
// The legacy branch is NOT dead code. The seven hub pages (/blog, /guides,
// /compare, ...) have no ContentEntry, so no meshKey and no hero word, and
// Hub.tsx still calls ogImageUrl(title). Deleting it breaks every hub card at
// once, plus any already-crawled card URL sitting in a social scraper's cache.
// Branch on `slug`, because that is the parameter only the mesh contract sends.

const W = 1200;
const H = 630;

// *** THESE THREE MIRROR src/components/seo/MeshHero.tsx — KEEP THEM IN SYNC ***
// They are the whole reason the page hero and the social card read as one image.
// MeshHero expresses them in cqw against its own box; at the OG card's fixed
// 1200px width the percentages resolve to these pixel values.
/** 10.8% of width. */
const WORD_SIZE = W * 0.108; // 129.6
/** 6% of width, on the left and bottom edges. */
const WORD_INSET = W * 0.06; // 72
/** MeshHero uses -0.02em; satori is happiest with an absolute length. */
const WORD_TRACKING = -0.02 * WORD_SIZE; // -2.592

const FONT_FAMILY = 'Instrument Serif';

/**
 * The .woff — NOT the .woff2 next to it. satori's font parser (opentype-derived)
 * handles WOFF1 but rejects WOFF2's Brotli-compressed tables outright, and the
 * failure surfaces as a throw at ImageResponse construction, not at read time.
 *
 * Read through `new URL(..., import.meta.url)` so the bundler sees a static
 * asset reference and emits the file; next.config.ts also names it in
 * outputFileTracingIncludes, because a font that fails to ship does not error —
 * it silently renders the word in the fallback face.
 */
const FONT_URL = new URL('./instrument-serif-latin-400-normal.woff', import.meta.url);

let fontPromise: Promise<Buffer | null> | null = null;

function loadFont(): Promise<Buffer | null> {
  // Module-scope memo: the route is hit once per share-scrape per slug, but a
  // crawler burst would otherwise re-read the same 18KB off disk every time.
  if (!fontPromise) {
    fontPromise = readFile(FONT_URL).catch((err: unknown) => {
      // Only SUCCESS is memoized. A transient read failure — EMFILE under a
      // crawler burst is the realistic one — must not poison the cache, or the
      // process serves every card for the rest of its life in the wrong
      // typeface from one unlucky moment. Clearing the memo makes the next
      // request retry the read.
      fontPromise = null;
      // Deliberately non-fatal. Without a fonts array next/og falls back to its
      // bundled sans, which is wrong-looking but legible — strictly better than
      // a 500 on a URL that only ever renders a preview image. Loud in logs so
      // a missing-asset regression is findable.
      // eslint-disable-next-line no-console
      console.error('[og] Instrument Serif failed to load; word will render in the fallback face', err);
      return null;
    });
  }
  return fontPromise;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');

  const element = slug ? await meshCard(slug, searchParams.get('word')) : legacyCard(searchParams);
  const font = slug ? await loadFont() : null;

  return new ImageResponse(element, {
    width: W,
    height: H,
    ...(font
      ? { fonts: [{ name: FONT_FAMILY, data: font, weight: 400 as const, style: 'normal' as const }] }
      : {}),
    headers: { 'cache-control': 'public, max-age=86400, s-maxage=86400, immutable' },
  });
}

/**
 * The mesh card: identical art to the page's MeshHero, with the word composited
 * on top as a real satori text node.
 *
 * *** THE WORD IS NEVER INSIDE THE SVG. ***
 * next/og rasterizes via resvg, whose font database holds only the fonts handed
 * to ImageResponse. A <text> element inside an embedded data-URI SVG is resolved
 * by resvg on its own and never sees them, so it renders as tofu — or, more
 * often, as nothing at all, with no error and no warning. Keeping the word in
 * this JSX layer is what makes it a satori-shaped glyph run instead.
 */
async function meshCard(rawSlug: string, rawWord: string | null) {
  // The seed is the meshKey ("comparison/fathom"), not the bare slug — slugs
  // repeat across content types and would otherwise share art. See word.ts.
  const key = rawSlug.slice(0, 64);
  const word = (rawWord || '').slice(0, 24);
  const art = meshSvgDataUri(meshSpec(key), W, H);

  return (
    <div style={{ width: W, height: H, display: 'flex', position: 'relative' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={art} width={W} height={H} alt="" style={{ position: 'absolute', top: 0, left: 0 }} />
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: W,
          height: H,
          display: 'flex',
          alignItems: 'flex-end',
          padding: WORD_INSET,
        }}
      >
        <div
          style={{
            fontFamily: FONT_FAMILY,
            fontSize: WORD_SIZE,
            fontWeight: 400,
            lineHeight: 1,
            letterSpacing: WORD_TRACKING,
            color: '#ffffff',
            // No wrap: the composition is one line by definition, and heroWordFor
            // caps at 12 characters + a period, which fits 1056px of usable width
            // with room to spare. Belt and braces against a hand-set heroWord.
            whiteSpace: 'nowrap',
            textShadow: '0 1px 24px rgba(0,0,0,0.28)',
          }}
        >
          {word}
        </div>
      </div>
    </div>
  );
}

/** The pre-mesh card. Kept byte-compatible for the hub pages. */
function legacyCard(searchParams: URLSearchParams) {
  const title = (
    searchParams.get('title') || 'Privacy-first analytics that shows you revenue'
  ).slice(0, 120);
  const eyebrow = (searchParams.get('eyebrow') || 'Conclick').slice(0, 32);

  return (
    <div
      style={{
        width: '1200px',
        height: '630px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: '#050505',
        padding: '72px',
        position: 'relative',
      }}
    >
      {/* purple glow */}
      <div
        style={{
          position: 'absolute',
          top: '-200px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '900px',
          height: '500px',
          background: 'radial-gradient(closest-side, rgba(108,99,201,0.35), rgba(108,99,201,0))',
        }}
      />
      {/* brand row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#6C63C9' }} />
        <div style={{ fontSize: '30px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.5px' }}>Conclick</div>
      </div>

      {/* title block */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div
          style={{
            display: 'flex',
            alignSelf: 'flex-start',
            padding: '8px 18px',
            borderRadius: '999px',
            border: '1px solid rgba(255,255,255,0.14)',
            background: 'rgba(255,255,255,0.05)',
            color: '#c7c5ec',
            fontSize: '22px',
            fontWeight: 600,
          }}
        >
          {eyebrow}
        </div>
        <div
          style={{
            fontSize: '64px',
            fontWeight: 700,
            color: '#ffffff',
            lineHeight: 1.08,
            letterSpacing: '-1.5px',
            maxWidth: '1000px',
          }}
        >
          {title}
        </div>
      </div>

      {/* footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '24px', color: '#8b88cf', fontWeight: 600 }}>conclick.io</div>
        <div style={{ fontSize: '20px', color: '#6b7280' }}>Analytics · Heatmaps · Funnels · Revenue</div>
      </div>
    </div>
  );
}
