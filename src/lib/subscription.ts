// Subscription helper functions

export interface UserSubscription {
    subscriptionStatus?: string | null;
    subscriptionPlan?: string | null;
    trialStartedAt?: Date | null;
    trialEndsAt?: Date | null;
    subscriptionEndsAt?: Date | null;
}

export function isTrialActive(user: UserSubscription): boolean {
    if (!user.trialEndsAt) return false;
    if (user.subscriptionStatus === 'active' && user.subscriptionPlan) return false; // Paid user
    return new Date() < new Date(user.trialEndsAt);
}

export function getTrialDaysRemaining(user: UserSubscription): number {
    if (!user.trialEndsAt) return 0;
    const now = new Date();
    const trialEnd = new Date(user.trialEndsAt);
    const diffMs = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
}

export function isSubscriptionActive(user: UserSubscription): boolean {
    // Lifetime users
    if (user.subscriptionPlan === 'lifetime' && user.subscriptionStatus === 'active') {
        return true;
    }

    // Paid users with active subscription
    if (user.subscriptionStatus === 'active' && user.subscriptionPlan) {
        if (user.subscriptionEndsAt) {
            return new Date() < new Date(user.subscriptionEndsAt);
        }
        return true;
    }

    // Trial users
    return isTrialActive(user);
}

export function getPlanDisplayName(user: UserSubscription): string {
    if (user.subscriptionPlan === 'lifetime') return 'Lifetime';
    if (user.subscriptionPlan === 'annual') return 'Pro (Yearly)';
    if (user.subscriptionPlan === 'monthly') return 'Pro (Monthly)';
    if (isTrialActive(user)) return 'Free Trial';
    return 'Free';
}

export function getUserPlanStatus(user: UserSubscription): {
    planName: string;
    isActive: boolean;
    isTrial: boolean;
    trialDaysRemaining: number;
    isLifetime: boolean;
} {
    const isTrial = isTrialActive(user);
    const isActive = isSubscriptionActive(user);
    const isLifetime = user.subscriptionPlan === 'lifetime';
    const trialDaysRemaining = getTrialDaysRemaining(user);
    const planName = getPlanDisplayName(user);

    return {
        planName,
        isActive,
        isTrial,
        trialDaysRemaining,
        isLifetime,
    };
}
