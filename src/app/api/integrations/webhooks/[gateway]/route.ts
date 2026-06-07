import { json, badRequest, unauthorized, serverError } from '@/lib/response';
import { getGatewayAdapter } from '@/lib/revenue/gateway';
import { getActiveIntegration } from '@/lib/revenue/store';
import { ingestRevenueEvent } from '@/lib/revenue/ingest';

// Node runtime: the Stripe SDK + node:crypto are used for signature verification.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Public, per-gateway payment webhook: `/api/integrations/webhooks/<gateway>?websiteId=<id>`.
 *
 * There is NO auth check here by design — the gateway's signature IS the auth.
 * The customer registers this exact URL (with their websiteId) in the gateway
 * dashboard and pairs it with the webhook secret stored on the integration.
 *
 * Flow: resolve adapter → read RAW body (required for signature) → resolve
 * websiteId + secret → verify signature → parse (ignored kinds 200 so the
 * gateway stops retrying) → normalize → idempotent ingest.
 */
export async function POST(request: Request, { params }: { params: Promise<{ gateway: string }> }) {
  const { gateway } = await params;

  const adapter = getGatewayAdapter(gateway);
  if (!adapter) return badRequest({ message: `Unknown gateway "${gateway}".` });

  // Raw body MUST be read as text before any parsing — signature schemes hash
  // the exact bytes. (Do not route this through Zod/parseRequest.)
  const rawBody = await request.text();

  const websiteId = new URL(request.url).searchParams.get('websiteId');
  if (!websiteId) return badRequest({ message: 'Missing websiteId.' });

  // The webhook signing secret lives in the (encrypted) integration credentials.
  const active = await getActiveIntegration(websiteId);
  const secret = active?.provider === gateway ? active.credentials.webhookSecret : undefined;
  if (!secret) {
    // No verifiable secret configured for this gateway → cannot trust the call.
    return unauthorized({ message: 'No webhook secret configured for this gateway.' });
  }

  if (!(await adapter.verifySignature(rawBody, request.headers, secret))) {
    return unauthorized({ message: 'Invalid signature.' });
  }

  let parsed;
  try {
    parsed = adapter.parseEvent(rawBody);
  } catch {
    // Verified but unparseable — ack so the gateway doesn't hammer us.
    return json({ received: true, ignored: true });
  }
  if (!parsed) return json({ received: true, ignored: true });

  const core = adapter.toRevenueEvent(parsed);
  if (!core) return json({ received: true, ignored: true });

  const identity = adapter.extractIdentity(parsed.native);

  try {
    const { attributed } = await ingestRevenueEvent(websiteId, { ...core, ...identity });
    return json({ received: true, type: core.type, attributed });
  } catch (e: any) {
    // Let the gateway retry — ingest is idempotent, so retries are safe.
    return serverError({ message: e?.message || 'Failed to record revenue event.' });
  }
}
