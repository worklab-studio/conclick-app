/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from 'react';
import { Logo } from '@/components/logo';

// Pull a clean, render-safe domain out of the ?site= param the marketing-site
// hero passes through (e.g. /register?site=acme.com). Returns null for junk so
// the greeting simply doesn't render.
export function cleanDomain(raw?: string | string[]): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  let v = value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');
  v = v.split('/')[0].split('?')[0].split('#')[0];
  return /^([a-z0-9-]+\.)+[a-z]{2,}$/.test(v) ? v : null;
}

// Centered auth chrome shared by /login and /register, styled with the app's
// own tokens. A purple dot grid rises from the bottom of the screen and fades
// upward for depth; the Clerk card (themed in app/layout.tsx) sits centered on
// top. Domain personalization stays subtle: a favicon + one muted line.
export function AuthShell({ domain, children }: { domain: string | null; children: ReactNode }) {
  return (
    <div
      className="relative min-h-screen w-full overflow-hidden"
      style={{
        background:
          'radial-gradient(820px 340px at 50% -12%, rgba(108,99,201,0.10), transparent 60%), hsl(0, 0%, 4%)',
      }}
    >
      {/* Purple dot grid rising from the bottom, fading toward the top. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage: 'radial-gradient(rgba(124,114,228,0.60) 1.3px, transparent 1.7px)',
          backgroundSize: '20px 20px',
          backgroundPosition: 'center bottom',
          WebkitMaskImage:
            'linear-gradient(to top, #000 0%, rgba(0,0,0,0.92) 24%, transparent 74%)',
          maskImage: 'linear-gradient(to top, #000 0%, rgba(0,0,0,0.92) 24%, transparent 74%)',
        }}
      />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-6 p-6">
        <Logo className="h-10 w-auto" />

        {domain && (
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-[26px] w-[26px] items-center justify-center"
              style={{ background: 'hsl(0, 0%, 8%)', border: '1px solid hsl(0, 0%, 12%)', borderRadius: 6 }}
            >
              <img
                src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`}
                alt=""
                width={16}
                height={16}
                style={{ borderRadius: 3, display: 'block' }}
              />
            </span>
            <span className="text-sm text-muted-foreground">
              Setting up <span className="font-medium text-foreground">{domain}</span>
            </span>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
