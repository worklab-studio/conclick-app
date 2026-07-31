import prisma from '@/lib/prisma';
import { ROLES } from '@/lib/constants';
import { uuid } from '@/lib/crypto';
import { getRandomChars } from '@/lib/generate';
import { ensureTrialStarted, newTrialFields } from '@/lib/billing';
import { sendWelcomeEmail } from '@/lib/email';

/**
 * Bridge between Better Auth identities (auth_user) and the app's own `user`
 * table (roles, websites, billing). Mirrors the old Clerk getOrCreateLocalUser
 * flow, keyed by user.auth_id instead of clerk_id.
 */

export interface LocalUser {
  id: string;
  username: string;
  role: string;
  isAdmin: boolean;
  email?: string | null;
  [key: string]: any;
}

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
}

function decorate(user: any): LocalUser {
  return { ...user, isAdmin: user.role === ROLES.admin };
}

// Short-lived cache: one page load fires many authed API calls; collapse the
// per-page burst into one DB lookup while keeping role changes fresh.
const USER_CACHE_TTL = 30_000;
const userCache = new Map<string, { user: LocalUser; expires: number }>();

export function clearCachedAuthUser(authId: string) {
  userCache.delete(authId);
}

async function uniqueUsername(base: string): Promise<string> {
  let candidate = (base || 'user').toLowerCase().replace(/[^a-z0-9._-]/g, '') || 'user';
  const root = candidate;
  for (let i = 0; i < 50; i++) {
    const taken = await prisma.client.user.findUnique({ where: { username: candidate } });
    if (!taken) return candidate;
    candidate = `${root}-${getRandomChars(4).toLowerCase()}`;
  }
  return `${root}-${uuid().slice(0, 8)}`;
}

/**
 * Called from the Better Auth user-create hook. Existing app users (matched
 * by email, case-insensitive) get LINKED — preserving role, websites, and
 * billing/lifetime status for everyone migrated from Clerk. Fresh signups get
 * a new app user with a trial started and (if listed in ADMIN_EMAILS) admin.
 */
export async function linkOrProvisionLocalUser(authId: string, email: string, name?: string) {
  const normalized = email.toLowerCase();

  const existing = await prisma.client.user.findFirst({
    where: { deletedAt: null, email: { equals: normalized, mode: 'insensitive' } },
  });

  if (existing) {
    await prisma.client.user.update({
      where: { id: existing.id },
      data: {
        authId,
        displayName: existing.displayName || name || undefined,
        ...(adminEmails().includes(normalized) ? { role: ROLES.admin } : {}),
      },
    });
    return;
  }

  const username = await uniqueUsername(normalized.split('@')[0]);
  await prisma.client.user.create({
    data: {
      id: uuid(),
      authId,
      username,
      email: normalized,
      displayName: name || undefined,
      role: adminEmails().includes(normalized) ? ROLES.admin : ROLES.user,
      ...newTrialFields(),
    },
  });

  try {
    await sendWelcomeEmail(normalized, name || username);
  } catch {
    /* email must never block signup */
  }
}

/** Resolve the app user for a Better Auth identity (used by checkAuth). */
export async function getLocalUserByAuthId(
  authId: string,
  email?: string | null,
  name?: string | null,
): Promise<LocalUser | null> {
  const hit = userCache.get(authId);
  if (hit && hit.expires > Date.now()) return hit.user;
  userCache.delete(authId);

  let user = await prisma.client.user.findUnique({ where: { authId } });

  // Self-heal: the create-hook can race or a pre-hook user may predate it.
  if (!user && email) {
    await linkOrProvisionLocalUser(authId, email, name || undefined);
    user = await prisma.client.user.findUnique({ where: { authId } });
  }

  if (!user || user.deletedAt) return null;

  try {
    await ensureTrialStarted(user);
  } catch {
    /* trial bookkeeping must never block auth */
  }

  const decorated = decorate(user);
  userCache.set(authId, { user: decorated, expires: Date.now() + USER_CACHE_TTL });
  return decorated;
}
