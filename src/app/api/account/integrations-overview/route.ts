import { NextRequest, NextResponse } from 'next/server';
import { unauthorized } from '@/lib/response';
import { checkAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { googleConfigured } from '@/lib/google';
import { slackConfigured } from '@/lib/slack';

// One-call status feed for the Integrations directory: every website the user
// owns with its payment-gateway and Google connection state. Credentials and
// tokens are never selected, let alone returned — names and status only.

export async function GET(request: NextRequest) {
  const auth = await checkAuth(request);
  if (!auth?.user) return unauthorized();

  // Every website the user can reach — their own AND any team they belong to —
  // mirroring getUserWebsites / the Websites list. The old query only matched
  // userId, so team-owned products silently went missing from this page.
  const websites = await prisma.client.website.findMany({
    where: {
      deletedAt: null,
      OR: [
        { userId: auth.user.id },
        { team: { deletedAt: null, members: { some: { userId: auth.user.id } } } },
      ],
    },
    select: { id: true, name: true, domain: true },
    orderBy: { name: 'asc' },
  });

  const ids = websites.map(w => w.id);

  const [payments, googles] = ids.length
    ? await Promise.all([
        prisma.client.paymentIntegration.findMany({
          where: { websiteId: { in: ids }, status: { in: ['active', 'paused'] } },
          select: { websiteId: true, provider: true, status: true },
        }),
        prisma.client.googleConnection.findMany({
          where: { websiteId: { in: ids } },
          select: { websiteId: true, email: true, gscSiteUrl: true, ga4PropertyId: true },
        }),
      ])
    : [[], []];

  const paymentByWebsite = new Map(payments.map(p => [p.websiteId, p]));
  const googleByWebsite = new Map(googles.map(g => [g.websiteId, g]));

  return NextResponse.json({
    websites: websites.map(w => {
      const payment = paymentByWebsite.get(w.id);
      const google = googleByWebsite.get(w.id);
      return {
        id: w.id,
        name: w.name,
        domain: w.domain,
        payment: payment ? { provider: payment.provider, status: payment.status } : null,
        google: google
          ? {
              email: google.email,
              gscSiteUrl: google.gscSiteUrl,
              ga4PropertyId: google.ga4PropertyId,
            }
          : null,
      };
    }),
    googleConfigured: googleConfigured(),
    slackConfigured: slackConfigured(),
  });
}
