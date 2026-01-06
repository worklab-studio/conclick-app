import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutUrl, getLemonSqueezyConfig } from '@/lib/lemonsqueezy';
import { checkAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const auth = await checkAuth(request);

        if (!auth?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { plan } = await request.json();
        const config = getLemonSqueezyConfig();

        // Map plan to variant ID
        let variantId: string;
        switch (plan) {
            case 'monthly':
                variantId = config.monthlyVariantId;
                break;
            case 'annual':
                variantId = config.annualVariantId;
                break;
            case 'lifetime':
                variantId = config.lifetimeVariantId;
                break;
            default:
                return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
        }

        if (!variantId) {
            return NextResponse.json(
                { error: 'Plan not configured. Please set LEMONSQUEEZY_*_VARIANT_ID in environment variables.' },
                { status: 500 }
            );
        }

        const checkoutUrl = await createCheckoutUrl({
            variantId,
            userId: auth.user.id,
            email: auth.user.email || undefined,
            redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'}/account/billing?success=true`,
        });

        if (!checkoutUrl) {
            return NextResponse.json({ error: 'Failed to create checkout' }, { status: 500 });
        }

        return NextResponse.json({ url: checkoutUrl });
    } catch (error) {
        console.error('Checkout error:', error);
        return NextResponse.json(
            { error: 'Failed to create checkout session' },
            { status: 500 }
        );
    }
}
