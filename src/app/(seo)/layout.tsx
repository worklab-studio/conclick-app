import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SeoNav } from '@/components/seo/SeoNav';
import { SeoFooter } from '@/components/seo/SeoFooter';
import { siteUrl } from '@/lib/seo';

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
