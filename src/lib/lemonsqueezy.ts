import {
    lemonSqueezySetup,
    createCheckout,
    getSubscription,
    cancelSubscription,
    getCustomer,
} from '@lemonsqueezy/lemonsqueezy.js';

// Initialize Lemon Squeezy with API key
const initLemonSqueezy = () => {
    lemonSqueezySetup({
        apiKey: process.env.LEMONSQUEEZY_API_KEY || '',
        onError: (error) => {
            console.error('Lemon Squeezy Error:', error);
        },
    });
};

// Get environment variables
export const getLemonSqueezyConfig = () => ({
    storeId: process.env.LEMONSQUEEZY_STORE_ID || '',
    monthlyVariantId: process.env.LEMONSQUEEZY_MONTHLY_VARIANT_ID || '',
    annualVariantId: process.env.LEMONSQUEEZY_ANNUAL_VARIANT_ID || '',
    lifetimeVariantId: process.env.LEMONSQUEEZY_LIFETIME_VARIANT_ID || '',
    webhookSecret: process.env.LEMONSQUEEZY_WEBHOOK_SECRET || '',
});

// Create a checkout URL for a subscription
export async function createCheckoutUrl({
    variantId,
    userId,
    email,
    redirectUrl,
}: {
    variantId: string;
    userId: string;
    email?: string;
    redirectUrl?: string;
}) {
    initLemonSqueezy();
    const config = getLemonSqueezyConfig();

    try {
        const checkout = await createCheckout(config.storeId, variantId, {
            checkoutOptions: {
                embed: false,
                media: false,
                logo: true,
            },
            checkoutData: {
                email: email || undefined,
                custom: {
                    user_id: userId,
                },
            },
            productOptions: {
                enabledVariants: [parseInt(variantId)],
                redirectUrl: redirectUrl || `${process.env.NEXT_PUBLIC_APP_URL}/account/billing`,
                receiptButtonText: 'Go to Dashboard',
                receiptThankYouNote: 'Thank you for subscribing to Conclick!',
            },
        });

        return checkout.data?.data.attributes.url;
    } catch (error) {
        console.error('Error creating checkout:', error);
        throw error;
    }
}

// Get subscription details
export async function getSubscriptionDetails(subscriptionId: string) {
    initLemonSqueezy();

    try {
        const subscription = await getSubscription(subscriptionId);
        return subscription.data?.data;
    } catch (error) {
        console.error('Error fetching subscription:', error);
        throw error;
    }
}

// Cancel a subscription
export async function cancelUserSubscription(subscriptionId: string) {
    initLemonSqueezy();

    try {
        const subscription = await cancelSubscription(subscriptionId);
        return subscription.data?.data;
    } catch (error) {
        console.error('Error cancelling subscription:', error);
        throw error;
    }
}

// Verify webhook signature
export function verifyWebhookSignature(
    rawBody: string,
    signature: string,
    secret: string
): boolean {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(rawBody).digest('hex');
    return signature === digest;
}

// Subscription plan types
export type SubscriptionPlan = 'monthly' | 'annual' | 'lifetime' | 'free';
export type SubscriptionStatus = 'active' | 'trialing' | 'cancelled' | 'expired' | 'past_due' | 'on_trial';

// Plan details for display
export const PLANS = {
    monthly: {
        name: 'Unlimited',
        description: 'Everything you need',
        price: '$9',
        priceDetail: '/month',
        features: [
            'Unlimited websites',
            'Unlimited pageviews',
            'Real-time analytics',
            'Custom events',
            'Revenue tracking',
            'Team collaboration',
            'Priority support',
        ],
        trial: '14-day free trial',
    },
    annual: {
        name: 'Unlimited',
        description: 'Save 22% with annual billing',
        price: '$7',
        priceDetail: '/month, billed yearly',
        features: [
            'Unlimited websites',
            'Unlimited pageviews',
            'Real-time analytics',
            'Custom events',
            'Revenue tracking',
            'Team collaboration',
            'Priority support',
        ],
        trial: '14-day free trial',
    },
    lifetime: {
        name: 'Lifetime',
        description: 'One-time purchase, forever access',
        price: '$99',
        priceDetail: 'one-time',
        features: [
            'Everything in Unlimited',
            'Lifetime updates',
            'Early access to new features',
            'VIP support',
        ],
        trial: null,
    },
};
