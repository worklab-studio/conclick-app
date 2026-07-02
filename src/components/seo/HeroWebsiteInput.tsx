'use client';

import { useState } from 'react';
import { Globe } from 'lucide-react';

// The conclick.io homepage hero input: a globe-prefixed domain field + purple
// "Add My Website" button -> conclick.io/register?site=<domain>.
function cleanDomain(raw: string): string | null {
  let v = (raw || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');
  v = v.split('/')[0].split('?')[0].split('#')[0];
  return /^([a-z0-9-]+\.)+[a-z]{2,}$/.test(v) ? v : null;
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://conclick.io';

export function HeroWebsiteInput({
  ctaLabel = 'Add My Website',
  placeholder = 'www.website.com',
}: {
  ctaLabel?: string;
  placeholder?: string;
}) {
  const [value, setValue] = useState('');

  function go() {
    const d = cleanDomain(value);
    window.location.href = d ? `${SITE}/register?site=${encodeURIComponent(d)}` : `${SITE}/register`;
  }

  return (
    <div className="mx-auto flex max-w-[30rem] items-center gap-3">
      <div className="flex h-12 flex-1 items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.04] px-3.5 transition-colors focus-within:border-[#6C63C9]">
        <Globe className="h-4 w-4 shrink-0 text-zinc-500" />
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && go()}
          placeholder={placeholder}
          aria-label="Your website URL"
          className="h-full w-full bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none"
        />
      </div>
      <button
        onClick={go}
        className="h-12 shrink-0 rounded-lg bg-[#6C63C9] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#7b73d6]"
      >
        {ctaLabel}
      </button>
    </div>
  );
}
