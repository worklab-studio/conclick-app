import { getBillingState, TRIAL_DAYS } from '../billing-state';

const days = (n: number) => new Date(Date.now() + n * 86_400_000);

describe('getBillingState', () => {
  it('no user → no access, not "expired"', () => {
    const s = getBillingState(null);
    expect(s.hasAccess).toBe(false);
    expect(s.trialExpired).toBe(false);
  });

  it('fresh trial → access + day countdown', () => {
    const s = getBillingState({
      subscriptionStatus: 'trial',
      subscriptionPlan: 'trial',
      trialStartedAt: new Date(),
      trialEndsAt: days(TRIAL_DAYS),
    });
    expect(s.isTrial).toBe(true);
    expect(s.hasAccess).toBe(true);
    expect(s.trialDaysLeft).toBe(TRIAL_DAYS);
    expect(s.trialExpired).toBe(false);
  });

  it('expired trial → locked', () => {
    const s = getBillingState({
      subscriptionStatus: 'trial',
      subscriptionPlan: 'trial',
      trialEndsAt: days(-1),
    });
    expect(s.hasAccess).toBe(false);
    expect(s.trialExpired).toBe(true);
    expect(s.isTrial).toBe(false);
  });

  it('monthly active → access', () => {
    const s = getBillingState({
      subscriptionStatus: 'active',
      subscriptionPlan: 'monthly',
      currentPeriodEndsAt: days(20),
      trialEndsAt: days(-30), // old trial doesn't matter
    });
    expect(s.isActivePaid).toBe(true);
    expect(s.hasAccess).toBe(true);
    expect(s.trialExpired).toBe(false);
  });

  it('cancelled but paid period remains → grace access', () => {
    const s = getBillingState({
      subscriptionStatus: 'cancelled',
      subscriptionPlan: 'monthly',
      currentPeriodEndsAt: days(10),
    });
    expect(s.inGrace).toBe(true);
    expect(s.hasAccess).toBe(true);
  });

  it('cancelled and period over → locked', () => {
    const s = getBillingState({
      subscriptionStatus: 'cancelled',
      subscriptionPlan: 'monthly',
      currentPeriodEndsAt: days(-2),
      trialEndsAt: days(-40),
    });
    expect(s.hasAccess).toBe(false);
  });

  it('lifetime active → access forever', () => {
    const s = getBillingState({ subscriptionStatus: 'active', subscriptionPlan: 'lifetime' });
    expect(s.isLifetime).toBe(true);
    expect(s.hasAccess).toBe(true);
  });

  it('lifetime refunded → locked', () => {
    const s = getBillingState({
      subscriptionStatus: 'refunded',
      subscriptionPlan: 'lifetime',
      trialEndsAt: days(-40),
    });
    expect(s.isLifetime).toBe(false);
    expect(s.hasAccess).toBe(false);
  });

  it('admin bypasses everything', () => {
    const s = getBillingState({ role: 'admin', trialEndsAt: days(-99) });
    expect(s.hasAccess).toBe(true);
    expect(s.trialExpired).toBe(false);
  });

  it('ISO-string dates work (client gets JSON)', () => {
    const s = getBillingState({
      subscriptionStatus: 'trial',
      subscriptionPlan: 'trial',
      trialEndsAt: days(5).toISOString(),
    });
    expect(s.isTrial).toBe(true);
    expect(s.trialDaysLeft).toBe(5);
  });
});
