import prisma from '@/lib/prisma';
import { encrypt, decrypt, secret } from '@/lib/crypto';
import type { ProviderCredentials } from './types';

export interface ActiveIntegration {
  provider: string;
  credentials: ProviderCredentials;
}

/** The connected, active provider for a website (with decrypted credentials), or null. */
export async function getActiveIntegration(websiteId: string): Promise<ActiveIntegration | null> {
  const row = await prisma.client.paymentIntegration.findFirst({
    where: { websiteId, status: 'active' },
  });

  if (!row || !row.credentials) return null;

  try {
    const credentials = JSON.parse(decrypt(row.credentials, secret())) as ProviderCredentials;
    return { provider: row.provider, credentials };
  } catch {
    return null;
  }
}

/** Public connection status — never returns credentials. */
export async function getIntegrationStatus(websiteId: string) {
  const row = await prisma.client.paymentIntegration.findFirst({
    where: { websiteId, status: 'active' },
    select: { provider: true, updatedAt: true },
  });

  return row
    ? { connected: true, provider: row.provider, connectedAt: row.updatedAt }
    : { connected: false, provider: null };
}

export async function saveIntegration(
  websiteId: string,
  provider: string,
  credentials: ProviderCredentials,
) {
  const enc = encrypt(JSON.stringify(credentials), secret());

  return prisma.client.paymentIntegration.upsert({
    where: { websiteId_provider: { websiteId, provider } },
    create: { websiteId, provider, credentials: enc, status: 'active' },
    update: { credentials: enc, status: 'active' },
  });
}

/**
 * Disconnect: mark inactive and wipe the stored secret (soft — keeps the row
 * as an audit trail, but the credential is gone). Not a hard delete.
 */
export async function disconnectIntegration(websiteId: string, provider?: string) {
  return prisma.client.paymentIntegration.updateMany({
    where: { websiteId, ...(provider ? { provider } : {}) },
    data: { status: 'disconnected', credentials: '' },
  });
}
