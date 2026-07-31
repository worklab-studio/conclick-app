// Dodo Payments client for Conclick's OWN billing ($9/mo subscription + $99
// lifetime). Thin fetch wrapper — two endpoints — no SDK needed. Live mode by
// default; point DODO_API_BASE at https://test.dodopayments.com for test mode.

const API_BASE = process.env.DODO_API_BASE || 'https://live.dodopayments.com';

export function getDodoConfig() {
  return {
    apiKey: process.env.DODO_PAYMENTS_API_KEY || '',
    webhookSecret: process.env.DODO_WEBHOOK_SECRET || '',
    monthlyProductId: process.env.DODO_MONTHLY_PRODUCT_ID || '',
    lifetimeProductId: process.env.DODO_LIFETIME_PRODUCT_ID || '',
  };
}

async function dodoFetch(path: string, init?: { method?: string; body?: string }) {
  const { apiKey } = getDodoConfig();
  if (!apiKey) throw new Error('DODO_PAYMENTS_API_KEY is not set');

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Dodo ${init?.method || 'GET'} ${path} → ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

export type ConclickPlan = 'monthly' | 'lifetime';

export function productIdForPlan(plan: ConclickPlan): string {
  const { monthlyProductId, lifetimeProductId } = getDodoConfig();
  return plan === 'lifetime' ? lifetimeProductId : monthlyProductId;
}

/**
 * Create a hosted checkout session. metadata.userId is the local user uuid — it
 * comes back verbatim on every webhook event, which is how payments map to users.
 */
export async function createCheckoutSession({
  plan,
  userId,
  email,
  name,
  returnUrl,
}: {
  plan: ConclickPlan;
  userId: string;
  email?: string | null;
  name?: string | null;
  returnUrl: string;
}): Promise<{ checkoutUrl: string; sessionId: string }> {
  const productId = productIdForPlan(plan);
  if (!productId) {
    throw new Error(
      `Dodo product id for "${plan}" is not configured, run scripts/create-dodo-products.ts and set the env vars.`,
    );
  }

  const session = await dodoFetch('/checkouts', {
    method: 'POST',
    body: JSON.stringify({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: email ? { email, name: name || undefined } : undefined,
      metadata: { userId, plan },
      return_url: returnUrl,
    }),
  });

  return { checkoutUrl: session.checkout_url, sessionId: session.session_id };
}

/** Hosted customer portal (manage/cancel the monthly subscription, invoices). */
export async function createPortalSession(customerId: string): Promise<string> {
  const session = await dodoFetch(
    `/customers/${encodeURIComponent(customerId)}/customer-portal/session`,
    { method: 'POST' },
  );
  return session.link;
}
