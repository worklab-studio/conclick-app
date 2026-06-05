import debug from 'debug';
import { auth as clerkAuth } from '@clerk/nextjs/server';
import { ROLE_PERMISSIONS, SHARE_TOKEN_HEADER } from '@/lib/constants';
import { secret } from '@/lib/crypto';
import { parseToken } from '@/lib/jwt';
import { ensureArray } from '@/lib/utils';
import { getOrCreateLocalUser } from '@/lib/clerk';

const log = debug('umami:auth');

export function getBearerToken(request: Request) {
  const auth = request.headers.get('authorization');

  return auth?.split(' ')[1];
}

/**
 * Resolve the caller's identity for an API request.
 *
 * Authentication is handled by Clerk (cookie/session, read via `auth()` which
 * relies on clerkMiddleware having run). Share tokens remain a separate,
 * header-based mechanism for public/embedded dashboards.
 *
 * Returns the same shape the rest of the app expects: `{ user, shareToken }`.
 * Never logs credentials.
 */
export async function checkAuth(request: Request) {
  const shareToken = await parseShareToken(request);

  let user = null;

  try {
    const { userId: clerkUserId } = await clerkAuth();

    if (clerkUserId) {
      user = await getOrCreateLocalUser(clerkUserId);
    }
  } catch (e) {
    // auth() throws if clerkMiddleware didn't run for this route (e.g. some
    // public/collect endpoints). Treat as unauthenticated and fall through.
    log('clerk auth() unavailable for this route');
  }

  if (!user?.id && !shareToken) {
    return null;
  }

  return {
    shareToken,
    user,
  };
}

export async function hasPermission(role: string, permission: string | string[]) {
  return ensureArray(permission).some(e => ROLE_PERMISSIONS[role]?.includes(e));
}

/**
 * Gate for /api/admin/* routes. Replaces the old forgeable
 * `conclick_admin_session` cookie: now requires a real Clerk-authenticated
 * user whose local role is admin (granted via ADMIN_EMAILS on first sign-in).
 */
export async function checkAdmin(request: Request): Promise<boolean> {
  const auth = await checkAuth(request);
  return !!auth?.user?.isAdmin;
}

export function parseShareToken(request: Request) {
  try {
    return parseToken(request.headers.get(SHARE_TOKEN_HEADER), secret());
  } catch (e) {
    log(e);
    return null;
  }
}
