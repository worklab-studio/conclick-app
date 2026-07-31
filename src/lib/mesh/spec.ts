// Deterministic dark indigo mesh art generator.
//
// PURE MODULE — no React, no Next, no DOM, no fs. It is imported by
//   - src/components/seo/MeshHero.tsx  (server component, inline <svg>)
//   - src/app/og/route.tsx             (next/og, rasterized through resvg)
// and must therefore stay runnable in every runtime. Do not add imports here.
//
// The contract: meshSpec(slug) is a pure function of the slug string, so the
// hero image on the page and the OG card for the same page are byte-for-byte
// the same art. The WORD is never part of this art (see svg.ts).

export interface MeshBlob {
  /** Center X as a fraction of width (0..1). */
  cx: number;
  /** Center Y as a fraction of height (0..1). */
  cy: number;
  /** Radius as a fraction of max(width, height). Blobs deliberately overflow. */
  r: number;
  /** 0..360 */
  hue: number;
  /** percent */
  sat: number;
  /** percent */
  light: number;
  /** 0..1 peak opacity at the blob center */
  alpha: number;
}

export interface MeshSpec {
  /** The slug this spec was derived from (used to build stable SVG element ids). */
  slug: string;
  /**
   * Flat wash painted under the blobs so no seams show through.
   *
   * `hex`, when present, wins over the HSL triple. It exists because HSL does
   * not round-trip to an exact hex: hsl(245,49%,59%) rasterizes to #6c63ca, one
   * byte off the #6C63C9 brand value. Close enough for a blob buried under a
   * blur, not close enough for a flat card that sits next to real brand chrome.
   */
  base: { hue: number; sat: number; light: number; hex?: string };
  /** Exactly 5. blobs[0] is always brand-locked. */
  blobs: MeshBlob[];
  /** Gaussian blur stdDeviation as a fraction of max(width, height). */
  blur: number;
  /** 0..1 strength of the bottom scrim that keeps white display text legible. */
  scrim: number;
}

// Conclick primary #6C63C9 expressed in HSL. Blob 0 is locked to this hue so
// every generated image still reads as a Conclick image.
const BRAND_HUE = 245;
const BRAND_SAT = 49;
// hsl(245, 49%, 59%) ~= #6C63C9, the Conclick primary (see MeshSpec.base.hex).
const BRAND_LIGHT = 59;
const BRAND_HEX = '#6C63C9';

/**
 * Flat brand fill instead of a gradient mesh.
 *
 * Set false to bring back the blob mesh (the code below is intact). Kept as a
 * flag rather than deleted because the gradient path is ~40 lines of tuned
 * constants that would be tedious to reconstruct.
 */
const SOLID = true;

// Per-blob hue offsets from the brand hue, in degrees.
//
// This is a MONOCHROME ramp: every blob is the brand purple, and the offsets
// are small enough (+/-7deg) to be imperceptible as hue — they exist only to
// stop the radial gradients banding into visible rings where they overlap.
//
// Two earlier versions were wrong in the same way, from opposite ends. A
// golden-angle (137.5deg) fan put orange, green and yellow on the card. Pulling
// it back to a +/-28deg blue-violet band still read as several colours. The art
// has to look like one shade of #6C63C9 lit from different directions, so all
// variation now comes from LIGHTNESS, ALPHA and POSITION. Never reintroduce
// hue travel here.
const HUE_OFFSETS = [0, -6, 5, -3, 7];

/** FNV-1a (32-bit). Fast, dependency-free, good avalanche for short strings. */
export function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    // h *= 16777619, done in 32-bit-safe pieces to avoid float precision loss.
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

/** mulberry32 — tiny, high-quality, fully deterministic PRNG. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random float in [min, max). */
function between(rnd: () => number, min: number, max: number): number {
  return min + rnd() * (max - min);
}

// Where each blob roughly lives, as a fraction of the canvas. Blob 0 (brand) is
// anchored upper-right so it never sits under the word, which renders
// bottom-left. The rest are jittered around these anchors.
const ANCHORS: Array<[number, number]> = [
  [0.74, 0.26], // 0, brand, top right
  [0.18, 0.2], // 1, top left
  [0.5, 0.78], // 2, bottom center
  [0.92, 0.72], // 3, bottom right
  [0.06, 0.62], // 4, left, low
];

/**
 * Build the deterministic art spec for a slug.
 *
 * Same slug in, identical spec out — forever. Changing the constants in this
 * file changes every existing image, so treat them as a versioned asset.
 */
export function meshSpec(slug: string): MeshSpec {
  const rnd = mulberry32(fnv1a(slug));

  // SOLID BRAND FILL.
  //
  // The art is now one flat #6C63C9 card with the word on it. The blob/gradient
  // machinery below is retained but unused: `blobs` is empty, so svg.ts paints
  // the base and nothing else. Keeping the shape of the spec means MeshHero,
  // the card thumbs and the OG route need no changes, and re-enabling a
  // gradient later is a one-line revert rather than a rewrite.
  //
  // Determinism is now trivial (every slug renders identically), which is fine:
  // the WORD is what distinguishes one card from another, not the art.
  if (SOLID) {
    return {
      slug,
      base: { hue: BRAND_HUE, sat: BRAND_SAT, light: BRAND_LIGHT, hex: BRAND_HEX },
      blobs: [],
      blur: 0,
      // No scrim: white on #6C63C9 is 4.6:1, which already clears AA for normal
      // text, and a scrim would darken the flat colour away from brand.
      scrim: 0,
    };
  }

  const blobs: MeshBlob[] = ANCHORS.map(([ax, ay], i) => {
    // Hue stays inside the blue-violet band. Jitter is small on purpose: the
    // point is a family, not variety.
    const hue = (BRAND_HUE + HUE_OFFSETS[i] + between(rnd, -7, 7) + 360) % 360;

    // DARK, not pastel. These cards sit on a #030303 page, so the art has to be
    // a dark surface with light blooming through it rather than a bright panel
    // punched into the page.
    //
    // Saturation stays in a narrow band around the brand value: drop below ~40
    // and the purple turns to grey slush, push above ~62 and it goes neon.
    // LIGHTNESS is the only wide axis, and it has to be wide — it is now the
    // sole source of depth, since every blob shares one hue. Blob 0 is the
    // bright bloom that anchors the composition; the rest recede.
    const sat = i === 0 ? BRAND_SAT + between(rnd, 4, 12) : between(rnd, 42, 58);
    const light = i === 0 ? between(rnd, 38, 47) : between(rnd, 15, 33);

    return {
      cx: clamp01(ax + between(rnd, -0.09, 0.09)),
      cy: clamp01(ay + between(rnd, -0.09, 0.09)),
      // Blobs must overlap enough to blend, but NOT so much that all five cover
      // the whole canvas — at r > ~0.5 every blob touches every corner, the hues
      // average together, and each image collapses into the same grey-purple
      // wash regardless of its seed. This band keeps the individual hues legible.
      r: between(rnd, 0.3, 0.46),
      hue: round(hue, 2),
      sat: round(sat, 2),
      light: round(light, 2),
      alpha: i === 0 ? round(between(rnd, 0.85, 0.95), 3) : round(between(rnd, 0.62, 0.86), 3),
    };
  });

  return {
    slug,
    // The wash is a desaturated cousin of the brand hue, so gaps between blobs
    // never fall through to grey.
    // Near-black indigo, a couple of points above the page background so the
    // card reads as a distinct surface without becoming a light rectangle.
    base: {
      hue: round((BRAND_HUE + between(rnd, -12, 12) + 360) % 360, 2),
      sat: round(between(rnd, 28, 44), 2),
      light: round(between(rnd, 7, 11), 2),
    },
    blobs,
    // Small. The radial gradients are ALREADY the softness; this blur only
    // dissolves the seams where blobs meet. At the original 0.07-0.11 (84-132px
    // of stdDeviation) it smeared all five hues into a single wash and every
    // slug produced a near-identical image.
    blur: round(between(rnd, 0.022, 0.036), 4),
    // Much lower than it was. The old 0.52-0.6 existed to darken PASTEL art so
    // white text could hold on it; against the dark palette above, the contrast
    // is already there and a heavy scrim only flattens the blooms into grey.
    // What is left is a light vignette that seats the word on the art.
    scrim: round(between(rnd, 0.14, 0.24), 3),
  };
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, round(n, 4)));
}

function round(n: number, places: number): number {
  const f = Math.pow(10, places);
  return Math.round(n * f) / f;
}
