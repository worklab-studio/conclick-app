import crypto from 'node:crypto';
import { secret } from '@/lib/crypto';

/**
 * Slack "Add to Slack" OAuth (incoming-webhook scope). The user authorizes and
 * picks a channel; Slack hands us a hooks.slack.com webhook URL — the same shape
 * the manual paste flow stores, so the rest of the notification stack is unchanged.
 *
 * Env: SLACK_CLIENT_ID, SLACK_CLIENT_SECRET (a Slack app with public distribution
 * enabled + redirect URL ${APP_URL}/api/slack/callback).
 */

export function getSlackConfig() {
  return {
    clientId: process.env.SLACK_CLIENT_ID || '',
    clientSecret: process.env.SLACK_CLIENT_SECRET || '',
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://app.conclick.io',
  };
}

export function slackConfigured(): boolean {
  const { clientId, clientSecret } = getSlackConfig();
  return !!clientId && !!clientSecret;
}

export const slackRedirectUri = () => `${getSlackConfig().appUrl}/api/slack/callback`;

// HMAC state bound to the initiating user + 15-min window — a state minted for
// one session can't create a channel on another user's behalf.
export function signState(userId: string): string {
  const ts = Date.now().toString(36);
  const sig = crypto
    .createHmac('sha256', secret())
    .update(`slack:${userId}:${ts}`)
    .digest('base64url');
  return `${userId}.${ts}.${sig}`;
}

export function verifyState(state: string, expectedUserId: string): boolean {
  const [userId, ts, sig] = (state || '').split('.');
  if (!userId || !ts || !sig || userId !== expectedUserId) return false;
  const expected = crypto
    .createHmac('sha256', secret())
    .update(`slack:${userId}:${ts}`)
    .digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  return Date.now() - parseInt(ts, 36) <= 15 * 60_000;
}

export function buildSlackAuthUrl(state: string): string {
  const { clientId } = getSlackConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    scope: 'incoming-webhook',
    redirect_uri: slackRedirectUri(),
    state,
  });
  return `https://slack.com/oauth/v2/authorize?${params}`;
}

export interface SlackOAuthResult {
  ok: boolean;
  error?: string;
  team?: { name?: string };
  incoming_webhook?: { url?: string; channel?: string };
}

export async function exchangeSlackCode(code: string): Promise<SlackOAuthResult> {
  const { clientId, clientSecret } = getSlackConfig();
  const res = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: slackRedirectUri(),
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const data = (await res.json()) as SlackOAuthResult;
  if (!data.ok) throw new Error(data.error || 'slack oauth failed');
  return data;
}
