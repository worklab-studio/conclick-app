import { NextRequest, NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import { createCheckoutSession, type ConclickPlan } from '@/lib/dodo';

// Creates a Dodo Payments hosted-checkout session for the signed-in user.
// metadata.userId rides along and comes back on the webhook, which is what
// actually activates the plan.
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAuth(request);

    if (!auth?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plan } = await request.json();

    if (plan !== 'monthly' && plan !== 'lifetime') {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.conclick.io';

    const { checkoutUrl } = await createCheckoutSession({
      plan: plan as ConclickPlan,
      userId: auth.user.id,
      email: auth.user.email,
      name: auth.user.displayName || auth.user.username,
      returnUrl: `${appUrl}/account/billing?status=success`,
    });

    return NextResponse.json({ url: checkoutUrl });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('Checkout error:', error?.message || error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
