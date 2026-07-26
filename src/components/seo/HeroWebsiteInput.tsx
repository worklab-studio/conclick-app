'use client';

import { useEffect, useState } from 'react';
import { Globe } from 'lucide-react';
import { cleanDomain, faviconUrl, registerUrl } from '@/lib/signup';

// The "Add My Website" field: a domain input that previews the site's favicon
// once it recognises what you typed, then hands the domain to the register page.
//
// Used in TWO places with different surroundings — the hero of the commercial
// article types (/vs, /alternatives, /for, /tools) and the pre-footer band on
// every SEO page. The root keeps `mx-auto max-w-[30rem]`: ContentArticle wraps
// it in a matching max-w-[30rem] so the mx-auto has no slack and the field
// renders flush left, while SeoFooter leaves it free to centre. Changing either
// value here silently moves the field on one of those surfaces.
//
// The favicon is the point of the preview: instant, unmistakable proof the
// product resolved YOUR site, which argues for "~2 minute setup" better than a
// sentence claiming it. Debounced so a fast typist fires one request, not twelve.

const DEBOUNCE_MS = 350;

export function HeroWebsiteInput({
  ctaLabel = 'Add My Website',
  placeholder = 'www.website.com',
}: {
  ctaLabel?: string;
  placeholder?: string;
}) {
  const [value, setValue] = useState('');
  const [domain, setDomain] = useState<string | null>(null);
  const [iconOk, setIconOk] = useState(false);

  // Debounce the RAW value, then parse. Debouncing the parsed domain instead
  // looks equivalent but is not: cleanDomain collapses many keystrokes to the
  // same result, so the effect would not re-run while someone types a path or
  // query onto a host it already recognised.
  useEffect(() => {
    const id = setTimeout(() => setDomain(cleanDomain(value)), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [value]);

  // Reset per domain, or the previous site's icon stays visible while the next
  // one loads and briefly claims to have resolved a domain it has not.
  useEffect(() => setIconOk(false), [domain]);

  function go() {
    window.location.href = registerUrl(value);
  }

  return (
    <div className="mx-auto flex max-w-[30rem] items-center gap-3">
      <div className="flex h-12 flex-1 items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.04] px-3.5 transition-colors focus-within:border-[#6C63C9]">
        {/* Fixed-size well so the globe -> favicon swap cannot reflow the input
            or shift the caret mid-typing. */}
        <span
          aria-hidden
          className="relative flex h-[26px] w-[26px] shrink-0 items-center justify-center overflow-hidden rounded-[5px] border border-white/[0.07] bg-white/[0.05]"
        >
          {domain && (
            <img
              // key= forces a fresh element per domain. Without it React reuses
              // the <img> and a cached-but-failed src can skip onError, leaving
              // an empty well with no globe fallback.
              key={domain}
              src={faviconUrl(domain)}
              alt=""
              width={16}
              height={16}
              loading="lazy"
              decoding="async"
              onLoad={() => setIconOk(true)}
              onError={() => setIconOk(false)}
              className={`h-4 w-4 rounded-[3px] transition-opacity duration-200 ${iconOk ? 'opacity-100' : 'opacity-0'}`}
            />
          )}
          {/* The globe sits UNDER the favicon rather than being swapped out, so
              a site with no icon (or a slow one) degrades to the globe instead
              of an empty square. */}
          {!iconOk && <Globe className="absolute h-4 w-4 text-zinc-500" />}
        </span>
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && go()}
          placeholder={placeholder}
          aria-label="Your website URL"
          inputMode="url"
          autoComplete="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          // text-left is explicit rather than inherited: the article hero used
          // to be text-center, which leaked in and centred the placeholder and
          // everything typed. Pinning it keeps the hero field and the SeoFooter
          // field rendering identically.
          className="h-full w-full bg-transparent text-left text-sm text-white placeholder:text-zinc-500 focus:outline-none"
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
