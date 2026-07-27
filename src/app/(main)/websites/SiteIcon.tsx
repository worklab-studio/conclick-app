'use client';

import { useEffect, useMemo, useState } from 'react';

// Deterministic, pleasant gradient derived from the domain so each site gets a
// stable, distinct monogram color even before/without a favicon.
function gradientFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) % 360;
  }
  const h2 = (h + 38) % 360;
  return `linear-gradient(135deg, hsl(${h} 58% 48%), hsl(${h2} 62% 38%))`;
}

function clean(domain?: string, name?: string) {
  return (domain || name || '?')
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '');
}

/**
 * Site avatar: shows the real favicon when one genuinely exists, otherwise a
 * crisp gradient monogram (never a blurry fallback globe).
 *
 * Favicons are tried from THREE sources in order, advancing on failure:
 *   1. DuckDuckGo's proxy — fetches live, so brand-new sites (the add-website
 *      flow's whole audience) resolve immediately; 404s cleanly when missing.
 *   2. Google s2 at sz=128 — huge cache, but returns a tiny generic globe for
 *      unknown sites, so its result only counts at a real resolution (>=32px).
 *   3. The site's own /favicon.ico, as a last resort.
 * Only a successfully loaded real image swaps in; anything else keeps the
 * monogram.
 */
export function SiteIcon({
  domain,
  name,
  size = 28,
  className = 'rounded-md',
}: {
  domain?: string;
  name?: string;
  size?: number;
  className?: string;
}) {
  const host = clean(domain, name);
  const letter = (name?.trim() || host || '?').charAt(0).toUpperCase();
  const [srcIdx, setSrcIdx] = useState(0);
  const [ok, setOk] = useState(false);

  const sources = useMemo(
    () =>
      host && host !== '?'
        ? [
            { src: `https://icons.duckduckgo.com/ip3/${host}.ico`, minWidth: 8 },
            {
              src: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`,
              minWidth: 32,
            },
            { src: `https://${host}/favicon.ico`, minWidth: 8 },
          ]
        : [],
    [host],
  );

  // Reset when the domain changes (e.g. the live preview while typing).
  useEffect(() => {
    setSrcIdx(0);
    setOk(false);
  }, [host]);

  const current = sources[srcIdx];
  const advance = () => {
    if (srcIdx < sources.length - 1) setSrcIdx(srcIdx + 1);
  };

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden ${className}`}
      style={{ width: size, height: size, background: ok ? '#ffffff' : gradientFor(host) }}
      aria-hidden
    >
      {!ok && (
        <span
          className="font-semibold leading-none text-white"
          style={{ fontSize: Math.round(size * 0.46) }}
        >
          {letter}
        </span>
      )}
      {current && (
        <img
          key={current.src}
          src={current.src}
          alt=""
          width={size}
          height={size}
          className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-200 ${
            ok ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={e => {
            if (e.currentTarget.naturalWidth >= current.minWidth) {
              setOk(true);
            } else {
              advance();
            }
          }}
          onError={advance}
        />
      )}
    </span>
  );
}
