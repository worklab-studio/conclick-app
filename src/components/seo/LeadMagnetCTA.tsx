'use client';

import { useState } from 'react';
import type { LeadMagnet } from '@/content/schema';
import { registerUrl } from '@/lib/signup';

// The embedded "Add My Website" lead magnet — mirrors the hero flow and sends
// the visitor to the register page, which personalises from ?site=.
//
// The domain parser and URL builder now come from @/lib/signup. They used to be
// copy-pasted here and in HeroWebsiteInput, and BOTH copies pointed at
// NEXT_PUBLIC_SITE_URL (conclick.io) instead of the app host — so this CTA, at
// the foot of all 68 article pages, navigated to a 404. Verified live and fixed
// 2026-07-26.
export function LeadMagnetCTA({ leadMagnet }: { leadMagnet: LeadMagnet }) {
  const [value, setValue] = useState('');

  function go() {
    window.location.href = registerUrl(value);
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
