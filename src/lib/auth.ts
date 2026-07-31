import debug from 'debug';
import { ROLE_PERMISSIONS, SHARE_TOKEN_HEADER } from '@/lib/constants';
import { secret } from '@/lib/crypto';
import { parseToken } from '@/lib/jwt';
import { ensureArray } from '@/lib/utils';
import { auth as betterAuth } from '@/lib/better-auth';
import { getLocalUserByAuthId } from '@/lib/auth-bridge';
import { isApiKey, getUserByApiKey } from '@/lib/apikey';

const log = debug('umami:auth');

export function getBearerToken(request: Request) {
  const auth = request.headers.get('authorization');

  return auth?.split(' ')[1];
}

/**
 * Resolve the caller's identity for an API request.
 *
 * Authentication is handled by Better Auth (session cookie, self-hosted in
 * our Postgres). Share tokens remain a separate, header-based mechanism for
 * public/embedded dashboards.
 *
 * Returns the same shape the rest of the app expects: `{ user, shareToken }`.
 * Never logs credentials.
 */
export async function checkAuth(request: Request) {
  const shareToken = await parseShareToken(request);

  let user = null;

  // 1. API key (Authorization: Bearer ck_…) — programmatic / MCP / agent access.
  const bearer = getBearerToken(request);
  if (isApiKey(bearer)) {
    user = await getUserByApiKey(bearer as string);
  } else {
    // 2. Better Auth session cookie → auth_user → local app user.
    try {
      const session = await betterAuth.api.getSession({ headers: request.headers as any });
      if (session?.user?.id) {
        user = await getLocalUserByAuthId(session.user.id, session.user.email, session.user.name);
      }
    } catch {
      log('better-auth session unavailable for this request');
    }
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
 * Gate for /api/admin/* routes: requires an authenticated user whose local
 * role is admin (granted via ADMIN_EMAILS on first sign-in).
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
