import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import {
  ArrowUpRight,
  FileText,
  BookOpen,
  BarChart3,
  Shuffle,
  BookMarked,
  Target,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { canonical, ogImageUrl } from '@/lib/seo';
import { itemListSchema } from '@/lib/jsonld';
import { SectionEyebrow } from './SectionEyebrow';
import { JsonLd } from './JsonLd';

export interface HubItem {
  href: string;
  title: string;
  desc: string;
}

// Per-hub identity so /blogs, /guides, /compare, /tools etc. don't render as the
// same page — the icon (matching the Resources dropdown) is the fast visual tell.
const HUB_ICON: Record<string, LucideIcon> = {
  '/blogs': FileText,
  '/guides': BookOpen,
  '/compare': BarChart3,
  '/alternatives': Shuffle,
  '/glossary': BookMarked,
  '/for': Target,
  '/tools': Wrench,
};

// Shared metadata for hub/index pages — canonical + OG + Twitter (the hubs were
// missing OG/Twitter, so shared links rendered as bare URLs).
export function hubMetadata(path: string, title: string, description: string): Metadata {
  const url = canonical(path);
  const images = [ogImageUrl(title)];
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: 'website', url, title, description, siteName: 'Conclick', images },
    twitter: { card: 'summary_large_image', title, description, images },
  };
}

// Glowy hero (with a per-hub icon) + optional body + a featured card + grid.
// Featured-first keeps sparse hubs from looking empty and gives each cluster its
// own rhythm. Emits CollectionPage/ItemList JSON-LD so Google reads it as a
// curated list, not a thin doorway.
export function HubGrid({
  path,
  eyebrow,
  title,
  intro,
  items,
  body,
}: {
  path: string;
  eyebrow: string;
  title: string;
  intro: string;
  items: HubItem[];
  body?: ReactNode;
}) {
  const Icon = HUB_ICON[path] ?? FileText;
  const [featured, ...rest] = items;

  return (
    <>
      <JsonLd data={[itemListSchema(title, path, items.map(it => ({ url: canonical(it.href), name: it.title })))]} />

      <section className="relative overflow-hidden border-b border-white/[0.07]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[360px]"
          style={{ background: 'radial-gradient(50% 100% at 50% 0%, rgba(108,99,201,0.16), rgba(108,99,201,0) 70%)' }}
        />
        {/* Left-aligned on the SAME container string as the card grid below
            (max-w-6xl px-6 sm:px-8), so the eyebrow/h1 left edge lands exactly
            on the first card's left edge. The old hero was max-w-3xl over a
            max-w-6xl grid — invisible while it was centred, an obvious step the
            moment it is not. Matches ContentArticle and BlogIndex, so every
            public surface now shares one left edge. */}
        <div className="relative mx-auto max-w-6xl px-6 pb-12 pt-14 sm:px-8">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[#8b88cf]">
            <Icon className="h-5 w-5" />
          </div>
          <SectionEyebrow label={eyebrow} />
          <h1 className="mt-5 max-w-[40rem] text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] text-white sm:text-[40px]">
            {title}
          </h1>
          <p className="mt-5 max-w-[40rem] text-[15px] leading-relaxed text-zinc-400">{intro}</p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-14 sm:px-8">
        {body && <div className="mx-auto mb-12 max-w-3xl">{body}</div>}

        {/* Featured card — the first (highest-priority) entry, full width. */}
        {featured && (
          <a
            href={featured.href}
            className="group relative mb-4 flex flex-col gap-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-[#6C63C9]/50 hover:bg-white/[0.05] sm:flex-row sm:items-center sm:gap-6 sm:p-8"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#6C63C9]/10 blur-3xl transition-opacity group-hover:opacity-150"
            />
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#6C63C9]/30 bg-[#6C63C9]/15 text-[#c7c5ec]">
              <Icon className="h-6 w-6" />
            </div>
            <div className="relative min-w-0 flex-1">
              <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#8b88cf]">Start here</div>
              <div className="mt-1 text-lg font-semibold tracking-[-0.01em] text-white sm:text-xl">{featured.title}</div>
              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-zinc-400">{featured.desc}</p>
            </div>
            <ArrowUpRight className="relative hidden h-5 w-5 shrink-0 text-zinc-500 transition-colors group-hover:text-[#8b88cf] sm:block" />
          </a>
        )}

        {/* The rest, in a full-width responsive grid. */}
        {rest.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((it, i) => (
              <a
                key={i}
                href={it.href}
                className="group flex flex-col rounded-xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-[#6C63C9]/40 hover:bg-white/[0.05]"
              >
                <div className="flex items-start justify-between gap-3">
                  <Icon className="h-4 w-4 shrink-0 text-zinc-500 transition-colors group-hover:text-[#8b88cf]" />
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-zinc-600 transition-colors group-hover:text-[#8b88cf]" />
                </div>
                <div className="mt-3 text-[15px] font-semibold leading-snug text-white">{it.title}</div>
                <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">{it.desc}</p>
              </a>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
