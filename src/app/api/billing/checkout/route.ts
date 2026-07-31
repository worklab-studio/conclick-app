import { NextRequest, NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import { createPolarCheckout, isPolarEnabled } from '@/lib/polar';
import { createCheckoutSession, type ConclickPlan } from '@/lib/dodo';

// Creates a hosted-checkout session for the signed-in user.
//
// Polar is the primary gateway; Dodo stays as an automatic fallback so the
// page keeps working if Polar is unconfigured. The local user id rides along
// (external_customer_id + metadata) and comes back on the webhook, which is
// what actually activates the plan.
export async function POST(request: NextRequest) {
  const { plan } = await request.json().catch(() => ({ plan: null }));

  if (plan !== 'monthly' && plan !== 'lifetime') {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const auth = await checkAuth(request);

  if (!auth?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.conclick.io';
  const returnUrl = `${appUrl}/account/billing?status=success`;
  const args = {
    plan: plan as ConclickPlan,
    userId: auth.user.id,
    email: auth.user.email,
    name: auth.user.displayName || auth.user.username,
  };

  if (isPolarEnabled()) {
    try {
      const { checkoutUrl } = await createPolarCheckout({ ...args, successUrl: returnUrl });
      return NextResponse.json({ url: checkoutUrl, gateway: 'polar' });
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Polar checkout error:', error?.message || error);
      // fall through to Dodo rather than dead-ending the customer
    }
  }

  try {
    const { checkoutUrl } = await createCheckoutSession({ ...args, returnUrl });
    return NextResponse.json({ url: checkoutUrl, gateway: 'dodo' });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('Checkout error:', error?.message || error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
