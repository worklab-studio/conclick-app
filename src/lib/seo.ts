// The PUBLIC marketing/canonical host for the SEO pages. These pages are served
// under conclick.io (via a Framer Multi-Site rewrite) even though the origin is
// app.conclick.io, so every canonical, OG url, sitemap entry and internal link
// must use this — never NEXT_PUBLIC_APP_URL (the app host). NEXT_PUBLIC_* is
// inlined at build time, so this must be present as a Fly build arg.
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://conclick.io').replace(/\/$/, '');
}

// Absolute conclick.io URL for a path (leading slash optional).
export function canonical(path = ''): string {
  return `${siteUrl()}/${path.replace(/^\//, '')}`.replace(/\/$/, '') || siteUrl();
}

// Absolute URL to the LEGACY dark OG card (src/app/og/route.tsx, ?title= branch).
// Still the right call for the hub pages, which have no ContentEntry and so no
// mesh key and no hero word. Entry pages should use ogMeshUrl instead.
export function ogImageUrl(title: string, eyebrow = 'Conclick'): string {
  const q = new URLSearchParams({ title: title.slice(0, 120), eyebrow: eyebrow.slice(0, 32) });
  return `${siteUrl()}/og?${q.toString()}`;
}

// Absolute URL to the MESH OG card — the same art as the page's <MeshHero>, with
// the same serif word on it, so the social preview and the page hero match.
//
// `key` must be meshKeyFor(entry) ("comparison/fathom"), NOT entry.slug: slugs
// are unique only within a content type, and seeding on the bare slug hands
// /vs/fathom and /alternatives/fathom byte-identical art. `word` must be
// heroWordFor(entry), trailing period included.
export function ogMeshUrl(key: string, word: string): string {
  const q = new URLSearchParams({ slug: key.slice(0, 64), word: word.slice(0, 24) });
  return `${siteUrl()}/og?${q.toString()}`;
}
