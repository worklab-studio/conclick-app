import { founderAuthor } from '@/content/author';

// Founder byline → E-E-A-T + matches the Article.author JSON-LD. Uses an initials
// avatar (no external image dependency); drop a real photo at founderAuthor.photo
// and swap to <img> when ready.
export function AuthorByline({
  datePublished,
  dateModified,
}: {
  datePublished: string;
  dateModified?: string;
}) {
  const d = new Date(dateModified || datePublished);
  const date = isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#5e5ba4]/20 text-sm font-semibold text-[#c7c5ec]">
        {founderAuthor.name.charAt(0)}
      </div>
      <div className="text-sm">
        <a href={founderAuthor.url} className="font-medium text-foreground hover:underline">
          {founderAuthor.name}
        </a>
        <span className="text-muted-foreground"> · {founderAuthor.role}</span>
        {date && <div className="text-xs text-muted-foreground/70">Updated {date}</div>}
      </div>
    </div>
  );
}
