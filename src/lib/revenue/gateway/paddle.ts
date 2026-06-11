import crypto from 'node:crypto';
import {
  identityFromMetadata,
  type GatewayAdapter,
  type ParsedGatewayEvent,
  type RevenueEventCore,
} from './types';

// Paddle Billing (v2) webhooks: `Paddle-Signature: ts=<unix>;h1=<hex>` where h1 is
// HMAC-SHA256 hex of `${ts}:${rawBody}` with the per-destination secret
// (`pdl_ntfset_…`). Multiple h1 values may be present during secret rotation —
// accept if any matches.
//
// Events:
//   transaction.completed  payment done + processed (one-time AND renewals;
//                          data.origin === 'subscription_recurring' marks renewals)
//   adjustment.created     refunds arrive as status=pending_approval — NOT counted;
//   adjustment.updated     counted only when status becomes `approved`. Chargebacks
//                          are created pre-approved and count immediately.
//
// Amounts are STRINGS in the lowest currency denomination (cents for USD):
// data.details.totals.grand_total (transactions), data.totals.total (adjustments).
const HANDLED = new Set(['transaction.completed', 'adjustment.created', 'adjustment.updated']);

interface PaddleEvent {
  event_id?: string;
  event_type?: string;
  occurred_at?: string;
  data?: any;
}

const cents = (v: any) => BigInt(Math.round(Number(v) || 0));

export const paddleGatewayAdapter: GatewayAdapter = {
  id: 'paddle',

  verifySignature(rawBody, headers, secret) {
    const header = headers.get('paddle-signature');
    if (!header || !secret) return false;
    try {
      const parts = new Map<string, string[]>();
      for (const kv of header.split(';')) {
        const [k, v] = kv.split('=', 2);
        if (!k || !v) continue;
        const key = k.trim();
        parts.set(key, [...(parts.get(key) || []), v.trim()]);
      }
      const ts = parts.get('ts')?.[0];
      const sigs = parts.get('h1') || [];
      if (!ts || !sigs.length) return false;

      const expected = crypto.createHmac('sha256', secret).update(`${ts}:${rawBody}`).digest('hex');
      const b = Buffer.from(expected);
      return sigs.some(sig => {
        const a = Buffer.from(sig);
        return a.length === b.length && crypto.timingSafeEqual(a, b);
      });
    } catch {
      return false;
    }
  },

  parseEvent(rawBody): ParsedGatewayEvent | null {
    const event = JSON.parse(rawBody) as PaddleEvent;
    const kind = event?.event_type;
    if (!kind || !HANDLED.has(kind)) return null;
    return { kind, native: event };
  },

  // Checkout customData → data.custom_data; Paddle copies transaction custom_data
  // onto the subscription and back onto renewal transactions, so renewals keep it.
  extractIdentity(event: PaddleEvent) {
    return identityFromMetadata(event?.data?.custom_data);
  },

  toRevenueEvent(parsed): RevenueEventCore | null {
    const event = parsed.native as PaddleEvent;
    const d = event.data || {};
    const occurredAt = new Date(d.billed_at || event.occurred_at || Date.now());

    switch (parsed.kind) {
      case 'transaction.completed': {
        const amount = cents(d.details?.totals?.grand_total);
        if (amount === 0n || !d.id) return null;
        return {
          gateway: 'paddle',
          // Keyed on the transaction id (business key) so any duplicate
          // completion/retry events for the same transaction collapse.
          gatewayEventId: `txn:${d.id}`,
          type: 'payment',
          amountMinor: amount,
          currency: String(d.currency_code || 'USD').toUpperCase(),
          occurredAt,
          rawPayload: event,
        };
      }

      // Refunds need Paddle approval: created→pending_approval (skip), updated→
      // approved (count). Chargebacks arrive pre-approved. Reversals
      // (chargeback_reverse / credit_reverse) are separate adjustments with their
      // own ids that give the money BACK — ingested as positive corrections so a
      // won dispute doesn't stay counted as a loss.
      case 'adjustment.created':
      case 'adjustment.updated': {
        const action = String(d.action || '');
        const isRefund = action === 'refund' || action === 'credit';
        const isDispute = action === 'chargeback' || action === 'chargeback_warning';
        const isReversal = action === 'chargeback_reverse' || action === 'credit_reverse';
        if (!isRefund && !isDispute && !isReversal) return null;
        if (d.status !== 'approved') return null;
        const amount = cents(d.totals?.total);
        if (amount === 0n || !d.id) return null;
        return {
          gateway: 'paddle',
          // Adjustment id is stable across created/updated — the approved event
          // ingests once; re-deliveries dedupe.
          gatewayEventId: `adj:${d.id}`,
          type: isRefund ? 'refund' : 'dispute',
          amountMinor: isReversal ? amount : -amount,
          currency: String(d.currency_code || 'USD').toUpperCase(),
          occurredAt: new Date(d.updated_at || event.occurred_at || Date.now()),
          rawPayload: event,
        };
      }

      default:
        return null;
    }
  },
};
