'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight, Globe, MousePointerClick, Sparkles, TrendingDown } from 'lucide-react';

const PREVIEW = [
  {
    icon: Globe,
    title: 'Live visitors on a globe',
    body: 'Watch people land on your site in real time, with where they came from.',
  },
  {
    icon: TrendingDown,
    title: 'Funnels that name the leak',
    body: 'See the exact step losing you money, not just that something dropped.',
  },
  {
    icon: MousePointerClick,
    title: 'Click maps on your real pages',
    body: 'Every click recorded automatically, with no tagging work from you.',
  },
  {
    icon: Sparkles,
    title: 'AI answers and crawlers',
    body: 'Know when ChatGPT and Google cite you, kept separate from real people.',
  },
];

/**
 * First screen for a brand new personal account. The old version was a dead
 * end: a wall that said "No websites found" and asked for work before showing
 * anything. This one sells the destination and drops straight into the guided
 * setup, which reads their site and proves value before any install.
 *
 * The right column stays a plain list. An animated illustrated preview was
 * tried here and rejected: drawn mockups of the globe and funnel read as
 * decoration rather than product, so the panel states what arrives and lets
 * the real screens speak for themselves once data lands.
 */
export function OnboardingEmptyState() {
  const router = useRouter();

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-white/[0.07] bg-[hsl(0,0%,6.5%)]">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        {/* pitch + CTA */}
        <div className="relative overflow-hidden p-8 sm:p-10">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(620px 280px at 10% 0%, rgba(94,91,164,0.18), transparent 66%)',
            }}
          />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#5e5ba4]/30 bg-[#5e5ba4]/15 px-2.5 py-1 text-[11px] font-medium text-[#c7c5ec]">
              <Sparkles className="h-3 w-3" /> Takes about two minutes
            </span>

            <h2 className="mt-4 text-[28px] font-bold leading-tight tracking-tight text-white sm:text-[32px]">
              Let us read your site
              <br />
              and set itself up.
            </h2>
            <p className="mt-3 max-w-[420px] text-[15px] leading-relaxed text-zinc-400">
              Type your domain and Conclick finds the buttons and pages worth measuring, detects
              what you are built on, and maps your first funnel. Nothing to install to see it.
            </p>

            <button
              type="button"
              onClick={() => router.push('/websites?setup=1', { scroll: false })}
              className="mt-7 inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60"
            >
              Analyze my website <ArrowRight className="h-4 w-4" />
            </button>

            <p className="mt-3 text-[11.5px] text-zinc-600">
              We only read publicly available pages, exactly like a visitor would.
            </p>
          </div>
        </div>

        {/* what they are getting */}
        <div className="border-t border-white/[0.06] bg-white/[0.015] p-8 sm:p-10 lg:border-l lg:border-t-0">
          <div className="mb-4 text-[11px] uppercase tracking-wide text-zinc-600">
            What lands in here
          </div>
          <ul className="space-y-5">
            {PREVIEW.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3.5">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#5e5ba4]/15 text-[#b9b5f0] ring-1 ring-inset ring-[#5e5ba4]/25">
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-[13.5px] font-semibold text-zinc-100">{title}</div>
                  <div className="mt-0.5 text-[12.5px] leading-relaxed text-zinc-500">{body}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
