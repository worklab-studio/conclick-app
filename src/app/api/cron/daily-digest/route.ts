import { timingSafeEqual } from 'node:crypto';
import { json, unauthorized } from '@/lib/response';
import prisma from '@/lib/prisma';
import { sendFounderDailyDigest, type DigestSite } from '@/lib/email';

// CRON_SECRET-gated; trigger daily from an external scheduler:
//   GET /api/cron/daily-digest?key=$CRON_SECRET
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isAuthorized(provided: string | null): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get('key');
  if (!isAuthorized(key)) return unauthorized();

  // Yesterday, in UTC [start, end).
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);

  const users = await prisma.client.user.findMany({
    where: {
      deletedAt: null,
      dailyDigestEnabled: true,
      email: { not: null },
      websites: { some: { deletedAt: null } },
    },
    include: { websites: { where: { deletedAt: null }, select: { id: true, name: true } } },
  });

  let sent = 0;

  for (const user of users) {
    if (!user.email) continue;
    const sites: DigestSite[] = [];

    for (const w of user.websites) {
      const range = { gte: start, lt: end };
      const [sessionRows, pageviews, rev, topSrc, ccy] = await Promise.all([
        prisma.client.websiteEvent.findMany({
          where: { websiteId: w.id, createdAt: range },
          distinct: ['sessionId'],
          select: { sessionId: true },
        }),
        prisma.client.websiteEvent.count({
          where: { websiteId: w.id, eventType: 1, createdAt: range },
        }),
        prisma.client.revenueEvent.aggregate({
          where: { websiteId: w.id, type: 'payment', occurredAt: range },
          _sum: { amountMinor: true },
          _count: true,
        }),
        prisma.client.websiteEvent.groupBy({
          by: ['referrerDomain'],
          where: { websiteId: w.id, createdAt: range, referrerDomain: { not: null } },
          _count: { referrerDomain: true },
          orderBy: { _count: { referrerDomain: 'desc' } },
          take: 1,
        }),
        prisma.client.revenueEvent.findFirst({
          where: { websiteId: w.id, type: 'payment', occurredAt: range },
          select: { currency: true },
        }),
      ]);

      const visitors = sessionRows.length;
      if (visitors === 0 && pageviews === 0) continue;

      sites.push({
        name: w.name,
        visitors,
        pageviews,
        payments: rev._count || 0,
        revenue: Number(rev._sum.amountMinor || 0n),
        currency: ccy?.currency || 'USD',
        topSource: (topSrc[0] as any)?.referrerDomain || 'Direct',
      });
    }

    if (!sites.length) continue;

    try {
      await sendFounderDailyDigest(user.email, sites);
      sent++;
    } catch {
      // Skip a failed send; the next run will try again.
    }
  }

  return json({ ok: true, users: users.length, sent });
}
