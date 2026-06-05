import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Page routes that require a signed-in user. API routes are intentionally NOT
// listed here — they self-authorize via parseRequest()/checkAuth(), and several
// are public (tracker collect, config, heartbeat, share-token dashboards,
// webhooks). clerkMiddleware still RUNS on /api (see matcher) so that `auth()`
// resolves inside those handlers; it just doesn't force a redirect there.
const isProtectedPage = createRouteMatcher([
  '/dashboard(.*)',
  '/websites(.*)',
  '/account(.*)',
  '/teams(.*)',
  '/boards(.*)',
  '/links(.*)',
  '/pixels(.*)',
  '/inbox(.*)',
  '/console(.*)',
  '/settings(.*)',
  '/admin(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedPage(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static asset files; run on everything else.
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run on API routes so auth() is available inside route handlers.
    '/(api|trpc)(.*)',
  ],
};
