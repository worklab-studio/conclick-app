import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature, getLemonSqueezyConfig } from '@/lib/lemonsqueezy';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
    try {
        const rawBody = await request.text();
        const signature = request.headers.get('x-signature') || '';
        const config = getLemonSqueezyConfig();

        // 1. Verify Signature
        if (!verifyWebhookSignature(rawBody, signature, config.webhookSecret)) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        const payload = JSON.parse(rawBody);
        const eventName = payload.meta?.event_name;
        const eventId = request.headers.get('x-event-id') || crypto.randomUUID(); // Lemon sends x-event-id usually, or we assume unique payload

        // 2. Idempotency Check
        // We use the event_id from Lemon Squeezy headers if available, or just trust the payload ID?
        // Let's rely on the strategy: Store event in DB. If exists, skip.
        // It's safer to use the ID from the payload if consistent, but headers is standard for LS.

        // Check if event already processed
        const existingEvent = await prisma.client.webhookEvent.findFirst({
            where: { id: eventId },
        });

        if (existingEvent) {
            return NextResponse.json({ message: 'Event already processed' });
        }

        // 3. Process Event
        const customData = payload.meta?.custom_data;
        const userId = customData?.user_id;

        if (!userId) {
            // Some events might not have user_id if not passed in custom_data (e.g. refunds might not if logic missing)
            // But we always pass it in checkout.
            console.error('No user ID in webhook payload', eventName);
            return NextResponse.json({ message: 'No user ID, skipped' });
        }

        const attributes = payload.data?.attributes;
        const id = payload.data?.id;

        console.log(`Processing Lemon Webhook: ${eventName} for User ${userId}`);

        // DB Transaction for atomicity (Store Event + Update User)
        await prisma.transaction([
            // Record Event
            prisma.client.webhookEvent.create({
                data: {
                    id: eventId,
                    eventName: eventName,
                    payload: payload,
                },
            }),
            // Update User based on event
            ...getPrismaUpdates(eventName, userId, attributes, id, config),
        ]);

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Webhook processing error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

function getPrismaUpdates(eventName: string, userId: string, attributes: any, id: string, config: any) {
    const updates: any[] = [];

    switch (eventName) {
        // --- Subscription Events ---
        case 'subscription_created':
        case 'subscription_updated':
        case 'subscription_payment_success': { // Sometimes good to catch this for renewals
            const status = attributes.status; // active, past_due, etc.
            const variantId = attributes.variant_id?.toString();
            const customerId = attributes.customer_id?.toString();
            const endsAt = attributes.ends_at; // processing this date
            const renewsAt = attributes.renews_at;

            let plan = 'monthly';
            if (variantId === config.annualVariantId) {
                plan = 'annual';
            }

            // Map Dates
            const currentPeriodEnd = renewsAt ? new Date(renewsAt) : null;
            const finalEnd = endsAt ? new Date(endsAt) : null;

            updates.push(
                prisma.client.user.update({
                    where: { id: userId },
                    data: {
                        subscriptionId: id,
                        subscriptionStatus: status,
                        subscriptionPlan: plan,
                        customerId: customerId,
                        currentPeriodEndsAt: currentPeriodEnd,
                        subscriptionEndsAt: finalEnd, // Legacy support
                        endsAt: finalEnd || currentPeriodEnd, // Logical access end

                        // Clear trial data if moving to paid
                        trialStartedAt: null, // Optional: keep record or clear? Requirements said "Clear trial data". 
                        trialEndsAt: null,
                    },
                })
            );
            break;
        }

        case 'subscription_cancelled':
        case 'subscription_expired': {
            const status = attributes.status; // cancelled or expired
            const endsAt = attributes.ends_at;

            updates.push(
                prisma.client.user.update({
                    where: { id: userId },
                    data: {
                        subscriptionStatus: status,
                        endsAt: endsAt ? new Date(endsAt) : null,
                        subscriptionEndsAt: endsAt ? new Date(endsAt) : null,
                    },
                })
            );
            break;
        }

        // --- Lifetime (One-time) Events ---
        case 'order_created':
        case 'order_paid': {
            // Check if it's the lifetime product
            const firstOrderItem = attributes.first_order_item;
            const variantId = firstOrderItem?.variant_id?.toString();

            // If matches Lifetime Variant OR if we just blindly accept it based on checkout context (risky)
            // Better to check variant ID
            const isLifetime = variantId === config.lifetimeVariantId ||
                attributes.status === 'paid' && firstOrderItem?.product_name?.toLowerCase().includes('lifetime'); // Fallback

            if (isLifetime) {
                updates.push(
                    prisma.client.user.update({
                        where: { id: userId },
                        data: {
                            subscriptionStatus: 'active',
                            subscriptionPlan: 'lifetime',
                            lemonOrderId: id,
                            customerId: attributes.customer_id?.toString(),

                            // Lifetime means forever
                            endsAt: null,
                            currentPeriodEndsAt: null,
                            subscriptionEndsAt: null,

                            // Clear trial
                            trialStartedAt: null,
                            trialEndsAt: null,
                        }
                    })
                );
            }
            break;
        }

        case 'order_refunded': {
            // If order was refunded, revoke lifetime DO NOT revoke if they have another active sub?
            // Complex. For now, if the refunded order matches their lemonOrderId, we revoke.
            // But we don't have easy access to read the user state inside this "getPrismaUpdates" (it's sync helper).
            // We can just set status to 'refunded' or 'none' if the ID matches.

            // NOTE: Ideally we check if `lemonOrderId` matches `id`.
            // Since we can't do conditional update easily in one "push", we might just overwrite.
            // Assumption: User only has one active thing at a time.

            updates.push(
                prisma.client.user.update({
                    where: { id: userId, lemonOrderId: id }, // Only update if this specific order is on the user
                    data: {
                        subscriptionStatus: 'refunded',
                        subscriptionPlan: 'none',
                        lemonOrderId: null,
                        endsAt: null
                    }
                })
            );
            break;
        }
    }

    return updates;
}
