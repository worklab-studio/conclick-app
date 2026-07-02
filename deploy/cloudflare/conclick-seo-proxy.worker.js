// Cloudflare Worker — serve Conclick's SEO engine under conclick.io
// ---------------------------------------------------------------------------
// Visitors and Google only ever see conclick.io URLs. SEO paths are reverse-
// proxied to the Next.js app on Fly; every other path falls through to Framer.
//
// Setup (one-time, in the Cloudflare dashboard for the conclick.io zone):
//   1. SSL/TLS → Overview → set mode to "Full" (NOT Flexible — Flexible loops).
//   2. DNS → set conclick.io (and www) records to Proxied (orange cloud).
//   3. Workers & Pages → create this Worker → Settings → Triggers → add Routes:
//        conclick.io/vs/*            conclick.io/alternatives/*
//        conclick.io/tools/*         conclick.io/glossary/*
//        conclick.io/guides/*        conclick.io/for/*
//        conclick.io/blog/*          conclick.io/sitemap.xml
//        conclick.io/robots.txt
//      (The Worker only fires on these paths, so the Framer homepage, pricing,
//       etc. are untouched — they pass straight through to Framer.)
// ---------------------------------------------------------------------------

const APP_ORIGIN = 'https://app.conclick.io';

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Serve a permissive robots.txt for the public domain. The app origin keeps
    // its own `Disallow: /` so the app host is never indexed as a duplicate.
    if (url.pathname === '/robots.txt') {
      return new Response(
        'User-agent: *\nAllow: /\nSitemap: https://conclick.io/sitemap.xml\n',
        {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
            'cache-control': 'public, max-age=3600',
          },
        },
      );
    }

    // Reverse-proxy the SEO path to the Next.js app. The browser URL stays on
    // conclick.io (true rewrite, not a redirect), and the app's HTML already
    // emits conclick.io canonicals + sitemap URLs, so everything is consistent.
    const target = new URL(url.pathname + url.search, APP_ORIGIN);
    const proxied = new Request(target, request);
    proxied.headers.set('X-Forwarded-Host', url.host);
    return fetch(proxied);
  },
};
