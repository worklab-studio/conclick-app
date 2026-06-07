'use client';

import { useEffect, useState } from 'react';

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
 * We request a high-res favicon (sz=128) and only swap it in once it loads at a
 * real resolution — Google's "no favicon" globe comes back tiny, so the
 * naturalWidth check keeps us on the monogram for sites without an icon.
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
  const [ok, setOk] = useState(false);

  // Reset when the domain changes (e.g. the live preview while typing).
  useEffect(() => {
    setOk(false);
  }, [host]);

  const src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;

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
      {host && host !== '?' && (
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-200 ${
            ok ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={e => {
            // Real favicons return >= 32px at sz=128; the generic fallback is tiny.
            if (e.currentTarget.naturalWidth >= 32) setOk(true);
          }}
          onError={() => setOk(false)}
        />
      )}
    </span>
  );
}
