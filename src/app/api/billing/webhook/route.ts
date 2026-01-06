import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature, getLemonSqueezyConfig } from '@/lib/lemonsqueezy';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
    try {
        const rawBody = await request.text();
        const signature = request.headers.get('x-signature') || '';
        const config = getLemonSqueezyConfig();

        // Verify webhook signature
        if (!verifyWebhookSignature(rawBody, signature, config.webhookSecret)) {
            console.error('Invalid webhook signature');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        const payload = JSON.parse(rawBody);
        const eventName = payload.meta?.event_name;
        const customData = payload.meta?.custom_data;
        const userId = customData?.user_id;

        if (!userId) {
            console.error('No user ID in webhook payload');
            return NextResponse.json({ error: 'No user ID' }, { status: 400 });
        }

        const subscriptionData = payload.data?.attributes;
        const subscriptionId = payload.data?.id;

        switch (eventName) {
            case 'subscription_created':
            case 'subscription_updated': {
                const status = subscriptionData?.status; // active, on_trial, paused, past_due, cancelled, expired
                const planId = subscriptionData?.variant_id?.toString();
                const endsAt = subscriptionData?.ends_at || subscriptionData?.renews_at;
                const customerId = subscriptionData?.customer_id?.toString();

                // Determine plan type from variant ID
                let planType = 'monthly';
                if (planId === config.annualVariantId) {
                    planType = 'annual';
                } else if (planId === config.lifetimeVariantId) {
                    planType = 'lifetime';
                }

                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        subscriptionId: subscriptionId,
                        subscriptionStatus: status,
                        subscriptionPlan: planType,
                        subscriptionEndsAt: endsAt ? new Date(endsAt) : null,
                        customerId: customerId,
                    },
                });

                console.log(`Subscription ${eventName} for user ${userId}: ${status}`);
                break;
            }

            case 'subscription_cancelled':
            case 'subscription_expired': {
                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        subscriptionStatus: 'cancelled',
                        subscriptionEndsAt: subscriptionData?.ends_at ? new Date(subscriptionData.ends_at) : null,
                    },
                });

                console.log(`Subscription ${eventName} for user ${userId}`);
                break;
            }

            case 'order_created': {
                // Handle one-time purchases (lifetime)
                const productName = subscriptionData?.first_order_item?.product_name?.toLowerCase();
                const customerId = subscriptionData?.customer_id?.toString();

                if (productName?.includes('lifetime')) {
                    await prisma.user.update({
                        where: { id: userId },
                        data: {
                            subscriptionId: subscriptionId,
                            subscriptionStatus: 'active',
                            subscriptionPlan: 'lifetime',
                            subscriptionEndsAt: null, // Never expires
                            customerId: customerId,
                        },
                    });

                    console.log(`Lifetime purchase for user ${userId}`);
                }
                break;
            }

            default:
                console.log(`Unhandled webhook event: ${eventName}`);
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        return NextResponse.json(
            { error: 'Webhook processing failed' },
            { status: 500 }
        );
    }
}

// Required for Next.js to handle raw body
export const config = {
    api: {
        bodyParser: false,
    },
};
