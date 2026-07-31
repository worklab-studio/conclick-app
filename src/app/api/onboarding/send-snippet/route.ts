import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { sendSnippetToDeveloper } from '@/lib/email';

/**
 * "Send this to my developer."
 *
 * The single biggest drop in analytics onboarding is the person who signs up
 * but cannot edit the site right then. This hands the install to whoever can,
 * without the customer losing their place.
 */
export async function POST(request: NextRequest) {
  const auth = await checkAuth(request);
  if (!auth?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = z
    .object({
      email: z.string().email().max(255),
      websiteId: z.string().uuid(),
      domain: z.string().max(500).optional(),
    })
    .safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { email, websiteId, domain } = parsed.data;

  // Only send a snippet for a website this user actually owns.
  const website = await prisma.client.website.findFirst({
    where: { id: websiteId, userId: auth.user.id, deletedAt: null },
    select: { id: true, domain: true },
  });

  if (!website) {
    return NextResponse.json({ error: 'Website not found' }, { status: 404 });
  }

  try {
    await sendSnippetToDeveloper({
      to: email,
      fromName: auth.user.displayName || auth.user.username || 'A teammate',
      websiteId: website.id,
      domain: website.domain || domain || '',
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Could not send' }, { status: 500 });
  }
}
