// Public share footer — a short sales pitch + sign-up CTA (this page is seen by
// people who don't yet have Conclick).
export function Footer() {
  return (
    <footer className="mt-6 border-t border-[hsl(0,0%,12%)]">
      <div className="mx-auto w-full max-w-[1320px] px-3 py-14 md:px-6">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-4 text-center">
          <img src="/images/conclick-logo-dark.png" alt="Conclick" width={44} height={44} />
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Analytics your visitors can trust
          </h2>
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            This dashboard runs on{' '}
            <strong className="font-semibold text-foreground">Conclick</strong> — privacy-first web
            analytics with no cookies and no creepy tracking. Real-time visitors, revenue, funnels,
            and full user journeys, all in one beautiful dashboard.
          </p>
          <a
            href="https://app.conclick.io/register"
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center rounded-lg bg-[#5e5ba4] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Start free →
          </a>
          <p className="text-xs text-muted-foreground/60">
            14-day free trial · No credit card required
          </p>
        </div>
      </div>
    </footer>
  );
}
