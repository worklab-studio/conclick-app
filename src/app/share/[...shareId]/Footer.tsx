import { ShieldCheck, Zap, CreditCard, Filter, ArrowRight } from 'lucide-react';
import { Logo } from '@/components/logo';

// Public share footer — a sales pitch + sign-up CTA, seen by people who don't
// yet have Conclick. Dark, read-only.
const FEATURES = [
  { icon: ShieldCheck, label: 'No cookies' },
  { icon: Zap, label: 'Real-time' },
  { icon: CreditCard, label: 'Revenue' },
  { icon: Filter, label: 'Funnels' },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-10 border-t border-[hsl(0,0%,12%)]">
      <div className="mx-auto w-full max-w-[1320px] px-3 md:px-6">
        {/* CTA band */}
        <div className="py-14">
          <div className="relative mx-auto max-w-2xl overflow-hidden rounded-2xl border border-[hsl(0,0%,14%)] bg-gradient-to-b from-[hsl(0,0%,10%)] to-[hsl(0,0%,6.5%)] px-6 py-12 text-center md:px-10">
            {/* soft violet glow */}
            <div className="pointer-events-none absolute -top-28 left-1/2 h-56 w-[520px] -translate-x-1/2 rounded-full bg-[#5e5ba4]/20 blur-3xl" />
            <div className="relative flex flex-col items-center gap-5">
              <Logo className="h-11 w-auto" />
              <div className="space-y-2.5">
                <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-[28px]">
                  Analytics your visitors can trust
                </h2>
                <p className="mx-auto max-w-md text-[15px] leading-relaxed text-muted-foreground">
                  Privacy-first web analytics, no cookies, no creepy tracking. Real-time visitors,
                  revenue, funnels, and full user journeys in one beautiful dashboard.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pt-1">
                {FEATURES.map(({ icon: Icon, label }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
                  >
                    <Icon className="h-3.5 w-3.5 text-[#8b88cf]" />
                    {label}
                  </span>
                ))}
              </div>
              <a
                href="https://app.conclick.io/register"
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#5e5ba4] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#5e5ba4]/20 transition-all hover:bg-[#6b68b5] hover:shadow-[#5e5ba4]/30"
              >
                Start free <ArrowRight className="h-4 w-4" />
              </a>
              <p className="text-xs text-muted-foreground/60">
                14-day free trial · No credit card required
              </p>
            </div>
          </div>
        </div>

        {/* bottom bar */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-[hsl(0,0%,10%)] py-6 text-xs text-muted-foreground/70 sm:flex-row">
          <div className="flex items-center gap-2">
            <Logo className="h-4 w-auto opacity-80" />
            <span>© {year} Conclick</span>
          </div>
          <div className="flex items-center gap-5">
            <a
              href="https://app.conclick.io"
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-foreground"
            >
              conclick.io
            </a>
            <a
              href="https://app.conclick.io/register"
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-foreground"
            >
              Get started
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
