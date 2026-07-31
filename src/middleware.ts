import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

// ---------------------------------------------------------------------------
// Unified middleware: umami tracker/CORS rewrites + Better Auth page gating.
//
// This file is the single source of truth (the Docker build no longer swaps in
// docker/middleware.ts). The umami helpers below are all opt-in via env vars
// (tracker script renaming, custom collect endpoint, disable-login) and run
// BEFORE auth so tracker traffic is never gated by it. A fast session-cookie
// check then protects page routes; API routes self-authorize via checkAuth.
// ---------------------------------------------------------------------------

const TRACKER_PATH = '/script.js';
const COLLECT_PATH = '/api/send';
const LOGIN_PATH = '/login';

const apiHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, DELETE, POST, PUT',
  'Access-Control-Max-Age': process.env.CORS_MAX_AGE || '86400',
  'Cache-Control': 'no-cache',
};

const trackerHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=86400, must-revalidate',
};

function customCollectEndpoint(request: NextRequest) {
  const collectEndpoint = process.env.COLLECT_API_ENDPOINT;
  if (collectEndpoint) {
    const url = request.nextUrl.clone();
    if (url.pathname.endsWith(collectEndpoint)) {
      url.pathname = COLLECT_PATH;
      return NextResponse.rewrite(url, { headers: apiHeaders });
    }
  }
}

function customScriptName(request: NextRequest) {
  const scriptName = process.env.TRACKER_SCRIPT_NAME;
  if (scriptName) {
    const url = request.nextUrl.clone();
    const names = scriptName.split(',').map(name => name.trim().replace(/^\/+/, ''));
    if (names.find(name => url.pathname.endsWith(name))) {
      url.pathname = TRACKER_PATH;
      return NextResponse.rewrite(url, { headers: trackerHeaders });
    }
  }
}

function customScriptUrl(request: NextRequest) {
  const scriptUrl = process.env.TRACKER_SCRIPT_URL;
  if (scriptUrl && request.nextUrl.pathname.endsWith(TRACKER_PATH)) {
    return NextResponse.rewrite(scriptUrl, { headers: trackerHeaders });
  }
}

function disableLogin(request: NextRequest) {
  const loginDisabled = process.env.DISABLE_LOGIN;
  if (loginDisabled && request.nextUrl.pathname.endsWith(LOGIN_PATH)) {
    return new NextResponse('Access denied', { status: 403 });
  }
}

const umamiRewrites = [customCollectEndpoint, customScriptName, customScriptUrl, disableLogin];

// Page routes that require a signed-in user. API routes self-authorize.
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/websites',
  '/account',
  '/teams',
  '/boards',
  '/links',
  '/pixels',
  '/inbox',
  '/console',
  '/settings',
  '/admin',
];

export default function middleware(req: NextRequest) {
  // 1. umami tracker/CORS rewrites (opt-in via env). Return early if matched
  //    so tracker traffic is never subjected to auth.
  for (const fn of umamiRewrites) {
    const res = fn(req);
    if (res) {
      return res;
    }
  }

  // 2. Protect app page routes: a fast cookie-presence check (no DB) — the
  //    session itself is verified server-side by every API route via
  //    parseRequest/checkAuth, so a forged cookie only reaches an empty shell.
  const { pathname } = req.nextUrl;
  if (PROTECTED_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    if (!getSessionCookie(req)) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.search = pathname === '/dashboard' ? '' : `?next=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and static asset files; run on everything else.
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run on API routes so auth() is available inside route handlers.
    '/(api|trpc)(.*)',
  ],
};
