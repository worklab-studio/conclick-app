import prisma from '@/lib/prisma';
import { uuid } from '@/lib/crypto';
import type { NormalizedRevenueEvent } from './gateway/types';

/**
 * The ONLY writer of `revenue_event`.
 *
 * Resolves the session deterministically from `distinctId`:
 *   sessionId = uuid(websiteId, distinctId)
 * — identical to what the collector wrote in `/api/send`
 * (`sessionId = uuid(sourceId, id)`, sourceId === websiteId, id === distinctId),
 * so a webhook that only carries `distinct_id` still lands on the exact session.
 *
 * Upsert is idempotent on (gateway, gatewayEventId): webhook retries and
 * overlapping events (e.g. Stripe's checkout.session.completed +
 * payment_intent.succeeded, keyed on the same PaymentIntent) are no-ops.
 */
export async function ingestRevenueEvent(websiteId: string, ev: NormalizedRevenueEvent) {
  let sessionId = ev.sessionId;
  if (!sessionId && ev.distinctId) {
    sessionId = uuid(websiteId, ev.distinctId);
  }

  await prisma.client.revenueEvent.upsert({
    where: {
      gateway_gatewayEventId: { gateway: ev.gateway, gatewayEventId: ev.gatewayEventId },
    },
    create: {
      id: uuid(),
      websiteId,
      distinctId: ev.distinctId,
      sessionId: sessionId ?? null,
      gateway: ev.gateway,
      gatewayEventId: ev.gatewayEventId,
      type: ev.type,
      amountMinor: ev.amountMinor,
      currency: ev.currency,
      occurredAt: ev.occurredAt,
      rawPayload: ev.rawPayload as any,
    },
    update: {}, // duplicate delivery / retry → intentionally a no-op
  });

  return { sessionId: sessionId ?? null, attributed: !!sessionId };
}
