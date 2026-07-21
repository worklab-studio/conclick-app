import { ExternalLink } from 'lucide-react';
import type { Source } from '@/content/schema';

// The enumerated citation list at the foot of an article.
//
// This is the highest-leverage block on the page for GEO. Retrieval-augmented
// answer engines weight "does this page show its work" heavily when deciding
// whether a source is safe to quote, and an explicit, numbered, outbound list is
// the clearest possible version of that signal. It pairs with `citation` in the
// Article JSON-LD (src/lib/jsonld.ts) — the machine-readable half of the same
// claim. Rendering one without the other only does half the job.
//
// Links are deliberately NOT rel="nofollow": these are real editorial citations
// to primary sources, and stripping the endorsement defeats the point.

/** Bare hostname for the muted suffix — "eur-lex.europa.eu", not the full URL. */
function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    // A malformed URL must not take the page down at prerender.
    return '';
  }
}

export function Sources({ sources }: { sources?: Source[] }) {
  if (!sources?.length) return null;

  return (
    <section
      aria-labelledby="sources-heading"
      className="mt-12 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"
    >
      <h2
        id="sources-heading"
        className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500"
      >
        Sources
      </h2>
      <ol className="mt-4 space-y-3">
        {sources.map((s, i) => {
          const host = hostOf(s.url);
          return (
            <li key={`${s.url}-${i}`} className="flex gap-3 text-[13px] leading-relaxed">
              <span
                aria-hidden
                className="w-5 shrink-0 text-right font-medium tabular-nums text-[#8b88cf]"
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="min-w-0">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-300 underline decoration-white/20 underline-offset-4 transition-colors hover:text-white hover:decoration-[#8b88cf]"
                >
                  {s.label}
                </a>
                {host && (
                  <span className="ml-1.5 whitespace-nowrap text-zinc-600">
                    {host}
                    <ExternalLink aria-hidden className="ml-1 inline h-3 w-3 -translate-y-px" />
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default Sources;
