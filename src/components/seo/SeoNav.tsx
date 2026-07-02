import { Logo } from '@/components/logo';
import { ResourcesMenu } from './ResourcesMenu';

const APP = process.env.NEXT_PUBLIC_APP_URL || 'https://app.conclick.io';
const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://conclick.io';

// Mirrors the conclick.io homepage nav: logo left, links center, Login pill right.
// Spans the full framed column (no inner max-width — the layout frame sets width).
const NAV = [
  { label: 'Home', href: `${SITE}/` },
  { label: 'Features', href: `${SITE}/#features` },
  { label: 'Pricing', href: `${SITE}/pricing` },
  { label: 'Reviews', href: `${SITE}/#reviews` },
  { label: 'About', href: `${SITE}/about` },
  { label: 'Contact', href: `${SITE}/contact` },
];

export function SeoNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#050505]/85 backdrop-blur-md">
      <div className="flex w-full items-center justify-between px-8 py-4">
        <a href={`${SITE}/`} className="flex items-center gap-2" aria-label="Conclick home">
          <Logo className="h-6 w-auto text-white" />
          <span className="text-[17px] font-semibold tracking-tight text-white">Conclick</span>
        </a>
        <nav className="hidden items-center gap-8 lg:flex">
          {NAV.map(n => (
            <a key={n.label} href={n.href} className="text-[15px] text-zinc-300 transition-colors hover:text-white">
              {n.label}
            </a>
          ))}
          <ResourcesMenu />
        </nav>
        {/* White pill, dark text — matches the Framer homepage Login button */}
        <a
          href={`${APP}/login`}
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200"
        >
          Login
        </a>
      </div>
    </header>
  );
}
