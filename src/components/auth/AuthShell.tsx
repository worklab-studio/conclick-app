/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from 'react';
import { Check, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/logo';

// Pull a clean, render-safe domain out of the ?site= param the marketing-site
// hero passes through (e.g. /register?site=acme.com). Returns null for junk so
// the greeting simply doesn't render.
export function cleanDomain(raw?: string | string[]): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  let v = value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '');
  v = v.split('/')[0].split('?')[0].split('#')[0];
  return /^([a-z0-9-]+\.)+[a-z]{2,}$/.test(v) ? v : null;
}

// Signing up is step 1 of getting to live data — showing the whole path sets
// the expectation that this takes minutes, not an afternoon.
const STEPS = ['Create your account', 'Add your website', 'Watch your first visitor land'];

const LOGIN_POINTS = [
  'Live globe of everyone on your site',
  'Funnels that name the step losing you money',
  'AI answers, indexing and training bots, split apart',
];

/**
 * Auth chrome: a single contained card centered on the page — an inset
 * aurora panel on the left (brand + what happens next), the form alone on
 * the right so persuasion never competes with the task. Collapses to
 * form-only under `lg`; pure CSS gradients, no imagery, so mobile stays fast.
 */
export function AuthShell({
  domain,
  variant = 'login',
  children,
}: {
  domain: string | null;
  variant?: 'login' | 'register';
  children: ReactNode;
}) {
  return (
    <div
      className="relative flex min-h-screen w-full items-center justify-center p-4 sm:p-6"
      style={{
        background:
          'radial-gradient(1100px 520px at 50% -10%, rgba(94,91,164,0.10), transparent 62%), hsl(0, 0%, 4%)',
      }}
    >
      <div className="w-full max-w-[1000px] overflow-hidden rounded-[20px] border border-white/[0.07] bg-[hsl(0,0%,6%)] p-2.5 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.9)] lg:grid lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1fr)] lg:gap-2.5">
        {/* ── LEFT: inset aurora panel ──────────────────────────────── */}
        <aside className="relative hidden overflow-hidden rounded-[14px] bg-[#08080d] lg:flex lg:flex-col lg:justify-between lg:p-8">
          {/* aurora bloom */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(120% 78% at 50% 8%, rgba(150,116,255,0.95) 0%, rgba(108,86,220,0.62) 26%, rgba(62,48,140,0.34) 46%, rgba(12,10,26,0.05) 68%, transparent 82%)',
              filter: 'blur(26px)',
            }}
          />
          {/* fine grain so the gradient never bands */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.16] mix-blend-overlay"
            style={{
              backgroundImage: 'radial-gradient(rgba(255,255,255,0.85) 0.5px, transparent 0.6px)',
              backgroundSize: '3px 3px',
            }}
          />

          <div className="relative z-10">
            <Logo className="h-8 w-auto" />
          </div>

          <div className="relative z-10">
            <h2 className="text-[22px] font-bold leading-snug tracking-tight text-white">
              {variant === 'register' ? 'Live data in three steps' : 'Welcome back to Conclick'}
            </h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-white/60">
              {variant === 'register'
                ? 'Analytics that tells you what to fix — not just what happened.'
                : 'Your dashboard is right where you left it.'}
            </p>

            {variant === 'register' ? (
              <ol className="mt-6 space-y-2">
                {STEPS.map((label, i) => {
                  const current = i === 0;
                  return (
                    <li
                      key={label}
                      className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors ${
                        current
                          ? 'bg-white text-zinc-900 shadow-lg'
                          : 'bg-white/[0.07] text-white/70 backdrop-blur-sm'
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                          current ? 'bg-zinc-900 text-white' : 'bg-white/15 text-white/80'
                        }`}
                      >
                        {i + 1}
                      </span>
                      {label}
                    </li>
                  );
                })}
              </ol>
            ) : (
              <ul className="mt-6 space-y-2.5">
                {LOGIN_POINTS.map(point => (
                  <li key={point} className="flex items-start gap-2.5 text-[13px] text-white/75">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/15">
                      <Check className="h-2.5 w-2.5 text-white" />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="relative z-10 flex items-center gap-2 text-[11px] text-white/45">
            <ShieldCheck className="h-3.5 w-3.5" />
            Cookie-free · bots filtered · your data stays yours
          </div>
        </aside>

        {/* ── RIGHT: the form, alone ────────────────────────────────── */}
        <main className="flex flex-col items-center justify-center px-4 py-8 sm:px-8 sm:py-10">
          <div className="mb-6 lg:hidden">
            <Logo className="h-8 w-auto" />
          </div>

          {domain && (
            <div className="mb-5 flex items-center gap-2.5">
              <span
                className="flex h-[26px] w-[26px] items-center justify-center"
                style={{
                  background: 'hsl(0, 0%, 8%)',
                  border: '1px solid hsl(0, 0%, 12%)',
                  borderRadius: 6,
                }}
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

          <div className="w-full max-w-[360px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
