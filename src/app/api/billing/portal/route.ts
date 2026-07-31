import { NextRequest, NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import { createPortalSession } from '@/lib/dodo';
import { createPolarPortalSession, isPolarEnabled } from '@/lib/polar';
import prisma from '@/lib/prisma';

// Customer portal: manage or cancel the subscription and download invoices.
// Polar first (the primary gateway), falling back to Dodo for legacy customers.
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAuth(request);

    if (!auth?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (isPolarEnabled()) {
      try {
        const url = await createPolarPortalSession(auth.user.id);
        return NextResponse.json({ url });
      } catch (error: any) {
        // eslint-disable-next-line no-console
        console.error('Polar portal error:', error?.message || error);
        // fall through to Dodo for customers who paid before the switch
      }
    }

    const user = await prisma.client.user.findUnique({
      where: { id: auth.user.id },
      select: { customerId: true },
    });

    if (!user?.customerId) {
      return NextResponse.json({ error: 'No billing profile yet' }, { status: 404 });
    }

    const url = await createPortalSession(user.customerId);

    return NextResponse.json({ url });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('Portal error:', error?.message || error);
    return NextResponse.json({ error: 'Failed to get billing portal URL' }, { status: 500 });
  }
}
