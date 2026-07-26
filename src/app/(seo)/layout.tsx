// Instrument Serif — the display face for MeshHero's word and the serif-italic
// accents in the blog headlines. Imported HERE, not in the root layout, so the
// ~18KB face ships only with the seven public SEO routes and never enters the
// signed-in app bundle. latin-400 only: the app is English-only and the word is
// always a single lowercase latin token, so latin-ext would be dead weight.
import '@fontsource/instrument-serif/latin-400.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SeoNav } from '@/components/seo/SeoNav';
import { SeoFooter } from '@/components/seo/SeoFooter';
import { siteUrl } from '@/lib/seo';

// Conclick tracks its own public SEO surface. Delivered as an INLINE loader
// (the same dangerouslySetInnerHTML pattern the root layout uses for its theme
// script), NOT a <script src> or next/script:
//   - A raw <script src> is hoisted/managed by React 19 and the instance that
//     runs has document.currentScript === null, which this tracker reads its
//     config from (if(!currentScript)return), so it silently no-ops.
//   - next/script beforeInteractive is honoured only in the ROOT layout, and
//     afterInteractive is client-injected (not in <head>).
// An inline script is rendered verbatim and parser-executed; it appends the
// tracker via createElement, and for that classic external script
// document.currentScript IS the appended element, so the config read works.
// The hostname guard keeps it to conclick.io, so app-host / preview / localhost
// renders of these same routes never send events.
const CONCLICK_APP = process.env.NEXT_PUBLIC_APP_URL || 'https://app.conclick.io';
const CONCLICK_WEBSITE_ID = '7e14a7ea-b156-4e91-a676-8e3c96a81291';
const TRACKER_LOADER = `(function(){if(location.hostname!=='conclick.io')return;var s=document.createElement('script');s.defer=true;s.src=${JSON.stringify(
  `${CONCLICK_APP}/script.js`,
)};s.setAttribute('data-website-id',${JSON.stringify(CONCLICK_WEBSITE_ID)});(document.head||document.documentElement).appendChild(s);})();`;

// The ONLY indexable surface. robots here overrides the app-wide noindex set in
// the root layout (Next replaces robots at the nearest segment). metadataBase
// resolves all relative canonical/OG urls to conclick.io.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
};

// The exact diagonal-hatch tile the conclick.io homepage uses in its side
// gutters (19.2px tile, #2e2e2e lines on black).
const HATCH =
  "url(\"data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20width%3D'19.2'%20height%3D'19.2'%20viewBox%3D'0%200%2019.2%2019.2'%3E%3Cg%20fill-rule%3D'evenodd'%3E%3Cg%20fill%3D'rgb(46%2C46%2C46)'%20fill-opacity%3D'1'%3E%3Cpath%20d%3D'M18.4%200h0.8L0%2019.2V18.4zM19.2%2018.4v0.8H18.4z'%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E\")";

export default function SeoLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* Conclick's own tracker — inline loader (see note above), public SEO pages only. */}
      <script dangerouslySetInnerHTML={{ __html: TRACKER_LOADER }} />
      {/* Fixed hatched gutters — exactly like the homepage. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{ backgroundColor: '#000', backgroundImage: HATCH }}
      />
      {/* Framed center column with vertical rules; opaque bg masks the hatch within. */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1280px] flex-col border-x border-white/[0.07] bg-[#050505]">
        <SeoNav />
        <main className="relative flex-1">{children}</main>
        <SeoFooter />
      </div>
    </div>
  );
}
