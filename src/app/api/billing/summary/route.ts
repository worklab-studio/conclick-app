import { NextRequest, NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * Tiny summary of what the customer has riding on their account, used by the
 * paywall. Naming the real numbers ("2 sites, 4,182 visitors, 38 days") beats
 * a generic "your data is safe" line: at the expiry moment the concrete value
 * already collected is the strongest reason to keep going.
 *
 * Every failure degrades to nulls; the paywall falls back to generic copy
 * rather than breaking the one screen that takes money.
 */
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request);

  if (!auth?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const websites = await prisma.client.website.findMany({
      where: { userId: auth.user.id, deletedAt: null },
      select: { id: true, createdAt: true },
      take: 100,
    });

    if (!websites.length) {
      return NextResponse.json({ websites: 0, visitors: null, days: null });
    }

    const ids = websites.map(w => w.id);
    const since = new Date(Date.now() - 30 * 86_400_000);

    const visitors = await prisma.client.session
      .count({ where: { websiteId: { in: ids }, createdAt: { gte: since } } })
      .catch(() => null);

    const earliest = websites
      .map(w => w.createdAt?.getTime() || Date.now())
      .reduce((a, b) => Math.min(a, b), Date.now());
    const days = Math.max(1, Math.round((Date.now() - earliest) / 86_400_000));

    return NextResponse.json({ websites: websites.length, visitors, days });
  } catch {
    return NextResponse.json({ websites: null, visitors: null, days: null });
  }
}
