// Polar client for Conclick's OWN billing ($9/mo subscription + $99 lifetime).
// Thin fetch wrapper, no SDK needed. Polar is the primary gateway; Dodo is kept
// as a fallback so existing Dodo records keep resolving.
//
// Set POLAR_API_BASE to https://sandbox-api.polar.sh for sandbox testing.

const API_BASE = process.env.POLAR_API_BASE || 'https://api.polar.sh';

export function getPolarConfig() {
  return {
    accessToken: process.env.POLAR_ACCESS_TOKEN || '',
    webhookSecret: process.env.POLAR_WEBHOOK_SECRET || '',
    monthlyProductId: process.env.POLAR_MONTHLY_PRODUCT_ID || '',
    lifetimeProductId: process.env.POLAR_LIFETIME_PRODUCT_ID || '',
  };
}

/** True when Polar is configured well enough to take a payment. */
export function isPolarEnabled(): boolean {
  const { accessToken, monthlyProductId, lifetimeProductId } = getPolarConfig();
  return !!accessToken && !!monthlyProductId && !!lifetimeProductId;
}

async function polarFetch(path: string, init?: { method?: string; body?: string }) {
  const { accessToken } = getPolarConfig();
  if (!accessToken) throw new Error('POLAR_ACCESS_TOKEN is not set');

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `Polar ${init?.method || 'GET'} ${path} → ${res.status}: ${body.slice(0, 300)}`,
    );
  }
  return res.json();
}

export type ConclickPlan = 'monthly' | 'lifetime';

export function polarProductIdForPlan(plan: ConclickPlan): string {
  const { monthlyProductId, lifetimeProductId } = getPolarConfig();
  return plan === 'lifetime' ? lifetimeProductId : monthlyProductId;
}

/**
 * Create a hosted checkout session. `external_customer_id` carries the local
 * user uuid, so every webhook can be mapped back to a user even when the
 * customer pays with a different email than they signed up with. metadata is
 * kept as a belt-and-braces second copy.
 */
export async function createPolarCheckout({
  plan,
  userId,
  email,
  name,
  successUrl,
}: {
  plan: ConclickPlan;
  userId: string;
  email?: string | null;
  name?: string | null;
  successUrl: string;
}): Promise<{ checkoutUrl: string; sessionId: string }> {
  const productId = polarProductIdForPlan(plan);
  if (!productId) {
    throw new Error(`Polar product id for "${plan}" is not configured`);
  }

  const session = await polarFetch('/v1/checkouts/', {
    method: 'POST',
    body: JSON.stringify({
      products: [productId],
      external_customer_id: userId,
      customer_email: email || undefined,
      customer_name: name || undefined,
      success_url: successUrl,
      metadata: { userId, plan },
    }),
  });

  return { checkoutUrl: session.url, sessionId: session.id };
}

/** Hosted customer portal (manage or cancel the subscription, invoices). */
export async function createPolarPortalSession(userId: string): Promise<string> {
  const session = await polarFetch('/v1/customer-sessions/', {
    method: 'POST',
    body: JSON.stringify({ external_customer_id: userId }),
  });
  return session.customer_portal_url;
}
