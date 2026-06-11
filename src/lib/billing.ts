import prisma from '@/lib/prisma';
import { User } from '@/generated/prisma/client';
import { addDays } from 'date-fns';
import { getBillingState, TRIAL_DAYS } from '@/lib/billing-state';

export { TRIAL_DAYS };

/** Server-side access check (admin bypass, lifetime, active sub, grace, trial). */
export function isPaidOrTrialUser(user: User): boolean {
  if (!user) return false;
  return getBillingState(user as any).hasAccess;
}

/** The column values that start a fresh 14-day trial. */
export function newTrialFields(now = new Date()) {
  return {
    trialStartedAt: now,
    trialEndsAt: addDays(now, TRIAL_DAYS),
    subscriptionStatus: 'trial',
    subscriptionPlan: 'trial',
  };
}

/**
 * Auto-start the 14-day trial for a user who has never had one and has no paid
 * plan — runs at signup, and backfills accounts created before billing shipped.
 * Returns the (possibly updated) user row.
 */
export async function ensureTrialStarted<T extends User>(user: T): Promise<T> {
  if (!user || user.trialStartedAt || user.subscriptionStatus) return user;

  const updated = await prisma.client.user.update({
    where: { id: user.id },
    data: newTrialFields(),
  });

  return updated as T;
}
