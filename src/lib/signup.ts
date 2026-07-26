// Shared "add my website" plumbing for the public SEO surface.
//
// This exists because the domain parser and the register URL were copy-pasted
// into HeroWebsiteInput and LeadMagnetCTA, and the two copies drifted from the
// rest of the app: both built their URL from NEXT_PUBLIC_SITE_URL
// (conclick.io), but the register page lives on the APP host. conclick.io
// /register is not in the Cloudflare Worker's path allowlist, so it fell
// through to the Framer apex and returned 404 — verified live on 2026-07-26.
//
// It stayed invisible because these two CTAs navigate with
// `window.location.href` at click time. The href-based CTAs (InlineCTA,
// BlogIndex) already used the APP host and were correct, so the HTML looked
// fine and only an actual click reproduced it. One module now owns this, so
// the bug cannot be half-fixed again.

const APP = process.env.NEXT_PUBLIC_APP_URL || 'https://app.conclick.io';

/**
 * The domain a visitor meant, or null.
 *
 * Accepts what people actually paste: full URLs, a www prefix, a path, query
 * or hash. Returns bare lowercase host, e.g. "https://www.Foo.com/pricing?x=1"
 * -> "foo.com". Null when it does not look like a hostname, which callers use
 * to decide between a personalised and a plain signup link.
 */
export function cleanDomain(raw: string): string | null {
  let v = (raw || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');
  v = v.split('/')[0].split('?')[0].split('#')[0];
  return /^([a-z0-9-]+\.)+[a-z]{2,}$/.test(v) ? v : null;
}

/**
 * Where the "Add My Website" button goes. The register page personalises from
 * `?site=`, so a recognised domain is passed through and anything else falls
 * back to a plain signup rather than sending a junk param.
 */
export function registerUrl(rawOrDomain: string): string {
  const d = cleanDomain(rawOrDomain);
  return d ? `${APP}/register?site=${encodeURIComponent(d)}` : `${APP}/register`;
}

/**
 * Favicon for the domain preview.
 *
 * DuckDuckGo, deliberately NOT Google's s2/favicons service that the Framer
 * homepage component uses. This site argues, at length and on ~68 pages, that
 * you should not have to hand Google your visitors' data. Pinging
 * google.com on every domain a prospect types — on a page titled "Why I gave
 * up on GA4" — is the kind of detail that costs more credibility than the
 * icon earns. DDG's endpoint is a drop-in equivalent and returns a neutral
 * globe for unknown domains.
 *
 * To match the Framer component exactly instead, swap the host for
 * `https://www.google.com/s2/favicons?domain=${d}&sz=64`.
 */
export function faviconUrl(domain: string): string {
  return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
}
