import { NextRequest, NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import { createPortalSession } from '@/lib/dodo';
import prisma from '@/lib/prisma';

// Dodo customer portal — manage/cancel the monthly subscription, download invoices.
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAuth(request);

    if (!auth?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
