import crypto from 'node:crypto';
import {
  identityFromMetadata,
  type GatewayAdapter,
  type ParsedGatewayEvent,
  type RevenueEventCore,
} from './types';

// Dodo Payments webhooks follow the Standard Webhooks spec (svix-style):
// headers webhook-id / webhook-timestamp / webhook-signature; the signed content
// is `${id}.${timestamp}.${rawBody}`, HMAC-SHA256 with the base64 secret, and the
// signature header is a space-separated list of `v1,<base64sig>`.
const HANDLED = new Set(['payment.succeeded', 'refund.succeeded', 'dispute.accepted']);

interface DodoEvent {
  type: string;
  timestamp?: string;
  data?: any;
}

const num = (v: any) => Math.round(Number(v) || 0);

export const dodoGatewayAdapter: GatewayAdapter = {
  id: 'dodo',

  verifySignature(rawBody, headers, secret) {
    const id = headers.get('webhook-id');
    const timestamp = headers.get('webhook-timestamp');
    const sigHeader = headers.get('webhook-signature');
    if (!id || !timestamp || !sigHeader || !secret) return false;

    try {
      const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
      const signed = `${id}.${timestamp}.${rawBody}`;
      const expected = crypto.createHmac('sha256', key).update(signed).digest('base64');
      // "v1,<sig> v1,<sig2> …" — accept if any listed signature matches.
      return sigHeader.split(' ').some(part => {
        const sig = part.includes(',') ? part.split(',')[1] : part;
        if (!sig) return false;
        const a = Buffer.from(sig);
        const b = Buffer.from(expected);
        return a.length === b.length && crypto.timingSafeEqual(a, b);
      });
    } catch {
      return false;
    }
  },

  // Signature already verified by the route, so a plain parse is safe here.
  parseEvent(rawBody): ParsedGatewayEvent | null {
    const event = JSON.parse(rawBody) as DodoEvent;
    if (!event?.type || !HANDLED.has(event.type)) return null;
    return { kind: event.type, native: event };
  },

  // The visitor id is stamped into the payment's metadata at checkout.
  extractIdentity(event: DodoEvent) {
    return identityFromMetadata(event?.data?.metadata);
  },

  toRevenueEvent(parsed): RevenueEventCore | null {
    const event = parsed.native as DodoEvent;
    const d = event.data || {};
    const ccy = (raw?: string) => String(raw || 'USD').toUpperCase();
    const occurredAt = new Date(d.created_at || event.timestamp || Date.now());
    const paymentId = String(d.payment_id || d.refund_id || d.dispute_id || '');

    switch (event.type) {
      case 'payment.succeeded': {
        const amount = BigInt(num(d.total_amount));
        if (amount === 0n || !paymentId) return null;
        return {
          gateway: 'dodo',
          gatewayEventId: paymentId,
          type: 'payment',
          amountMinor: amount,
          currency: ccy(d.currency),
          occurredAt,
          rawPayload: event,
        };
      }

      // Refund (negative).
      case 'refund.succeeded': {
        const amount = BigInt(num(d.amount ?? d.total_amount));
        if (amount === 0n) return null;
        return {
          gateway: 'dodo',
          gatewayEventId: String(d.refund_id || `${paymentId}:refund`),
          type: 'refund',
          amountMinor: -amount,
          currency: ccy(d.currency),
          occurredAt,
          rawPayload: event,
        };
      }

      // Dispute / chargeback (negative).
      case 'dispute.accepted': {
        const amount = BigInt(num(d.amount ?? d.total_amount));
        if (amount === 0n) return null;
        return {
          gateway: 'dodo',
          gatewayEventId: String(d.dispute_id || `${paymentId}:dispute`),
          type: 'dispute',
          amountMinor: -amount,
          currency: ccy(d.currency),
          occurredAt,
          rawPayload: event,
        };
      }

      default:
        return null;
    }
  },
};
