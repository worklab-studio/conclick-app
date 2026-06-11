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
 * Idempotent on (gateway, gatewayEventId): webhook retries and overlapping
 * events (e.g. Stripe's checkout.session.completed + payment_intent.succeeded,
 * keyed on the same PaymentIntent) are no-ops. `inserted` reports whether THIS
 * call created the row — callers use it to fire exactly-once side effects
 * (payment alerts) that must not repeat on redeliveries.
 */
export async function ingestRevenueEvent(websiteId: string, ev: NormalizedRevenueEvent) {
  let sessionId = ev.sessionId;
  if (!sessionId && ev.distinctId) {
    sessionId = uuid(websiteId, ev.distinctId);
  }

  const result = { sessionId: sessionId ?? null, attributed: !!sessionId, inserted: false };

  const where = {
    gateway_gatewayEventId: { gateway: ev.gateway, gatewayEventId: ev.gatewayEventId },
  };
  const existing = await prisma.client.revenueEvent.findUnique({
    where,
    select: { id: true, websiteId: true, amountMinor: true },
  });
  if (existing) {
    // The idempotency key is global (per gateway platform) — a second website
    // pointed at the same store would silently lose events. Surface it.
    if (existing.websiteId !== websiteId) {
      // eslint-disable-next-line no-console
      console.warn(
        `revenue ingest: ${ev.gateway}:${ev.gatewayEventId} already recorded for another website (${existing.websiteId}); skipped for ${websiteId}`,
      );
    }
    // Replace-mode rows carry a cumulative amount (e.g. Lemon Squeezy refunds) —
    // update in place so partial-then-full refunds converge to the true total.
    if (ev.mode === 'replace' && existing.amountMinor !== ev.amountMinor) {
      await prisma.client.revenueEvent.update({
        where,
        data: {
          amountMinor: ev.amountMinor,
          occurredAt: ev.occurredAt,
          rawPayload: ev.rawPayload as any,
        },
      });
    }
    return result;
  }

  try {
    await prisma.client.revenueEvent.create({
      data: {
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
    });
  } catch (e: any) {
    // Lost a race with a concurrent delivery of the same event — still a no-op.
    if (e?.code === 'P2002') return result;
    throw e;
  }

  return { ...result, inserted: true };
}
