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

// Absolute URL to the dynamic per-page OG image (src/app/og/route.tsx).
export function ogImageUrl(title: string, eyebrow = 'Conclick'): string {
  const q = new URLSearchParams({ title: title.slice(0, 120), eyebrow: eyebrow.slice(0, 32) });
  return `${siteUrl()}/og?${q.toString()}`;
}
