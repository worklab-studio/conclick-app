import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { Webhook } from 'svix';
import prisma from '@/lib/prisma';
import { ROLES } from '@/lib/constants';
import { uuid } from '@/lib/crypto';
import { getRandomChars } from '@/lib/generate';

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
}

function primaryEmail(data: any): string | null {
  const id = data?.primary_email_address_id;
  const list: any[] = data?.email_addresses || [];
  const match = list.find(e => e.id === id) || list[0];
  return match?.email_address?.toLowerCase() ?? null;
}

async function uniqueUsername(base: string): Promise<string> {
  let candidate = (base || 'user').toLowerCase().replace(/[^a-z0-9._-]/g, '') || 'user';
  const root = candidate;
  for (let i = 0; i < 50; i++) {
    const taken = await prisma.client.user.findUnique({ where: { username: candidate } });
    if (!taken) return candidate;
    candidate = `${root}-${getRandomChars(4).toLowerCase()}`;
  }
  return `${root}-${uuid().slice(0, 8)}`;
}

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!secret) {
    console.error('CLERK_WEBHOOK_SIGNING_SECRET is not set');
    return new NextResponse('Webhook not configured', { status: 500 });
  }

  // Verify the Svix signature over the raw body.
  const h = await headers();
  const svixId = h.get('svix-id');
  const svixTimestamp = h.get('svix-timestamp');
  const svixSignature = h.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new NextResponse('Missing svix headers', { status: 400 });
  }

  const payload = await req.text();

  let evt: any;
  try {
    evt = new Webhook(secret).verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    });
  } catch {
    return new NextResponse('Invalid signature', { status: 400 });
  }

  const type = evt.type as string;
  const data = evt.data;

  try {
    if (type === 'user.created' || type === 'user.updated') {
      const clerkId = data.id as string;
      const email = primaryEmail(data);
      const displayName =
        [data.first_name, data.last_name].filter(Boolean).join(' ') || undefined;
      const isAdminEmail = email ? adminEmails().includes(email) : false;

      const existing = await prisma.client.user.findUnique({ where: { clerkId } });

      if (existing) {
        await prisma.client.user.update({
          where: { id: existing.id },
          data: {
            ...(email ? { email } : {}),
            ...(displayName ? { displayName } : {}),
            ...(isAdminEmail ? { role: ROLES.admin } : {}),
          },
        });
      } else {
        const base = data.username || (email ? email.split('@')[0] : '') || `user-${getRandomChars(6)}`;
        const username = await uniqueUsername(base);
        await prisma.client.user.create({
          data: {
            id: uuid(),
            clerkId,
            username,
            email,
            displayName: displayName ?? username,
            role: isAdminEmail ? ROLES.admin : ROLES.user,
          },
        });
      }
    } else if (type === 'user.deleted') {
      const clerkId = data.id as string;
      const existing = await prisma.client.user.findUnique({ where: { clerkId } });
      if (existing && !existing.deletedAt) {
        // Soft-delete to preserve referential history (websites/events/etc.).
        await prisma.client.user.update({
          where: { id: existing.id },
          data: { deletedAt: new Date() },
        });
      }
    }
  } catch (e: any) {
    console.error('Clerk webhook handler error:', e?.message ?? e);
    return new NextResponse('Handler error', { status: 500 });
  }

  return NextResponse.json({ received: true });
}
