import crypto from 'node:crypto';
import {
  identityFromMetadata,
  type GatewayAdapter,
  type ParsedGatewayEvent,
  type RevenueEventCore,
} from './types';

// Lemon Squeezy webhooks: `X-Signature` header = HMAC-SHA256 HEX digest of the raw
// body with the merchant-chosen signing secret (no timestamp in the scheme).
// Payloads are JSON:API: { meta: { event_name, custom_data }, data: { id, attributes } }.
// Amounts are integer CENTS in the order/invoice currency.
//
// Events:
//   order_created                 every purchase incl. a NEW subscription's first
//                                 charge (Order; ingest only status=paid)
//   subscription_payment_success  fires for the initial payment AND renewals — the
//                                 INITIAL invoice is SKIPPED here (the paid order
//                                 already recorded that money; ingesting both would
//                                 double-count every new subscription). Renewals
//                                 (billing_reason=renewal) have no order, so they
//                                 ingest under their own invoice ids.
//   order_refunded                full/partial refund of an order (CUMULATIVE
//   subscription_payment_refunded amount → stored in 'replace' mode so successive
//                                 partial refunds converge to the true total)
//
// LS payloads carry no per-event UUID — idempotency keys are built from the resource
// type + data.id.
const HANDLED = new Set([
  'order_created',
  'subscription_payment_success',
  'order_refunded',
  'subscription_payment_refunded',
]);

interface LemonEvent {
  meta?: { event_name?: string; custom_data?: Record<string, any> };
  data?: { type?: string; id?: string; attributes?: any };
}

const cents = (v: any) => BigInt(Math.round(Number(v) || 0));

export const lemonsqueezyGatewayAdapter: GatewayAdapter = {
  id: 'lemonsqueezy',

  verifySignature(rawBody, headers, secret) {
    const sig = headers.get('x-signature');
    if (!sig || !secret) return false;
    try {
      const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
      const a = Buffer.from(sig);
      const b = Buffer.from(expected);
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    } catch {
      return false;
    }
  },

  parseEvent(rawBody): ParsedGatewayEvent | null {
    const event = JSON.parse(rawBody) as LemonEvent;
    const kind = event?.meta?.event_name;
    if (!kind || !HANDLED.has(kind)) return null;
    return { kind, native: event };
  },

  // Checkout custom data (`?checkout[custom][distinct_id]=…` or the Create Checkout
  // API's checkout_data.custom) arrives on every event at meta.custom_data.
  extractIdentity(event: LemonEvent) {
    return identityFromMetadata(event?.meta?.custom_data);
  },

  toRevenueEvent(parsed): RevenueEventCore | null {
    const event = parsed.native as LemonEvent;
    const attrs = event.data?.attributes || {};
    const id = String(event.data?.id || '');
    if (!id) return null;
    const currency = String(attrs.currency || 'USD').toUpperCase();
    const occurredAt = new Date(attrs.created_at || Date.now());

    switch (parsed.kind) {
      // One-time order. Only `paid` counts — pending/failed/fraudulent are noise.
      case 'order_created': {
        if (attrs.status !== 'paid') return null;
        const amount = cents(attrs.total);
        if (amount === 0n) return null;
        return {
          gateway: 'lemonsqueezy',
          gatewayEventId: `order:${id}`,
          type: 'payment',
          amountMinor: amount,
          currency,
          occurredAt,
          rawPayload: event,
        };
      }

      // Subscription invoice. The INITIAL invoice double-reports the money already
      // captured by the paid order_created — skip it; renewals are the real signal.
      case 'subscription_payment_success': {
        if (attrs.status && attrs.status !== 'paid') return null;
        if (attrs.billing_reason === 'initial') return null;
        const amount = cents(attrs.total);
        if (amount === 0n) return null;
        return {
          gateway: 'lemonsqueezy',
          gatewayEventId: `subinv:${id}`,
          type: 'payment',
          amountMinor: amount,
          currency,
          occurredAt,
          rawPayload: event,
        };
      }

      // Refunds re-send the same resource with a CUMULATIVE refunded_amount —
      // 'replace' mode keeps the single refund row equal to the running total, so
      // a $10 partial followed by a full refund ends at the correct figure.
      case 'order_refunded':
      case 'subscription_payment_refunded': {
        const refunded = cents(attrs.refunded_amount ?? (attrs.refunded ? attrs.total : 0));
        if (refunded === 0n) return null;
        const prefix = parsed.kind === 'order_refunded' ? 'order' : 'subinv';
        return {
          gateway: 'lemonsqueezy',
          gatewayEventId: `${prefix}:${id}:refund`,
          type: 'refund',
          amountMinor: -refunded,
          currency,
          occurredAt: new Date(attrs.refunded_at || attrs.updated_at || Date.now()),
          rawPayload: event,
          mode: 'replace',
        };
      }

      default:
        return null;
    }
  },
};
