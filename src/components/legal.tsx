import type { ReactNode } from 'react';

// Shared typography for the public legal/support pages (server components).

export const LegalH1 = ({ children }: { children: ReactNode }) => (
  <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">{children}</h1>
);

export const LegalMeta = ({ children }: { children: ReactNode }) => (
  <p className="mb-10 text-xs text-muted-foreground/60">{children}</p>
);

export const LegalH2 = ({ children }: { children: ReactNode }) => (
  <h2 className="mb-3 mt-9 text-base font-semibold text-foreground">{children}</h2>
);

export const LegalP = ({ children }: { children: ReactNode }) => (
  <p className="mb-4 text-[13.5px] leading-relaxed text-muted-foreground">{children}</p>
);

export const LegalUL = ({ children }: { children: ReactNode }) => (
  <ul className="mb-4 ml-5 list-disc space-y-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
    {children}
  </ul>
);

export const LegalA = ({ href, children }: { href: string; children: ReactNode }) => (
  <a
    href={href}
    className="text-[#b7b4e4] underline underline-offset-2 transition-colors hover:text-foreground"
    target="_blank"
    rel="noopener noreferrer"
  >
    {children}
  </a>
);
