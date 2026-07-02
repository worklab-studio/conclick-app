import { relatedFor } from '@/lib/related';
import type { ContentEntry } from '@/content/schema';

export function RelatedLinks({ entry }: { entry: ContentEntry }) {
  const links = relatedFor(entry);
  if (!links.length) return null;
  return (
    <section className="mt-12 border-t border-[hsl(0,0%,12%)] pt-8">
      {/* div, not a heading — template chrome shouldn't pollute the content outline */}
      <div className="mb-4 text-base font-semibold text-foreground">Keep reading</div>
      <div className="grid gap-3 sm:grid-cols-2">
        {links.map((l, i) => (
          <a
            key={i}
            href={l.href}
            className="rounded-xl border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,8%)] px-4 py-3 text-sm text-zinc-300 transition-colors hover:border-[#5e5ba4]/40 hover:text-foreground"
          >
            {l.label}
          </a>
        ))}
      </div>
    </section>
  );
}
