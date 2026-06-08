// Public share top nav — Conclick branded, with a sign-up CTA. No theme/language
// controls (the share is dark, read-only). Inner content is constrained to the
// same 1320px column as the dashboard so the logo lines up with the content.
export function Header() {
  return (
    <header className="border-b border-[hsl(0,0%,12%)]">
      <div className="mx-auto flex w-full max-w-[1320px] items-center justify-between px-3 py-3.5 md:px-6">
        <a
          href="https://app.conclick.io"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2.5"
        >
          <img src="/images/conclick-logo-dark.png" alt="Conclick" width={26} height={26} />
          <span className="text-base font-bold text-foreground">Conclick</span>
        </a>
        <a
          href="https://app.conclick.io/register"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center rounded-lg bg-[#5e5ba4] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Sign up free
        </a>
      </div>
    </header>
  );
}
