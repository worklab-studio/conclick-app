import { allEntries, pathFor } from '@/content';
import { relatedFor } from '@/lib/related';
import type { ContentEntry } from '@/content/schema';
import { heroWordFor, meshKeyFor } from '@/lib/mesh/word';
import { readingTime } from '@/lib/readingTime';
import { MeshHero } from './MeshHero';

// "Read next" — cards with mesh-art thumbs, not flat text rows.
//
// The dead-link guarantee still comes entirely from relatedFor(), which only
// ever returns pages that exist in the registry. This component layers card
// chrome on top of that list; it does not do its own link discovery, so it
// cannot reintroduce a 404.

const TYPE_LABEL: Record<ContentEntry['type'], string> = {
  comparison: 'Comparison',
  alternative: 'Alternative',
  tool: 'Free tool',
  glossary: 'Definition',
  useCase: 'Use case',
  guide: 'Guide',
  blog: 'Blog',
};

export function RelatedLinks({ entry }: { entry: ContentEntry }) {
  // Six, in two rows of three — NOT three.
  //
  // The card redesign originally cut this to 3 for looks, which quietly halved
  // the auto-generated internal links on all 44 pages. internal-links-min is
  // already the second-largest grandfathered violation bucket (42 of 44
  // entries), so shrinking the only mechanism that still emits links pushed the
  // wrong way on a metric the ratchet is actively tracking. The grid handles
  // two rows fine.
  const links = relatedFor(entry, 6);
  if (!links.length) return null;

  // relatedFor returns {href,label}; the card needs the whole entry (type for
  // the kicker, type+slug for the mesh key, sections for the read time). Both
  // sides build the href with pathFor, so this lookup is total — but a miss
  // degrades to a card without art rather than throwing at prerender.
  const byHref = new Map(allEntries().map(e => [`/${pathFor(e)}`, e]));

  return (
    <section className="mt-16 border-t border-white/10 pt-10">
      {/* div, not a heading, template chrome shouldn't pollute the content outline */}
      <div className="mb-5 text-base font-semibold text-white">Read next</div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map(l => {
          const e = byHref.get(l.href);
          return (
            <a
              key={l.href}
              href={l.href}
              className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition-colors hover:border-[#6C63C9]/40 hover:bg-white/[0.05]"
            >
              {e && (
                <MeshHero
                  slug={meshKeyFor(e)}
                  word={heroWordFor(e)}
                  className="rounded-none border-0 border-b border-white/10"
                />
              )}
              <div className="flex flex-1 flex-col p-4">
                {e && (
                  <div className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.1em] text-zinc-500">
                    <span className="text-[#8b88cf]">{e.category || TYPE_LABEL[e.type]}</span>
                    <span aria-hidden>·</span>
                    <span>{readingTime(e)} min read</span>
                  </div>
                )}
                <div className="text-sm font-medium leading-snug text-zinc-200 transition-colors group-hover:text-white">
                  {l.label}
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}

export default RelatedLinks;
