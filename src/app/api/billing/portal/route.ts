import { NextRequest, NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import { lemonSqueezySetup, getSubscription } from '@lemonsqueezy/lemonsqueezy.js';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
    try {
        const auth = await checkAuth(request);

        if (!auth?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user's subscription ID from database
        const user = await prisma.user.findUnique({
            where: { id: auth.user.id },
            select: { subscriptionId: true, customerId: true },
        });

        if (!user?.subscriptionId) {
            return NextResponse.json(
                { error: 'No active subscription found' },
                { status: 404 }
            );
        }

        // Initialize Lemon Squeezy
        lemonSqueezySetup({
            apiKey: process.env.LEMONSQUEEZY_API_KEY || '',
        });

        // Get subscription to get customer portal URL
        const subscription = await getSubscription(user.subscriptionId);
        const portalUrl = subscription.data?.data?.attributes?.urls?.customer_portal;

        if (!portalUrl) {
            return NextResponse.json(
                { error: 'Could not get portal URL' },
                { status: 500 }
            );
        }

        return NextResponse.json({ url: portalUrl });
    } catch (error) {
        console.error('Portal error:', error);
        return NextResponse.json(
            { error: 'Failed to get billing portal URL' },
            { status: 500 }
        );
    }
}
