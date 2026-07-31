/* eslint-disable no-console */
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import prisma from '@/lib/prisma';
import { getPolarConfig } from '@/lib/polar';
import { clearCachedAuthUser } from '@/lib/auth-bridge';
import { sendSubscriptionConfirmation } from '@/lib/email';

export const dynamic = 'force-dynamic';

// Polar billing webhook (Standard Webhooks spec, same scheme as Svix/Dodo).
// Events map onto the user's subscription columns:
//   order.paid (one-time, lifetime product) → lifetime active
//   subscription.active / .cycled           → monthly active, roll period end
//   subscription.past_due                   → past_due
//   subscription.canceled                   → access until the paid period ends
//   subscription.revoked                    → locked
//   order.refunded                          → lifetime revoked
//
// Polar's webhook secret is stored base64-encoded and Svix expects the
// "whsec_"-prefixed form, so normalise before verifying.

function uuidFromWebhookId(id: string): string {
  const h = crypto.createHash('md5').update(`polar:${id}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

/** Resolve the local user from external_customer_id, metadata, or email. */
async function findUser(data: any) {
  const customer = data?.customer || {};
  const candidates = [
    data?.metadata?.userId,
    customer?.external_id,
    data?.subscription?.metadata?.userId,
  ].filter(Boolean);

  for (const id of candidates) {
    const byId = await prisma.client.user.findUnique({ where: { id } }).catch(() => null);
    if (byId) return byId;
  }

  const customerId = customer?.id || data?.customer_id;
  if (customerId) {
    const byCustomer = await prisma.client.user.findFirst({ where: { customerId } });
    if (byCustomer) return byCustomer;
  }

  const email = customer?.email || data?.user?.email;
  if (email) {
    return prisma.client.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, deletedAt: null },
    });
  }
  return null;
}

export async function POST(request: NextRequest) {
  const { webhookSecret, lifetimeProductId } = getPolarConfig();

  if (!webhookSecret) {
    console.error('POLAR_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const rawBody = await request.text();
  const webhookId = request.headers.get('webhook-id') || '';
  const webhookTimestamp = request.headers.get('webhook-timestamp') || '';
  const webhookSignature = request.headers.get('webhook-signature') || '';

  const secret = webhookSecret.startsWith('whsec_') ? webhookSecret : `whsec_${webhookSecret}`;

  let event: any;
  try {
    event = new Webhook(secret).verify(rawBody, {
      'svix-id': webhookId,
      'svix-timestamp': webhookTimestamp,
      'svix-signature': webhookSignature,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const type = event.type as string;
  const data = event.data || {};

  // Idempotency: process each delivery exactly once.
  const eventId = uuidFromWebhookId(webhookId || crypto.randomUUID());
  const seen = await prisma.client.webhookEvent.findFirst({ where: { id: eventId } });
  if (seen) {
    return NextResponse.json({ message: 'Already processed' });
  }

  const user = await findUser(data);

  if (!user) {
    await prisma.client.webhookEvent
      .create({ data: { id: eventId, eventName: type, payload: event } })
      .catch(() => undefined);
    console.error(`Polar webhook ${type}: no matching user`);
    return NextResponse.json({ message: 'No matching user' });
  }

  console.log(`Polar webhook: ${type} → user ${user.id}`);

  const updates: Record<string, any> = {};
  let confirmPlan: string | null = null;

  const periodEnd = data?.current_period_end ? new Date(data.current_period_end) : null;
  const customerId = data?.customer?.id || data?.customer_id || user.customerId;

  // A lifetime purchase is a one-time order for the lifetime product.
  const productId = data?.product_id || data?.product?.id;
  const isLifetimeOrder =
    data?.metadata?.plan === 'lifetime' ||
    (!!lifetimeProductId && productId === lifetimeProductId) ||
    (!data?.subscription_id && !data?.subscription && data?.product?.is_recurring === false);

  switch (type) {
    case 'order.paid':
      if (data?.subscription_id || data?.subscription) {
        // Recurring charge; the subscription.* events carry the state change.
        updates.customerId = customerId;
      } else if (isLifetimeOrder) {
        updates.subscriptionPlan = 'lifetime';
        updates.subscriptionStatus = 'active';
        updates.customerId = customerId;
        updates.lemonOrderId = data?.id || null; // legacy column, stores the order id
        updates.currentPeriodEndsAt = null;
        updates.endsAt = null;
        confirmPlan = 'lifetime';
      }
      break;

    case 'subscription.active':
    case 'subscription.uncanceled':
    case 'subscription.resumed':
      updates.subscriptionPlan = 'monthly';
      updates.subscriptionStatus = 'active';
      updates.subscriptionId = data?.id || null;
      updates.customerId = customerId;
      updates.currentPeriodEndsAt = periodEnd;
      updates.endsAt = null;
      confirmPlan = type === 'subscription.active' ? 'monthly' : null;
      break;

    case 'subscription.cycled':
      updates.subscriptionStatus = 'active';
      if (periodEnd) updates.currentPeriodEndsAt = periodEnd;
      break;

    case 'subscription.past_due':
      updates.subscriptionStatus = 'past_due';
      break;

    case 'subscription.paused':
      updates.subscriptionStatus = 'on_hold';
      break;

    case 'subscription.canceled':
      // Keep access through the period the customer already paid for.
      updates.subscriptionStatus = 'cancelled';
      updates.endsAt = periodEnd || user.currentPeriodEndsAt;
      break;

    case 'subscription.revoked':
      updates.subscriptionStatus = 'expired';
      updates.endsAt = new Date();
      break;

    case 'order.refunded':
      if (user.subscriptionPlan === 'lifetime') {
        updates.subscriptionStatus = 'refunded';
      }
      break;

    default:
      break;
  }

  await prisma.transaction([
    prisma.client.webhookEvent.create({ data: { id: eventId, eventName: type, payload: event } }),
    ...(Object.keys(updates).length
      ? [prisma.client.user.update({ where: { id: user.id }, data: updates })]
      : []),
  ]);

  // Unlock instantly; the 30s auth cache would otherwise keep the paywall up.
  if (user.authId) clearCachedAuthUser(user.authId);

  if (confirmPlan && user.email) {
    try {
      await sendSubscriptionConfirmation(user.email, confirmPlan);
    } catch (e: any) {
      console.error('Subscription email failed:', e?.message ?? e);
    }
  }

  return NextResponse.json({ success: true });
}
