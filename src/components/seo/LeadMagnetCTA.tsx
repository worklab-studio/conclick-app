'use client';

import { useState } from 'react';
import type { LeadMagnet } from '@/content/schema';

function cleanDomain(raw: string): string | null {
  let v = (raw || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');
  v = v.split('/')[0].split('?')[0].split('#')[0];
  return /^([a-z0-9-]+\.)+[a-z]{2,}$/.test(v) ? v : null;
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://conclick.io';

// The embedded "Add My Website" lead magnet — mirrors the hero/AuthShell flow and
// sends the visitor to conclick.io/register?site=<domain> (the register page
// already personalizes from ?site=).
export function LeadMagnetCTA({ leadMagnet }: { leadMagnet: LeadMagnet }) {
  const [value, setValue] = useState('');

  function go() {
    const d = cleanDomain(value);
    window.location.href = d ? `${SITE}/register?site=${encodeURIComponent(d)}` : `${SITE}/register`;
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-7 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-32"
        style={{ background: 'radial-gradient(60% 100% at 50% 0%, rgba(108,99,201,0.18), rgba(108,99,201,0) 70%)' }}
      />
      <div className="relative">
        <div className="text-lg font-semibold tracking-[-0.01em] text-white">{leadMagnet.headline}</div>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-zinc-400">{leadMagnet.sub}</p>
        <div className="mx-auto mt-5 flex max-w-md gap-2">
          <input
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && go()}
            placeholder="www.yoursite.com"
            aria-label="Your website URL"
            className="h-11 flex-1 rounded-md border border-white/10 bg-white/[0.04] px-4 text-sm text-white placeholder:text-zinc-500 focus:border-[#6C63C9] focus:outline-none focus:ring-1 focus:ring-[#6C63C9]"
          />
          <button
            onClick={go}
            className="h-11 shrink-0 rounded-md bg-[#6C63C9] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#7b73d6]"
          >
            {leadMagnet.ctaLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
