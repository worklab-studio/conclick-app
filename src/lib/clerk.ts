import { currentUser } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { ROLES } from '@/lib/constants';
import { uuid } from '@/lib/crypto';
import { getRandomChars } from '@/lib/generate';

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
 * Resolve a Clerk user id to the application's local user row.
 *
 * Strategy (non-destructive — preserves the internal uuid PK and all FKs):
 *  1. If a local user is already linked via `clerkId`, return it (fast path).
 *  2. Otherwise fetch the Clerk profile and link an EXISTING local user by email
 *     (this adopts legacy/Supabase-era accounts without rewriting their id).
 *  3. Otherwise create a fresh local user carrying the clerkId.
 *
 * Admin role is granted when the verified email is listed in ADMIN_EMAILS.
 */
export async function getOrCreateLocalUser(clerkUserId: string): Promise<LocalUser | null> {
  // 1. Fast path — already linked.
  const linked = await prisma.client.user.findUnique({ where: { clerkId: clerkUserId } });
  if (linked) {
    if (linked.deletedAt) return null;
    return decorate(linked);
  }

  // Need the Clerk profile to link or create.
  const clerk = await currentUser();
  if (!clerk || clerk.id !== clerkUserId) {
    return null;
  }

  const email =
    clerk.primaryEmailAddress?.emailAddress?.toLowerCase() ??
    clerk.emailAddresses?.[0]?.emailAddress?.toLowerCase() ??
    null;
  const isAdminEmail = email ? adminEmails().includes(email) : false;

  // 2. Adopt an existing unlinked local user with the same email.
  if (email) {
    const byEmail = await prisma.client.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, deletedAt: null, clerkId: null },
    });

    if (byEmail) {
      const updated = await prisma.client.user.update({
        where: { id: byEmail.id },
        data: {
          clerkId: clerkUserId,
          ...(isAdminEmail ? { role: ROLES.admin } : {}),
        },
      });
      return decorate(updated);
    }
  }

  // 3. Create a new local user.
  const base = clerk.username || (email ? email.split('@')[0] : '') || `user-${getRandomChars(6)}`;
  const username = await uniqueUsername(base);
  const displayName = [clerk.firstName, clerk.lastName].filter(Boolean).join(' ') || username;

  try {
    const created = await prisma.client.user.create({
      data: {
        id: uuid(),
        clerkId: clerkUserId,
        username,
        email,
        role: isAdminEmail ? ROLES.admin : ROLES.user,
        displayName,
      },
    });
    return decorate(created);
  } catch (e: any) {
    // Lost a race to create the same clerkId — re-read and return the winner.
    if (e?.code === 'P2002') {
      const raced = await prisma.client.user.findUnique({ where: { clerkId: clerkUserId } });
      if (raced && !raced.deletedAt) return decorate(raced);
    }
    throw e;
  }
}
