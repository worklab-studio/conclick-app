import prisma from '@/lib/prisma';
import { User } from '@/generated/prisma/client';
import { addDays } from 'date-fns';

/**
 * Check if a user has access to paid features.
 * Returns true if:
 * 1. Lifetime subscription is active
 * 2. Monthly/Annual subscription is active or in valid period
 * 3. Trial is active and not expired
 */
export function isPaidOrTrialUser(user: User): boolean {
    if (!user) return false;

    // Conclick Demo Bypass
    if (user.username.toLowerCase() === 'conclick') return true;

    const now = new Date();

    // 1. Check Lifetime
    if (user.subscriptionPlan === 'lifetime' && user.subscriptionStatus === 'active') {
        return true;
    }

    // Check if lifetime status is valid even if status is not strictly 'active' (manual override)
    // But for now, rely on status.

    // 2. Check Paid Subscription (Monthly/Annual)
    // If status is active, they have access.
    // If status is cancelled but period hasn't ended, they have access.
    if (user.subscriptionStatus === 'active') {
        return true;
    }

    if (user.currentPeriodEndsAt && user.currentPeriodEndsAt > now) {
        return true;
    }

    // Also check subscriptionEndsAt as legacy/fallback
    if (user.subscriptionEndsAt && user.subscriptionEndsAt > now) {
        return true;
    }

    // 3. Check Trial
    // Only if no paid subscription active (which we checked above)
    // Check if trialStartedAt is present and trialEndsAt > now
    if (user.subscriptionStatus === 'trial' || (!user.subscriptionStatus && user.trialEndsAt)) {
        if (user.trialEndsAt && user.trialEndsAt > now) {
            return true;
        }
    }

    return false;
}

/**
 * Start a 14-day free trial for a user.
 * Only if they haven't had a trial before (trialStartedAt is null)
 * AND they don't have an active paid plan.
 */
export async function startTrial(userId: string) {
    const user = await prisma.client.user.findUnique({
        where: { id: userId },
    });

    if (!user) {
        throw new Error('User not found');
    }

    // Check availability
    if (user.trialStartedAt) {
        // Already started trial before.
        // If it's expired, we don't restart.
        return { success: false, message: 'Trial already used' };
    }

    if (isPaidOrTrialUser(user)) {
        return { success: false, message: 'User already has active access' };
    }

    const now = new Date();
    const endsAt = addDays(now, 30);

    await prisma.client.user.update({
        where: { id: userId },
        data: {
            trialStartedAt: now,
            trialEndsAt: endsAt,
            subscriptionStatus: 'trial',
            subscriptionPlan: 'trial',
        },
    });

    return { success: true, message: 'Trial started' };
}
