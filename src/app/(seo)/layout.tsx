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

// Conclick tracks itself. This layout wraps ONLY the public SEO routes (/blogs,
// /vs, /guides, /glossary, /for, /tools, /alternatives), so the tracker lands on
// exactly those and never on the signed-in dashboard. The Framer homepage
// already loads this same snippet; the Next-served SEO pages did not, which is
// why conclick.io showed visitors but /blogs and the rest did not.
//
// The website id is the SAME one embedded on the homepage and is public by
// nature (it sits in that page's HTML). Kept byte-identical to the homepage
// snippet (no data-domains): the tracker reads its config from its own script
// element via document.currentScript, so it must be a browser-PARSED script,
// exactly like this one in the served HTML.
const CONCLICK_APP = process.env.NEXT_PUBLIC_APP_URL || 'https://app.conclick.io';
const CONCLICK_WEBSITE_ID = '7e14a7ea-b156-4e91-a676-8e3c96a81291';

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
      {/* Conclick's own tracker — public SEO pages only (see note above). Byte-
          identical to the homepage embed so it behaves identically. */}
      <script defer src={`${CONCLICK_APP}/script.js`} data-website-id={CONCLICK_WEBSITE_ID} />
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
