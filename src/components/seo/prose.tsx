/* eslint-disable @next/next/no-img-element */
import type { ContentEntry, Section } from '@/content/schema';
import { ComparisonTable } from './ComparisonTable';
import { LeadMagnetCTA } from './LeadMagnetCTA';
import { RichText } from './RichText';

// Renders the typed Section[] body into styled prose primitives so content
// authors / the AI pipeline never touch JSX. Tokens mirror src/components/legal.tsx.
function Block({ section, entry }: { section: Section; entry: ContentEntry }) {
  switch (section.type) {
    case 'h2':
      return (
        <h2 id={section.id} className="mb-3 mt-12 scroll-mt-24 text-2xl font-semibold tracking-[-0.01em] text-white">
          {section.text}
        </h2>
      );
    case 'h3':
      return (
        <h3 id={section.id} className="mb-2 mt-8 scroll-mt-24 text-lg font-semibold text-white">
          {section.text}
        </h3>
      );
    // Body copy runs through RichText so `[anchor](/path)` becomes a real link.
    // Headings deliberately do not: a link inside an h2 competes with the
    // heading's own anchor and muddies the outline these pages are read by.
    case 'p':
      return (
        <p className="mb-4 text-[15px] leading-relaxed text-muted-foreground">
          <RichText text={section.text} />
        </p>
      );
    case 'ul':
      return (
        <ul className="mb-5 ml-5 list-disc space-y-2 text-[15px] leading-relaxed text-muted-foreground marker:text-[#5e5ba4]">
          {section.items.map((it, i) => (
            <li key={i}>
              <RichText text={it} />
            </li>
          ))}
        </ul>
      );
    case 'ol':
      return (
        <ol className="mb-5 ml-5 list-decimal space-y-2 text-[15px] leading-relaxed text-muted-foreground marker:text-[#8b88cf]">
          {section.items.map((it, i) => (
            <li key={i}>
              <RichText text={it} />
            </li>
          ))}
        </ol>
      );
    case 'quote':
      return (
        <blockquote className="my-5 border-l-2 border-[#5e5ba4] pl-4 text-[15px] italic leading-relaxed text-muted-foreground">
          <RichText text={section.text} />
          {section.cite && <footer className="mt-1 text-xs not-italic text-muted-foreground/70">— {section.cite}</footer>}
        </blockquote>
      );
    case 'callout':
      return (
        <div className="my-6 rounded-xl border border-[#5e5ba4]/30 bg-[#5e5ba4]/10 p-4 text-[15px] leading-relaxed text-zinc-200">
          <RichText text={section.text} />
        </div>
      );
    case 'comparisonTable':
      return entry.comparison ? (
        <div className="my-6">
          <ComparisonTable data={entry.comparison} />
        </div>
      ) : null;
    case 'cta':
      return (
        <div className="my-8">
          <LeadMagnetCTA leadMagnet={entry.leadMagnet} />
        </div>
      );
    case 'image':
      return (
        <figure className="my-6">
          <img
            src={section.src}
            alt={section.alt}
            className="w-full rounded-xl border border-[hsl(0,0%,12%)]"
            loading="lazy"
          />
          {section.caption && (
            <figcaption className="mt-2 text-center text-xs text-muted-foreground">{section.caption}</figcaption>
          )}
        </figure>
      );
  }
}

export function Sections({
  entry,
  inject,
}: {
  entry: ContentEntry;
  inject?: { afterH2: number; node: React.ReactNode };
}) {
  let h2 = 0;
  const out: React.ReactNode[] = [];
  entry.sections.forEach((s, i) => {
    if (s.type === 'h2') {
      h2 += 1;
      if (inject && h2 === inject.afterH2 + 1) out.push(<div key="__inject">{inject.node}</div>);
    }
    out.push(<Block key={i} section={s} entry={entry} />);
  });
  return <div>{out}</div>;
}
