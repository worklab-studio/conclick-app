/* eslint-disable no-console */
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import prisma from '@/lib/prisma';
import { getDodoConfig } from '@/lib/dodo';
import { clearCachedUser } from '@/lib/clerk';
import { sendSubscriptionConfirmation } from '@/lib/email';

export const dynamic = 'force-dynamic';

// Dodo Payments billing webhook (Standard Webhooks spec — same scheme as Svix, so
// the svix lib verifies it). Events map onto the user's subscription columns:
//   payment.succeeded (one-time)  → lifetime active
//   subscription.active           → monthly active
//   subscription.renewed          → roll currentPeriodEndsAt forward
//   subscription.on_hold/failed   → paused (access ends with the paid period)
//   subscription.cancelled        → access until period end, then locked
//   subscription.expired          → locked
//   refund.succeeded              → lifetime revoked (subscriptions refund via Dodo)

// WebhookEvent.id is a Postgres uuid; Dodo's webhook-id is "msg_…" — derive a
// stable uuid from it so replays hit the same row (idempotency).
function uuidFromWebhookId(id: string): string {
  const h = crypto.createHash('md5').update(`dodo:${id}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

async function findUser(metadata: any, customer: any) {
  const userId = metadata?.userId;
  if (userId) {
    const byId = await prisma.client.user.findUnique({ where: { id: userId } });
    if (byId) return byId;
  }
  if (customer?.customer_id) {
    const byCustomer = await prisma.client.user.findFirst({
      where: { customerId: customer.customer_id },
    });
    if (byCustomer) return byCustomer;
  }
  if (customer?.email) {
    return prisma.client.user.findFirst({
      where: { email: { equals: customer.email, mode: 'insensitive' }, deletedAt: null },
    });
  }
  return null;
}

export async function POST(request: NextRequest) {
  const { webhookSecret, lifetimeProductId } = getDodoConfig();

  if (!webhookSecret) {
    console.error('DODO_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const rawBody = await request.text();
  const webhookId = request.headers.get('webhook-id') || '';
  const webhookTimestamp = request.headers.get('webhook-timestamp') || '';
  const webhookSignature = request.headers.get('webhook-signature') || '';

  let event: any;
  try {
    event = new Webhook(webhookSecret).verify(rawBody, {
      'svix-id': webhookId,
      'svix-timestamp': webhookTimestamp,
      'svix-signature': webhookSignature,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const type = event.type as string;
  const data = event.data || {};
  const metadata = data.metadata || {};
  const customer = data.customer || {};

  // Idempotency — process each delivery exactly once.
  const eventId = uuidFromWebhookId(webhookId || crypto.randomUUID());
  const seen = await prisma.client.webhookEvent.findFirst({ where: { id: eventId } });
  if (seen) {
    return NextResponse.json({ message: 'Already processed' });
  }

  const user = await findUser(metadata, customer);

  if (!user) {
    // Record + ack so Dodo doesn't retry forever; nothing to update.
    await prisma.client.webhookEvent
      .create({ data: { id: eventId, eventName: type, payload: event } })
      .catch(() => undefined);
    console.error(`Dodo webhook ${type}: no matching user (metadata/customer)`);
    return NextResponse.json({ message: 'No matching user' });
  }

  console.log(`Dodo webhook: ${type} → user ${user.id}`);

  const updates: Record<string, any> = {};
  let confirmPlan: string | null = null;

  const nextBilling = data.next_billing_date ? new Date(data.next_billing_date) : null;
  const isLifetimePayment =
    metadata.plan === 'lifetime' ||
    (Array.isArray(data.product_cart) &&
      data.product_cart.some((p: any) => p.product_id === lifetimeProductId));

  switch (type) {
    case 'payment.succeeded':
      if (data.subscription_id) {
        // Recurring charge — the subscription.* events carry the state change.
        if (customer.customer_id) updates.customerId = customer.customer_id;
      } else if (isLifetimePayment) {
        updates.subscriptionPlan = 'lifetime';
        updates.subscriptionStatus = 'active';
        updates.customerId = customer.customer_id || user.customerId;
        updates.lemonOrderId = data.payment_id || null; // legacy column name; stores the Dodo payment id
        updates.currentPeriodEndsAt = null;
        updates.endsAt = null;
        confirmPlan = 'lifetime';
      }
      break;

    case 'subscription.active':
      updates.subscriptionPlan = 'monthly';
      updates.subscriptionStatus = 'active';
      updates.subscriptionId = data.subscription_id || null;
      updates.customerId = customer.customer_id || user.customerId;
      updates.currentPeriodEndsAt = nextBilling;
      updates.endsAt = null;
      confirmPlan = 'monthly';
      break;

    case 'subscription.renewed':
      updates.subscriptionStatus = 'active';
      if (nextBilling) updates.currentPeriodEndsAt = nextBilling;
      break;

    case 'subscription.on_hold':
      updates.subscriptionStatus = 'on_hold';
      break;

    case 'subscription.failed':
      updates.subscriptionStatus = 'failed';
      break;

    case 'subscription.cancelled':
      // Keep access until the period the customer already paid for runs out.
      updates.subscriptionStatus = 'cancelled';
      updates.endsAt = user.currentPeriodEndsAt;
      break;

    case 'subscription.expired':
      updates.subscriptionStatus = 'expired';
      break;

    case 'refund.succeeded':
      if (user.subscriptionPlan === 'lifetime') {
        updates.subscriptionStatus = 'refunded';
      }
      break;

    default:
      // Unhandled event — record + ack.
      break;
  }

  await prisma.transaction([
    prisma.client.webhookEvent.create({ data: { id: eventId, eventName: type, payload: event } }),
    ...(Object.keys(updates).length
      ? [prisma.client.user.update({ where: { id: user.id }, data: updates })]
      : []),
  ]);

  // Unlock instantly — the 30s auth cache would otherwise keep the paywall up.
  if (user.clerkId) clearCachedUser(user.clerkId);

  if (confirmPlan && user.email) {
    try {
      await sendSubscriptionConfirmation(user.email, confirmPlan);
    } catch (e: any) {
      console.error('Subscription email failed:', e?.message ?? e);
    }
  }

  return NextResponse.json({ success: true });
}
