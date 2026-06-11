import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { badRequest, unauthorized, notFound } from '@/lib/response';
import { checkAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { uuid } from '@/lib/crypto';
import {
  decryptChannel,
  encryptChannelConfig,
  sendToChannel,
  type ChannelConfig,
  type ChannelType,
} from '@/lib/notify';

// Per-founder notification channels (Slack / Discord / Telegram). Configs are
// stored encrypted and never returned — list responses carry a masked target.

const TYPES = ['slack', 'discord', 'telegram'] as const;

const createSchema = z.object({
  type: z.enum(TYPES),
  label: z.string().max(100).optional(),
  config: z.object({
    url: z.string().url().max(500).optional(),
    botToken: z.string().max(200).optional(),
    chatId: z.string().max(100).optional(),
  }),
});

function maskTarget(type: ChannelType, config: ChannelConfig): string {
  if (type === 'telegram') {
    return `bot …${(config.botToken || '').slice(-4)} · chat ${config.chatId || ''}`;
  }
  try {
    const u = new URL(config.url || '');
    return `${u.hostname}${u.pathname.slice(0, 18)}…`;
  } catch {
    return '';
  }
}

function validConfig(type: ChannelType, config: ChannelConfig): string | null {
  if (type === 'slack') {
    if (!config.url?.startsWith('https://hooks.slack.com/')) {
      return 'Paste a Slack incoming-webhook URL (https://hooks.slack.com/…).';
    }
  } else if (type === 'discord') {
    if (!/^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\//.test(config.url || '')) {
      return 'Paste a Discord webhook URL (https://discord.com/api/webhooks/…).';
    }
  } else if (type === 'telegram') {
    if (!config.botToken?.includes(':') || !config.chatId) {
      return 'Telegram needs a bot token (from @BotFather) and your chat id.';
    }
  }
  return null;
}

export async function GET(request: NextRequest) {
  const auth = await checkAuth(request);
  if (!auth?.user) return unauthorized();

  const rows = await prisma.client.notificationChannel.findMany({
    where: { userId: auth.user.id },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(
    rows.map(row => {
      const c = decryptChannel(row);
      return {
        id: row.id,
        type: row.type,
        label: row.label,
        target: c ? maskTarget(c.type, c.config) : '',
        digest: row.digest,
        paymentAlerts: row.paymentAlerts,
      };
    }),
  );
}

export async function POST(request: NextRequest) {
  const auth = await checkAuth(request);
  if (!auth?.user) return unauthorized();

  const body = await request.json().catch(() => ({}));

  // Toggle / test actions on an existing channel.
  if (body.id) {
    const row = await prisma.client.notificationChannel.findFirst({
      where: { id: String(body.id), userId: auth.user.id },
    });
    if (!row) return notFound();

    if (body.action === 'test') {
      const c = decryptChannel(row);
      if (!c) return badRequest({ message: 'Channel config unreadable' });
      try {
        await sendToChannel(c.type, c.config, {
          title: 'Conclick test notification',
          lines: ['**It works.** This channel will receive your digests and payment alerts.'],
          accent: 'violet',
        });
        return NextResponse.json({ ok: true });
      } catch (e: any) {
        return badRequest({ message: `Send failed — ${String(e?.message || e).slice(0, 140)}` });
      }
    }

    const data: Record<string, boolean> = {};
    if (typeof body.digest === 'boolean') data.digest = body.digest;
    if (typeof body.paymentAlerts === 'boolean') data.paymentAlerts = body.paymentAlerts;
    if (!Object.keys(data).length) {
      return badRequest({ message: 'Nothing to update' });
    }
    await prisma.client.notificationChannel.update({ where: { id: row.id }, data });
    return NextResponse.json({ ok: true });
  }

  // Create — validate shape, then PROVE the channel works with a test message
  // before saving (a dead webhook never gets stored).
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest({ message: 'Invalid channel' });
  }
  const { type, label, config } = parsed.data;

  const invalid = validConfig(type, config);
  if (invalid) return badRequest({ message: invalid });

  try {
    await sendToChannel(type, config, {
      title: 'Conclick connected',
      lines: ['**This channel is live.** Daily digests and payment alerts will land here.'],
      accent: 'green',
    });
  } catch (e: any) {
    return badRequest({
      message: `Couldn't reach that channel — ${String(e?.message || e).slice(0, 140)}`,
    });
  }

  const row = await prisma.client.notificationChannel.create({
    data: {
      id: uuid(),
      userId: auth.user.id,
      type,
      label: label || null,
      config: encryptChannelConfig(config),
    },
  });

  return NextResponse.json({ ok: true, id: row.id });
}

export async function DELETE(request: NextRequest) {
  const auth = await checkAuth(request);
  if (!auth?.user) return unauthorized();

  // The client `del` helper sends params as a query string, not a body.
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return badRequest({ message: 'Missing id' });

  await prisma.client.notificationChannel.deleteMany({
    where: { id, userId: auth.user.id },
  });

  return NextResponse.json({ ok: true });
}
