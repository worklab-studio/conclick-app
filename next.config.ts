import 'dotenv/config';
import pkg from './package.json' assert { type: 'json' };

const TRACKER_SCRIPT = '/script.js';

const basePath = process.env.BASE_PATH || '';
const cloudMode = process.env.CLOUD_MODE || '';
const cloudUrl = process.env.CLOUD_URL || '';
// De-fingerprint by default: serve the collect endpoint at a neutral path (with a
// rewrite back to /api/send, which stays for back-compat). Overridable via env.
const collectApiEndpoint = process.env.COLLECT_API_ENDPOINT || '/e';
const corsMaxAge = process.env.CORS_MAX_AGE || '';
const defaultLocale = process.env.DEFAULT_LOCALE || '';
const forceSSL = process.env.FORCE_SSL || '';
const frameAncestors = process.env.ALLOWED_FRAME_URLS || '';
const trackerScriptName = process.env.TRACKER_SCRIPT_NAME || '';
const trackerScriptURL = process.env.TRACKER_SCRIPT_URL || '';

// Clerk loads clerk-js + runs auth flows from its Frontend API domain
// (clerk.fluxdesignlab.io in prod, *.clerk.accounts.dev in dev) and uses
// Cloudflare Turnstile for bot protection. These must be allowed in the CSP
// or the browser blocks clerk-js ("failed_to_load_clerk_js").
const clerkDomains =
  'https://clerk.conclick.io https://clerk.fluxdesignlab.io https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com';

const contentSecurityPolicy = `
  default-src 'self';
  img-src 'self' https: data: blob:;
  script-src 'self' 'unsafe-eval' 'unsafe-inline' ${clerkDomains};
  style-src 'self' 'unsafe-inline';
  connect-src 'self' https:;
  worker-src 'self' blob:;
  child-src 'self' blob:;
  frame-src 'self' https://challenges.cloudflare.com https://clerk.fluxdesignlab.io https://*.clerk.accounts.dev;
  frame-ancestors 'self' ${frameAncestors};
`;

const defaultHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Content-Security-Policy',
    value: contentSecurityPolicy.replace(/\s{2,}/g, ' ').trim(),
  },
];

if (forceSSL) {
  defaultHeaders.push({
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  });
}

const trackerHeaders = [
  {
    key: 'Access-Control-Allow-Origin',
    value: '*',
  },
  {
    key: 'Cache-Control',
    value: 'public, max-age=86400, must-revalidate',
  },
];

const apiHeaders = [
  {
    key: 'Access-Control-Allow-Origin',
    value: '*',
  },
  {
    key: 'Access-Control-Allow-Headers',
    value: '*',
  },
  {
    key: 'Access-Control-Allow-Methods',
    value: 'GET, DELETE, POST, PUT',
  },
  {
    key: 'Access-Control-Max-Age',
    value: corsMaxAge || '86400',
  },
  {
    key: 'Cache-Control',
    value: 'no-cache',
  },
];

const headers = [
  {
    source: '/api/:path*',
    headers: apiHeaders,
  },
  {
    source: '/:path*',
    headers: defaultHeaders,
  },
  {
    source: TRACKER_SCRIPT,
    headers: trackerHeaders,
  },
];

const rewrites = [];

if (trackerScriptURL) {
  rewrites.push({
    source: TRACKER_SCRIPT,
    destination: trackerScriptURL,
  });
}

if (collectApiEndpoint) {
  headers.push({
    source: collectApiEndpoint,
    headers: apiHeaders,
  });

  rewrites.push({
    source: collectApiEndpoint,
    destination: '/api/send',
  });
}

const redirects = [
  {
    source: '/admin',
    destination: '/admin/users',
    permanent: false,
  },
];

// Adding rewrites + headers for all alternative tracker script names.
if (trackerScriptName) {
  const names = trackerScriptName?.split(',').map(name => name.trim());

  if (names) {
    names.forEach(name => {
      const normalizedSource = `/${name.replace(/^\/+/, '')}`;

      rewrites.push({
        source: normalizedSource,
        destination: TRACKER_SCRIPT,
      });

      headers.push({
        source: normalizedSource,
        headers: trackerHeaders,
      });
    });
  }
}

if (cloudMode) {
  rewrites.push({
    source: '/script.js',
    destination: 'https://cloud.umami.is/script.js',
  });
}

/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: false,
  env: {
    basePath,
    cloudMode,
    cloudUrl,
    currentVersion: pkg.version,
    defaultLocale,
  },
  basePath,
  output: 'standalone',

  // The OG route reads its Instrument Serif .woff off disk at request time.
  // `output: 'standalone'` copies only what nft traces, and a font that fails to
  // ship does NOT error — next/og quietly falls back to its bundled sans and
  // every social card goes out in the wrong typeface. Name it explicitly.
  outputFileTracingIncludes: {
    '/og': ['./src/app/og/*.woff'],
  },

  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return headers;
  },
  async rewrites() {
    return [
      ...rewrites,
      {
        source: '/telemetry.js',
        destination: '/api/scripts/telemetry',
      },
      {
        source: '/teams/:teamId/:path+',
        destination: '/:path*',
      },
    ];
  },
  async redirects() {
    return [...redirects];
  },
};
