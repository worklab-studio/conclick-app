import Stripe from 'stripe';
import { getWebsite } from '@/queries/prisma';

export async function getStripeClient(websiteId: string) {
    const website = await getWebsite(websiteId);

    // Use the secret key stored in the database
    if (!website?.stripeSecretKey) {
        return null;
    }

    return new Stripe(website.stripeSecretKey, {
        apiVersion: '2024-12-18.acacia', // Latest stable API version or match installed version
        typescript: true,
    });
}
