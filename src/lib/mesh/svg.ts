// Renders a MeshSpec to an SVG string. ART ONLY.
//
// *** THERE IS NEVER A <text> ELEMENT IN HERE. NEVER ADD ONE. ***
//
// next/og rasterizes through resvg, and resvg's font database contains ONLY the
// fonts handed to ImageResponse({ fonts }). A <text> node inside an embedded
// data-URI SVG is resolved by resvg itself, which never sees those fonts — so it
// renders as tofu or silently as nothing, with no error and no warning.
//
// The word is therefore drawn by the CALLER, in the caller's own text layer:
//   - MeshHero.tsx   -> real DOM text on top of this SVG
//   - app/og/route.tsx -> a satori text node on top of this SVG
// Both consume the identical art, which is what keeps the page hero and the
// social card looking like the same image.

import type { MeshSpec } from './spec';
import { fnv1a } from './spec';

/**
 * Build the art SVG for a spec.
 *
 * @param spec  from meshSpec(slug)
 * @param w     viewBox width  (default 1200 — the OG card width)
 * @param h     viewBox height (default 630  — the OG card height)
 */
export function meshSvg(spec: MeshSpec, w = 1200, h = 630): string {
  const id = idPrefix(spec.slug);
  const major = Math.max(w, h);

  // Solid path: no blobs means a flat brand card. Emitted as its own minimal
  // SVG rather than falling through the gradient path, because a <filter> with
  // nothing inside it and a zero-opacity scrim are both things renderers handle
  // inconsistently — resvg in particular has been known to blank the layer.
  if (!spec.blobs.length) {
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" ` +
      `viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" role="presentation">` +
      `<rect width="${w}" height="${h}" fill="${spec.base.hex ?? hsl(spec.base.hue, spec.base.sat, spec.base.light)}"/>` +
      `</svg>`
    );
  }

  const gradients = spec.blobs
    .map((b, i) => {
      const color = hsl(b.hue, b.sat, b.light);
      return (
        `<radialGradient id="${id}-b${i}" cx="50%" cy="50%" r="50%">` +
        `<stop offset="0" stop-color="${color}" stop-opacity="${b.alpha}"/>` +
        // Mid stop shapes the falloff so the blob reads soft even if a renderer
        // drops the blur filter entirely. The gradient alone is the fallback.
        // Held high (0.72 at 45%) to give each blob a solid core — a lazier
        // falloff is what lets five overlapping blobs average into grey.
        `<stop offset="0.45" stop-color="${color}" stop-opacity="${round(b.alpha * 0.72, 3)}"/>` +
        `<stop offset="1" stop-color="${color}" stop-opacity="0"/>` +
        `</radialGradient>`
      );
    })
    .join('');

  const blobs = spec.blobs
    .map((b, i) => {
      const r = round(b.r * major, 2);
      return (
        `<ellipse cx="${round(b.cx * w, 2)}" cy="${round(b.cy * h, 2)}" ` +
        `rx="${r}" ry="${r}" fill="url(#${id}-b${i})"/>`
      );
    })
    .join('');

  // Bottom scrim. Keeps white display type legible over the pastel band without
  // muddying the top two-thirds of the art. Baked in here (rather than layered
  // in CSS) so the hero and the OG card get the exact same tonality.
  const scrim =
    `<linearGradient id="${id}-scrim" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#000" stop-opacity="0"/>` +
    `<stop offset="0.55" stop-color="#000" stop-opacity="${round(spec.scrim * 0.35, 3)}"/>` +
    `<stop offset="1" stop-color="#000" stop-opacity="${spec.scrim}"/>` +
    `</linearGradient>`;

  // color-interpolation-filters="sRGB" is NOT optional: browsers default
  // feGaussianBlur to linearRGB while resvg's default differs, and the mismatch
  // makes the hero and the OG card visibly different shades. Pin it.
  const filter =
    `<filter id="${id}-blur" x="-30%" y="-30%" width="160%" height="160%" ` +
    `color-interpolation-filters="sRGB">` +
    `<feGaussianBlur stdDeviation="${round(spec.blur * major, 2)}"/>` +
    `</filter>`;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" ` +
    `viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" role="presentation">` +
    `<defs>${gradients}${scrim}${filter}</defs>` +
    `<rect width="${w}" height="${h}" fill="${spec.base.hex ?? hsl(spec.base.hue, spec.base.sat, spec.base.light)}"/>` +
    `<g filter="url(#${id}-blur)">${blobs}</g>` +
    `<rect width="${w}" height="${h}" fill="url(#${id}-scrim)"/>` +
    `</svg>`
  );
}

/**
 * The same art as a data URI, for consumers that need an <img src> rather than
 * inline markup — notably the satori/next-og card.
 *
 * Percent-encoded (not base64) on purpose: no Buffer, no btoa, so this stays
 * runnable on every runtime.
 */
export function meshSvgDataUri(spec: MeshSpec, w = 1200, h = 630): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(meshSvg(spec, w, h))}`;
}

/**
 * Stable, collision-resistant, injection-safe prefix for the SVG element ids.
 *
 * The slug reaches us from a file name, but this string lands inside markup that
 * gets inlined with dangerouslySetInnerHTML — so it is stripped to [a-z0-9-] and
 * suffixed with the slug hash rather than trusted.
 */
function idPrefix(slug: string): string {
  const safe = slug.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 32) || 'mesh';
  return `m${fnv1a(slug).toString(36)}-${safe}`;
}

/**
 * HSL -> #rrggbb.
 *
 * We resolve to hex rather than emitting `hsl(...)` because the consumers do not
 * share a color parser: browsers accept both the legacy comma form and the CSS
 * Color 4 space form, while resvg (which rasterizes the OG card) is far pickier.
 * An unparsed color is dropped silently and the blob just vanishes. Hex is the
 * one notation every one of them agrees on.
 */
function hsl(h: number, s: number, l: number): string {
  const sN = s / 100;
  const lN = l / 100;
  const c = (1 - Math.abs(2 * lN - 1)) * sN;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const m = lN - c / 2;

  let rgb: [number, number, number];
  if (hp < 1) rgb = [c, x, 0];
  else if (hp < 2) rgb = [x, c, 0];
  else if (hp < 3) rgb = [0, c, x];
  else if (hp < 4) rgb = [0, x, c];
  else if (hp < 5) rgb = [x, 0, c];
  else rgb = [c, 0, x];

  return (
    '#' +
    rgb
      .map(v => {
        const byte = Math.round((v + m) * 255);
        return Math.min(255, Math.max(0, byte)).toString(16).padStart(2, '0');
      })
      .join('')
  );
}

function round(n: number, places: number): number {
  const f = Math.pow(10, places);
  return Math.round(n * f) / f;
}
