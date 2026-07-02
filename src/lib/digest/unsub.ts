import { timingSafeEqual } from 'crypto';
import { hash, secret } from '@/lib/crypto';

// One-click unsubscribe token: a keyed digest of the userId so the public
// unsubscribe route needs NO login and can't be forged or enumerated. Backed
// by APP_SECRET via secret(); constant-time compare. hash() is sha512 → a
// fixed 128-char hex string, so the length guard is just defensive.

export function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://app.conclick.io';
}

export function makeUnsubToken(userId: string): string {
  return hash(userId, secret(), 'digest-unsub-v1');
}

export function verifyUnsubToken(userId: string, token: string | null | undefined): boolean {
  if (!userId || !token) return false;
  const expected = makeUnsubToken(userId);
  if (token.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function unsubUrl(userId: string): string {
  return `${appBaseUrl()}/api/digest/unsubscribe?u=${encodeURIComponent(userId)}&t=${makeUnsubToken(userId)}`;
}
