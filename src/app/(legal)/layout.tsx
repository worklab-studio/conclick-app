import Link from 'next/link';
import { LogoFull } from '@/components/logo';

// Public, unauthenticated shell for /privacy, /terms, /support.
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#09090b] text-foreground">
      <header className="border-b border-[hsl(0,0%,12%)]">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-5">
          <a href="https://conclick.io" className="flex items-center" aria-label="Conclick">
            <LogoFull className="h-6 w-auto" />
          </a>
          <nav className="flex gap-5 text-sm text-muted-foreground">
            <Link href="/privacy" className="transition-colors hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-foreground">
              Terms
            </Link>
            <Link href="/support" className="transition-colors hover:text-foreground">
              Support
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">{children}</main>

      <footer className="border-t border-[hsl(0,0%,12%)]">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-xs text-muted-foreground/60">
          <span>© 2026 Conclick</span>
          <a href="https://app.conclick.io" className="transition-colors hover:text-foreground">
            app.conclick.io
          </a>
        </div>
      </footer>
    </div>
  );
}
