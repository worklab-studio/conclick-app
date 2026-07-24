import Link from 'next/link';
import { allEntries, pathFor } from '@/content';

/**
 * Renders `[anchor text](/path)` inside a plain content string as a real link.
 *
 * Why this exists: `Section` is `{ type: 'p'; text: string }` and prose.tsx
 * rendered `{section.text}` directly, so there was no anchor path at all. Every
 * internal link on the site was template chrome from the `internalLinks` field
 * — the class search engines discount most — and contextual linking was not
 * merely unused but structurally impossible.
 *
 * UNKNOWN PATHS DEGRADE TO PLAIN TEXT. A typo'd or renamed slug renders as the
 * anchor words with no link rather than shipping a 404. That matters because
 * the routines write these unattended: a broken internal link would otherwise
 * reach production and sit there until someone crawled the site.
 *
 * Only site-relative paths starting with `/` are matched, so no external link
 * can be introduced this way and there is no protocol to sanitize.
 */

// Deliberately strict: no nested brackets, no newlines, and the href must be a
// single leading slash followed by a non-slash. The `(?!\/)` rejects the
// protocol-relative `//evil.com` form outright. The validPaths lookup would
// reject it anyway, but a regex that cannot express an off-site destination in
// the first place does not depend on that second line of defence holding.
const LINK_RE = /\[([^\]\n]+)\]\((\/(?!\/)[A-Za-z0-9\-._~/]*)\)/g;

// Hub and static routes that are not ContentEntries. Kept here rather than
// inferred, because a missing hub silently downgrades a good link to plain text.
const STATIC_PATHS = [
  '/',
  '/pricing',
  '/about',
  '/contact',
  '/blogs',
  '/guides',
  '/glossary',
  '/compare',
  '/alternatives',
  '/for',
  '/tools',
  '/privacy',
  '/terms',
];

let cache: Set<string> | null = null;

/** Every path an in-prose link may point at. Built once per process. */
function validPaths(): Set<string> {
  if (cache) return cache;
  const set = new Set<string>(STATIC_PATHS);
  for (const e of allEntries()) {
    // pathFor returns a path WITHOUT a leading slash ("vs/plausible").
    const p = pathFor(e);
    set.add(p.startsWith('/') ? p : `/${p}`);
  }
  cache = set;
  return set;
}

/**
 * Split a string into text and link nodes. Exported for testing; prefer the
 * RichText component.
 */
export function parseRichText(text: string, paths: Set<string> = validPaths()) {
  const nodes: Array<string | { label: string; href: string }> = [];
  let last = 0;

  for (const m of text.matchAll(LINK_RE)) {
    const [full, label, href] = m;
    const start = m.index ?? 0;
    if (start > last) nodes.push(text.slice(last, start));
    // Trailing slashes are a common authoring slip and would otherwise miss.
    const clean = href.length > 1 ? href.replace(/\/$/, '') : href;
    nodes.push(paths.has(clean) ? { label, href: clean } : label);
    last = start + full.length;
  }

  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function RichText({ text }: { text: string }) {
  // Fast path: the overwhelming majority of sections contain no link at all,
  // and this keeps them a bare string rather than a wrapped fragment.
  if (!text.includes('](/')) return <>{text}</>;

  const nodes = parseRichText(text);
  return (
    <>
      {nodes.map((n, i) =>
        typeof n === 'string' ? (
          n
        ) : (
          <Link
            key={i}
            href={n.href}
            className="text-[#a5a1e8] underline decoration-[#5e5ba4]/50 underline-offset-2 transition-colors hover:text-white hover:decoration-white/60"
          >
            {n.label}
          </Link>
        ),
      )}
    </>
  );
}
