import { z } from 'zod';
import { parseRequest } from '@/lib/request';
import { json, badRequest, unauthorized } from '@/lib/response';
import { canViewWebsite, canUpdateWebsite } from '@/permissions';
import { getRevenueProvider } from '@/lib/revenue';
import { getIntegrationStatus, saveIntegration, disconnectIntegration } from '@/lib/revenue/store';
import type { ProviderCredentials } from '@/lib/revenue/types';

// GET — current connection status (never returns credentials).
export async function GET(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const { auth, error } = await parseRequest(request);
  if (error) return error();

  const { websiteId } = await params;
  if (!(await canViewWebsite(auth, websiteId))) return unauthorized();

  return json(await getIntegrationStatus(websiteId));
}

// POST — connect a provider: validate the credentials live, then store encrypted.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const schema = z.object({
    provider: z.string().max(50),
    credentials: z.record(z.string(), z.string()),
  });

  const { auth, body, error } = await parseRequest(request, schema);
  if (error) return error();

  const { websiteId } = await params;
  if (!(await canUpdateWebsite(auth, websiteId))) return unauthorized();

  const provider = getRevenueProvider(body.provider);
  if (!provider) return badRequest({ message: 'Unknown payment provider.' });

  const result = await provider.validate(body.credentials as ProviderCredentials);
  if (!result.ok) {
    return badRequest({ message: result.error || 'Could not validate those credentials.' });
  }

  const creds = body.credentials as ProviderCredentials;
  await saveIntegration(websiteId, body.provider, creds);

  // Best-effort: auto-create the gateway webhook + store its secret, so the user
  // never copies a URL or secret. Non-fatal — account-level revenue works without it.
  let webhookProvisioned = false;
  if (provider.provisionWebhook && !creds.webhookSecret) {
    try {
      const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
      const proto = request.headers.get('x-forwarded-proto') || 'https';
      const webhookUrl = `${proto}://${host}/api/integrations/webhooks/${body.provider}?websiteId=${websiteId}`;
      const { webhookSecret } = await provider.provisionWebhook(creds, webhookUrl);
      if (webhookSecret) {
        await saveIntegration(websiteId, body.provider, { ...creds, webhookSecret });
        webhookProvisioned = true;
      }
    } catch {
      // User can still add the secret manually from the connected panel.
    }
  }

  return json({ ok: true, provider: body.provider, webhookProvisioned });
}

// DELETE — disconnect (wipes the stored secret).
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const { auth, body, error } = await parseRequest(request);
  if (error) return error();

  const { websiteId } = await params;
  if (!(await canUpdateWebsite(auth, websiteId))) return unauthorized();

  await disconnectIntegration(websiteId, (body as any)?.provider);

  return json({ ok: true });
}
