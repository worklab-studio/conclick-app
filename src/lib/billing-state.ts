// Pure billing-state derivation — safe for client AND server (no prisma import).
// Single source of truth for "does this user have access", used by the paywall,
// the TopNav trial pill, the billing page, and the server-side gate.

export const TRIAL_DAYS = 14;

export interface BillingFieldsLike {
  role?: string | null;
  subscriptionPlan?: string | null;
  subscriptionStatus?: string | null;
  subscriptionEndsAt?: string | Date | null;
  currentPeriodEndsAt?: string | Date | null;
  endsAt?: string | Date | null;
  trialStartedAt?: string | Date | null;
  trialEndsAt?: string | Date | null;
}

export interface BillingState {
  isAdmin: boolean;
  isLifetime: boolean;
  isActivePaid: boolean; // monthly (or lifetime) currently active
  inGrace: boolean; // cancelled/on_hold but the paid period hasn't ended
  isTrial: boolean; // trial running
  trialExpired: boolean;
  hasAccess: boolean;
  trialDaysLeft: number;
  trialEndsAt: Date | null;
  periodEndsAt: Date | null;
  plan: string | null;
  status: string | null;
}

const toDate = (v?: string | Date | null): Date | null => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(+d) ? null : d;
};

export function getBillingState(user?: BillingFieldsLike | null): BillingState {
  const now = new Date();
  const plan = user?.subscriptionPlan ?? null;
  const status = user?.subscriptionStatus ?? null;
  const trialEndsAt = toDate(user?.trialEndsAt);
  const periodEndsAt = toDate(user?.currentPeriodEndsAt);
  const legacyEndsAt = toDate(user?.subscriptionEndsAt);

  const isAdmin = user?.role === 'admin';
  const isLifetime = plan === 'lifetime' && status === 'active';
  const isActivePaid = status === 'active' && plan !== 'trial';
  // Cancelled / payment trouble, but the period the customer already paid for
  // hasn't run out yet (also covers legacy manual end-date overrides).
  const inGrace =
    !isActivePaid &&
    status !== 'trial' &&
    ((periodEndsAt && periodEndsAt > now) || (legacyEndsAt && legacyEndsAt > now));
  const isTrial = !isActivePaid && !isLifetime && !inGrace && !!trialEndsAt && trialEndsAt > now;
  const hasAccess = isAdmin || isLifetime || isActivePaid || !!inGrace || isTrial;
  const trialExpired = !hasAccess && !!trialEndsAt && trialEndsAt <= now;
  const trialDaysLeft =
    isTrial && trialEndsAt ? Math.max(0, Math.ceil((+trialEndsAt - +now) / 86_400_000)) : 0;

  return {
    isAdmin,
    isLifetime,
    isActivePaid,
    inGrace: !!inGrace,
    isTrial,
    trialExpired,
    hasAccess,
    trialDaysLeft,
    trialEndsAt,
    periodEndsAt,
    plan,
    status,
  };
}
