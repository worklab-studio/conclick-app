import { subMinutes } from 'date-fns';
import prisma from '@/lib/prisma';
import { REALTIME_RANGE } from '@/lib/constants';

export interface RealtimeRevenueRow {
  id: string;
  sessionId: string | null;
  type: string; // payment | refund | dispute
  amountMinor: number; // refunds/disputes are negative
  currency: string;
  gateway: string;
  occurredAt: number; // epoch ms
  country: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
}

// Revenue events inside the realtime window, with the payer session's geo so
// the Live page can drop a gold ripple where the money landed. BigInt amounts
// are converted to Number here — they'd throw in JSON.stringify otherwise.
export async function getRealtimeRevenue(websiteId: string): Promise<RealtimeRevenueRow[]> {
  const rows = await prisma.client.revenueEvent.findMany({
    where: {
      websiteId,
      occurredAt: { gte: subMinutes(new Date(), REALTIME_RANGE) },
      type: { in: ['payment', 'refund'] },
    },
    orderBy: { occurredAt: 'desc' },
    take: 25,
    select: {
      id: true,
      sessionId: true,
      type: true,
      amountMinor: true,
      currency: true,
      gateway: true,
      occurredAt: true,
      session: { select: { country: true, city: true, latitude: true, longitude: true } },
    },
  });

  return rows.map(r => ({
    id: r.id,
    sessionId: r.sessionId,
    type: r.type,
    amountMinor: Number(r.amountMinor),
    currency: r.currency,
    gateway: r.gateway,
    occurredAt: r.occurredAt.getTime(),
    country: r.session?.country ?? null,
    city: r.session?.city ?? null,
    latitude: r.session?.latitude ?? null,
    longitude: r.session?.longitude ?? null,
  }));
}
