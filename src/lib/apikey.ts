import crypto from 'node:crypto';
import prisma from '@/lib/prisma';

const PREFIX = 'ck_live_';

export interface GeneratedApiKey {
  /** Full plaintext key — shown to the user exactly once, never stored. */
  key: string;
  /** SHA-256 hex of the key — what we store + look up by. */
  hash: string;
  /** Short, safe-to-display prefix, e.g. `ck_live_a1b2c3`. */
  prefix: string;
}

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export function isApiKey(token?: string | null): boolean {
  return !!token && token.startsWith('ck_');
}

export function generateApiKey(): GeneratedApiKey {
  const raw = crypto.randomBytes(24).toString('base64url'); // ~32 url-safe chars
  const key = `${PREFIX}${raw}`;
  return { key, hash: hashApiKey(key), prefix: key.slice(0, PREFIX.length + 6) };
}

/**
 * Resolve the user behind a `ck_…` API key, or null if missing/revoked.
 * Returns the same decorated shape (`{ ...user, isAdmin }`) the rest of the
 * app expects from the Clerk path. Bumps last_used_at (best-effort).
 */
export async function getUserByApiKey(key: string) {
  const row = await prisma.client.apiKey.findUnique({
    where: { keyHash: hashApiKey(key) },
  });

  if (!row || row.revokedAt) return null;

  const user = await prisma.client.user.findUnique({ where: { id: row.userId } });
  if (!user || user.deletedAt) return null;

  // Fire-and-forget usage stamp (don't block the request on it).
  prisma.client.apiKey
    .update({ where: { id: row.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return { ...user, isAdmin: user.role === 'admin', apiKeyScope: row.scope };
}
