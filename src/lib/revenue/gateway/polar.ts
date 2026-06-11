import crypto from 'node:crypto';
import {
  identityFromMetadata,
  type GatewayAdapter,
  type ParsedGatewayEvent,
  type RevenueEventCore,
} from './types';

// Polar.sh webhooks follow the Standard Webhooks spec (same scheme as Dodo):
// headers webhook-id / webhook-timestamp / webhook-signature, signed content
// `${id}.${timestamp}.${rawBody}`, HMAC-SHA256, base64 signature as `v1,<sig>`.
//
// Secret nuance (per Polar docs + polar-js source): the merchant chooses a PLAIN
// string secret, and Polar's SDK base64-ENCODES it before handing it to the
// standard-webhooks lib (which base64-DECODES it back) — i.e. the HMAC key is the
// UTF-8 bytes of the raw secret. We accept both interpretations (raw utf-8, and
// base64-decoded for `whsec_…`-style values) so any paste works.
//
// Events:
//   order.paid       payment succeeded — one-time AND renewals (each cycle is a new
//                    order id; data.billing_reason: purchase | subscription_create |
//                    subscription_cycle | subscription_update). `order.created` is
//                    NOT ingested (renewal orders are created pending, pre-payment).
//   refund.created / refund.updated  per-refund object; counted once when
//                    data.status === 'succeeded' (id stable across both events).
//
// Amounts are integer cents: data.total_amount (after discounts and taxes —
// consistent with Stripe's amount_total / Paddle's grand_total).
const HANDLED = new Set(['order.paid', 'refund.created', 'refund.updated']);

interface PolarEvent {
  type?: string;
  timestamp?: string;
  data?: any;
}

const cents = (v: any) => BigInt(Math.round(Number(v) || 0));

function hmacBase64(key: Buffer, signed: string): string {
  return crypto.createHmac('sha256', key).update(signed).digest('base64');
}

export const polarGatewayAdapter: GatewayAdapter = {
  id: 'polar',

  verifySignature(rawBody, headers, secret) {
    const id = headers.get('webhook-id');
    const timestamp = headers.get('webhook-timestamp');
    const sigHeader = headers.get('webhook-signature');
    if (!id || !timestamp || !sigHeader || !secret) return false;

    try {
      const signed = `${id}.${timestamp}.${rawBody}`;
      const candidates = [hmacBase64(Buffer.from(secret, 'utf-8'), signed)];
      const stripped = secret.replace(/^whsec_/, '');
      try {
        candidates.push(hmacBase64(Buffer.from(stripped, 'base64'), signed));
      } catch {
        /* not valid base64 — utf-8 candidate stands alone */
      }

      // "v1,<sig> v1,<sig2> …" — accept if any listed signature matches either key.
      return sigHeader.split(' ').some(part => {
        const sig = part.includes(',') ? part.split(',')[1] : part;
        if (!sig) return false;
        const a = Buffer.from(sig);
        return candidates.some(expected => {
          const b = Buffer.from(expected);
          return a.length === b.length && crypto.timingSafeEqual(a, b);
        });
      });
    } catch {
      return false;
    }
  },

  parseEvent(rawBody): ParsedGatewayEvent | null {
    const event = JSON.parse(rawBody) as PolarEvent;
    if (!event?.type || !HANDLED.has(event.type)) return null;
    return { kind: event.type, native: event };
  },

  // Checkout metadata propagates to the Order/Subscription → data.metadata.
  extractIdentity(event: PolarEvent) {
    return identityFromMetadata(event?.data?.metadata);
  },

  toRevenueEvent(parsed): RevenueEventCore | null {
    const event = parsed.native as PolarEvent;
    const d = event.data || {};
    const ccy = String(d.currency || 'USD').toUpperCase();

    switch (parsed.kind) {
      case 'order.paid': {
        if (d.status && d.status !== 'paid') return null;
        const amount = cents(d.total_amount);
        if (amount === 0n || !d.id) return null;
        return {
          gateway: 'polar',
          gatewayEventId: `order:${d.id}`,
          type: 'payment',
          amountMinor: amount,
          currency: ccy,
          occurredAt: new Date(d.created_at || event.timestamp || Date.now()),
          rawPayload: event,
        };
      }

      // Per-refund object with its own id and (delta) amount — exact for partials.
      // `amount` EXCLUDES tax while the payment's total_amount includes it; the
      // refunded tax rides separately in tax_amount, so sum both to mirror the
      // payment's magnitude.
      case 'refund.created':
      case 'refund.updated': {
        if (d.status !== 'succeeded') return null;
        const amount = cents(d.amount) + cents(d.tax_amount);
        if (amount === 0n || !d.id) return null;
        return {
          gateway: 'polar',
          gatewayEventId: `refund:${d.id}`,
          type: 'refund',
          amountMinor: -amount,
          currency: ccy,
          occurredAt: new Date(d.created_at || event.timestamp || Date.now()),
          rawPayload: event,
        };
      }

      default:
        return null;
    }
  },
};
