/* eslint-disable no-console */
import { NextRequest, NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { uuid } from '@/lib/crypto';
import { encryptChannelConfig, sendToChannel } from '@/lib/notify';
import { exchangeSlackCode, getSlackConfig, verifyState } from '@/lib/slack';

// Slack consent round-trip. Top-level navigation → the session cookie is present,
// so the caller must BE the user the state was minted for. We capture the
// incoming-webhook URL Slack returns and store it as a notification channel.
export async function GET(request: NextRequest) {
  const { appUrl } = getSlackConfig();
  const dest = `${appUrl}/account?tab=notifications`;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state') || '';

  const auth = await checkAuth(request);
  if (!auth?.user) return NextResponse.redirect(`${appUrl}/login`);

  if (!code || !verifyState(state, auth.user.id)) {
    return NextResponse.redirect(`${dest}&slack=error`);
  }

  try {
    const data = await exchangeSlackCode(code);
    const webhookUrl = data.incoming_webhook?.url;
    if (!webhookUrl) throw new Error('Slack returned no webhook url');

    const channel = data.incoming_webhook?.channel || '';
    const team = data.team?.name || 'Slack';

    await prisma.client.notificationChannel.create({
      data: {
        id: uuid(),
        userId: auth.user.id,
        type: 'slack',
        label: [team, channel].filter(Boolean).join(' · '),
        config: encryptChannelConfig({ url: webhookUrl }),
      },
    });

    // Welcome ping so the user sees it works immediately (non-fatal).
    await sendToChannel(
      'slack',
      { url: webhookUrl },
      {
        title: 'Conclick connected',
        lines: ['**This channel is live.** Daily digests and payment alerts will land here.'],
        accent: 'green',
      },
    ).catch(() => undefined);

    return NextResponse.redirect(`${dest}&slack=connected`);
  } catch (e: any) {
    console.error('Slack callback failed:', e?.message ?? e);
    return NextResponse.redirect(`${dest}&slack=error`);
  }
}
