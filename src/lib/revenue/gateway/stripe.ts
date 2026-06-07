import Stripe from 'stripe';
import {
  identityFromMetadata,
  type GatewayAdapter,
  type ParsedGatewayEvent,
  type RevenueEventCore,
} from './types';

// `webhooks.constructEvent` only uses the signing secret + raw body — it never
// calls the API — so a placeholder key is sufficient for verification.
const stripe = new Stripe('sk_conclick_webhook_verify_only', { typescript: true });

// Events that move (or reverse) money. Anything else → ignored (route 200s).
const HANDLED = new Set([
  'checkout.session.completed',
  'payment_intent.succeeded',
  'charge.refunded',
  'charge.dispute.created',
]);

export const stripeGatewayAdapter: GatewayAdapter = {
  id: 'stripe',

  verifySignature(rawBody, headers, secret) {
    const sig = headers.get('stripe-signature');
    if (!sig) return false;
    try {
      stripe.webhooks.constructEvent(rawBody, sig, secret);
      return true;
    } catch {
      return false;
    }
  },

  // Signature already verified by the route, so a plain parse is safe here.
  parseEvent(rawBody): ParsedGatewayEvent | null {
    const event = JSON.parse(rawBody) as Stripe.Event;
    if (!HANDLED.has(event.type)) return null;
    return { kind: event.type, native: event };
  },

  // Metadata lives on the event's primary object for every kind we handle
  // (session / payment_intent / charge / dispute all expose `.metadata`).
  extractIdentity(event: Stripe.Event) {
    const obj: any = event?.data?.object;
    return identityFromMetadata(obj?.metadata);
  },

  toRevenueEvent(parsed): RevenueEventCore | null {
    const event = parsed.native as Stripe.Event;
    const obj: any = event.data.object;
    const occurredAt = new Date((event.created ?? 0) * 1000);
    const ccy = (raw?: string) => String(raw || 'usd').toUpperCase();

    switch (event.type) {
      // Hosted Checkout. Keyed on the PaymentIntent so it collapses with the
      // `payment_intent.succeeded` that also fires for the same payment.
      case 'checkout.session.completed': {
        if (obj.payment_status && obj.payment_status !== 'paid') return null;
        const amount = BigInt(obj.amount_total ?? 0);
        if (amount === 0n) return null;
        return {
          gateway: 'stripe',
          gatewayEventId: String(obj.payment_intent || obj.id),
          type: 'payment',
          amountMinor: amount,
          currency: ccy(obj.currency),
          occurredAt,
          rawPayload: event,
        };
      }

      // Direct PaymentIntent flow. Same dedup key as the Checkout case above.
      case 'payment_intent.succeeded': {
        const amount = BigInt(obj.amount_received ?? obj.amount ?? 0);
        if (amount === 0n) return null;
        return {
          gateway: 'stripe',
          gatewayEventId: String(obj.id),
          type: 'payment',
          amountMinor: amount,
          currency: ccy(obj.currency),
          occurredAt,
          rawPayload: event,
        };
      }

      // Refund (negative). Keyed on the event id: redeliveries of the SAME
      // event dedup; genuinely separate partial refunds are separate events.
      case 'charge.refunded': {
        const latest = obj.refunds?.data?.[0]?.amount;
        const refunded = BigInt(latest ?? obj.amount_refunded ?? 0);
        if (refunded === 0n) return null;
        return {
          gateway: 'stripe',
          gatewayEventId: String(event.id),
          type: 'refund',
          amountMinor: -refunded,
          currency: ccy(obj.currency),
          occurredAt,
          rawPayload: event,
        };
      }

      // Dispute / chargeback (negative).
      case 'charge.dispute.created': {
        const amount = BigInt(obj.amount ?? 0);
        if (amount === 0n) return null;
        return {
          gateway: 'stripe',
          gatewayEventId: String(obj.id || event.id),
          type: 'dispute',
          amountMinor: -amount,
          currency: ccy(obj.currency),
          occurredAt,
          rawPayload: event,
        };
      }

      default:
        return null;
    }
  },
};
