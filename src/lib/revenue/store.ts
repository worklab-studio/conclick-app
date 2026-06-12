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

/** Public connection status — never returns credentials, only whether a webhook secret exists. */
export async function getIntegrationStatus(websiteId: string) {
  const active = await getActiveIntegration(websiteId);
  if (!active) return { connected: false, provider: null, hasWebhookSecret: false };
  return {
    connected: true,
    provider: active.provider,
    hasWebhookSecret: !!active.credentials.webhookSecret,
  };
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

/**
 * Pause/resume an integration without touching its credentials. Only flips
 * live rows — a disconnected row (credentials wiped) can never be "resumed"
 * back into service. Returns the number of rows updated.
 */
export async function setIntegrationStatus(
  websiteId: string,
  provider: string,
  status: 'active' | 'paused',
) {
  const { count } = await prisma.client.paymentIntegration.updateMany({
    where: { websiteId, provider, status: { in: ['active', 'paused'] } },
    data: { status },
  });
  return count;
}

/** Whether this gateway is connected but paused (used to ack webhooks with 200). */
export async function isIntegrationPaused(websiteId: string, provider: string) {
  const row = await prisma.client.paymentIntegration.findFirst({
    where: { websiteId, provider, status: 'paused' },
    select: { id: true },
  });
  return !!row;
}
