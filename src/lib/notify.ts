import prisma from '@/lib/prisma';
import { decrypt, encrypt, secret } from '@/lib/crypto';
import { formatMinorCurrency } from '@/lib/format';
import { createNotification } from '@/lib/notifications';
import type { DigestSite } from '@/lib/email';
import type { DigestSnapshot } from '@/lib/digest/snapshot';
import type { Narrative } from '@/lib/digest/narrative';
import { collectMilestones, collectSpikes } from '@/lib/digest/narrative';
import { milestoneLabel } from '@/lib/digest/milestones';

/**
 * Founder notification channels: Slack / Discord / Telegram. One structured
 * message shape, rendered to each platform's native format. Channel configs
 * (webhook URLs, bot tokens) are stored encrypted, like payment credentials.
 *
 * Lines may contain **bold** markers — converted per channel (Slack *bold*,
 * Discord **bold**, Telegram <b>bold</b> with HTML escaping).
 */

export type ChannelType = 'slack' | 'discord' | 'telegram';

export interface ChannelConfig {
  url?: string; // slack / discord incoming-webhook URL
  botToken?: string; // telegram
  chatId?: string; // telegram
}

export interface ChannelMessage {
  title: string;
  lines: string[];
  accent?: 'violet' | 'green';
}

const ACCENTS = { violet: '#5e5ba4', green: '#2eb67d' } as const;
const DISCORD_ACCENTS = { violet: 0x5e5ba4, green: 0x2eb67d } as const;

const GATEWAY_NAMES: Record<string, string> = {
  stripe: 'Stripe',
  dodo: 'Dodo Payments',
  lemonsqueezy: 'Lemon Squeezy',
  paddle: 'Paddle',
  polar: 'Polar',
};

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) {
    throw new Error(`notify ${res.status}: ${(await res.text().catch(() => '')).slice(0, 120)}`);
  }
}

const slackify = (s: string) => s.replace(/\*\*(.+?)\*\*/g, '*$1*');
const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const telegramify = (s: string) => escapeHtml(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');

export async function sendToChannel(type: ChannelType, config: ChannelConfig, msg: ChannelMessage) {
  const accent = msg.accent || 'violet';

  if (type === 'slack') {
    if (!config.url) throw new Error('missing url');
    await postJson(config.url, {
      text: msg.title,
      attachments: [
        {
          color: ACCENTS[accent],
          text: [`*${slackify(msg.title)}*`, ...msg.lines.map(slackify)].join('\n'),
        },
      ],
    });
    return;
  }

  if (type === 'discord') {
    if (!config.url) throw new Error('missing url');
    await postJson(config.url, {
      embeds: [
        {
          title: msg.title.replace(/\*\*/g, ''),
          description: msg.lines.join('\n'),
          color: DISCORD_ACCENTS[accent],
        },
      ],
    });
    return;
  }

  // telegram
  if (!config.botToken || !config.chatId) throw new Error('missing botToken/chatId');
  await postJson(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
    chat_id: config.chatId,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    text: [`<b>${escapeHtml(msg.title)}</b>`, ...msg.lines.map(telegramify)].join('\n'),
  });
}

// ---------- message builders ----------

export function digestMessage(sites: DigestSite[]): ChannelMessage {
  const lines: string[] = [];
  for (const s of sites) {
    const money =
      s.revenue > 0 ? ` · **${formatMinorCurrency(s.revenue, s.currency)}** revenue` : '';
    lines.push(
      `**${s.name}** — ${s.visitors.toLocaleString()} visitors · ${s.pageviews.toLocaleString()} pageviews${money}`,
    );
    if (s.topSource) lines.push(`Top source: ${s.topSource}`);
    if (s.leak) {
      lines.push(`Biggest leak: ${s.leak.fromStep} → ${s.leak.toStep} (−${s.leak.dropPct}%)`);
    }
  }
  return { title: 'Daily digest', lines, accent: 'violet' };
}

// Hyped daily summary for chat channels. Title = the LLM headline; lines lead
// with milestones/spikes, then the headline metrics. Green accent when there's
// something to celebrate, violet otherwise.
export function hypeDigestMessage(snapshot: DigestSnapshot, narrative: Narrative): ChannelMessage {
  const t = snapshot.totals;
  const milestones = collectMilestones(snapshot);
  const spikes = collectSpikes(snapshot);
  const lines: string[] = [];

  for (const m of milestones) {
    lines.push(`🏆 **${m.hit.siteName}** crossed **${milestoneLabel(m.hit, m.ccy)}**`);
  }
  for (const x of spikes) {
    lines.push(
      x.s.kind === 'traffic'
        ? `📈 Overall traffic on **${x.site}** is **${x.s.multiple}×** its usual (${x.s.today} visitors)`
        : x.s.isNew
          ? `📈 New traffic from **${x.s.label}** on ${x.site} — ${x.s.today} visits`
          : `📈 **${x.s.label}** sent **${x.s.multiple}×** its usual to ${x.site} (${x.s.today} visits)`,
    );
  }

  const dyd = snapshot.deltas.vsYesterdayPct;
  const dArrow = dyd == null ? '' : ` · ${dyd > 0 ? '▲' : dyd < 0 ? '▼' : '→'} ${Math.abs(dyd)}% vs yesterday`;
  lines.push(`**${t.visitors.toLocaleString('en-US')}** visitors · ${t.pageviews.toLocaleString('en-US')} pageviews${dArrow}`);

  if (t.revenueMinor > 0) lines.push(`💰 **${formatMinorCurrency(t.revenueMinor, t.currency)}** in revenue`);

  const topSite = snapshot.sites.slice().sort((a, b) => b.visitors - a.visitors)[0];
  const topSource = topSite?.topReferrers[0]?.label;
  if (topSource && topSource !== 'Direct') lines.push(`Top source: ${topSource}`);

  const cmp: string[] = [];
  if (snapshot.deltas.vsLastWeekPct != null)
    cmp.push(`${Math.abs(snapshot.deltas.vsLastWeekPct)}% ${snapshot.deltas.vsLastWeekPct >= 0 ? 'above' : 'below'} weekly avg`);
  if (snapshot.deltas.vsLastMonthPct != null)
    cmp.push(`${Math.abs(snapshot.deltas.vsLastMonthPct)}% ${snapshot.deltas.vsLastMonthPct >= 0 ? 'ahead of' : 'behind'} last month`);
  if (cmp.length) lines.push(cmp.join(' · '));

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.conclick.io';
  lines.push(`👉 ${appUrl}/websites`);

  return {
    title: narrative.channelHeadline,
    lines,
    accent: milestones.length || spikes.length ? 'green' : 'violet',
  };
}

export function paymentAlertMessage(info: {
  siteName: string;
  amountMinor: bigint | number;
  currency: string;
  gateway: string;
  country?: string | null;
  attributed?: boolean;
}): ChannelMessage {
  const money = formatMinorCurrency(Number(info.amountMinor), info.currency);
  const via = GATEWAY_NAMES[info.gateway] || info.gateway;
  const lines = [`**${info.siteName}** · via ${via}`];
  const extras: string[] = [];
  if (info.country) extras.push(info.country);
  extras.push(info.attributed ? 'attributed to a visitor session' : 'not yet attributed');
  lines.push(extras.join(' · '));
  return { title: `New payment — ${money}`, lines, accent: 'green' };
}

// ---------- storage helpers ----------

export interface DecryptedChannel {
  id: string;
  type: ChannelType;
  label: string | null;
  config: ChannelConfig;
  digest: boolean;
  paymentAlerts: boolean;
}

export function decryptChannel(row: {
  id: string;
  type: string;
  label: string | null;
  config: string;
  digest: boolean;
  paymentAlerts: boolean;
}): DecryptedChannel | null {
  try {
    return {
      id: row.id,
      type: row.type as ChannelType,
      label: row.label,
      config: JSON.parse(decrypt(row.config, secret())) as ChannelConfig,
      digest: row.digest,
      paymentAlerts: row.paymentAlerts,
    };
  } catch {
    return null;
  }
}

export function encryptChannelConfig(config: ChannelConfig): string {
  return encrypt(JSON.stringify(config), secret());
}

export async function getUserChannels(
  userId: string,
  kind?: 'digest' | 'paymentAlerts',
): Promise<DecryptedChannel[]> {
  const rows = await prisma.client.notificationChannel.findMany({ where: { userId } });
  return rows.map(decryptChannel).filter((c): c is DecryptedChannel => !!c && (!kind || c[kind]));
}

// ---------- fan-out ----------

/** Digest fan-out for the cron — one channel failing never blocks another. */
export async function sendDigestToChannels(userId: string, sites: DigestSite[]) {
  const channels = await getUserChannels(userId, 'digest');
  if (!channels.length) return;
  const msg = digestMessage(sites);
  await Promise.allSettled(channels.map(c => sendToChannel(c.type, c.config, msg)));
}

/** Hyped-digest fan-out. Returns true if at least one channel accepted it. */
export async function sendHypeDigestToChannels(
  userId: string,
  snapshot: DigestSnapshot,
  narrative: Narrative,
): Promise<boolean> {
  const channels = await getUserChannels(userId, 'digest');
  if (!channels.length) return false;
  const msg = hypeDigestMessage(snapshot, narrative);
  const results = await Promise.allSettled(channels.map(c => sendToChannel(c.type, c.config, msg)));
  return results.some(r => r.status === 'fulfilled');
}

/**
 * Instant payment alert — called fire-and-forget from the gateway webhook route
 * after a genuinely NEW payment row is inserted (never on retries/duplicates).
 * Sends to the site owner's channels + drops an in-app notification.
 */
export async function notifyPayment(
  websiteId: string,
  info: {
    amountMinor: bigint | number;
    currency: string;
    gateway: string;
    sessionId?: string | null;
    attributed?: boolean;
  },
) {
  try {
    const website = await prisma.client.website.findUnique({
      where: { id: websiteId },
      select: { name: true, userId: true, createdBy: true },
    });
    const ownerId = website?.userId || website?.createdBy;
    if (!website || !ownerId) return;

    let country: string | null = null;
    if (info.sessionId) {
      const session = await prisma.client.session.findUnique({
        where: { id: info.sessionId },
        select: { country: true },
      });
      country = session?.country ?? null;
    }

    const msg = paymentAlertMessage({
      siteName: website.name,
      amountMinor: info.amountMinor,
      currency: info.currency,
      gateway: info.gateway,
      country,
      attributed: info.attributed,
    });

    const channels = await getUserChannels(ownerId, 'paymentAlerts');
    // The in-app inbox row is skipped for micro-payments (< 1.00) so high-volume
    // low-ticket stores don't drown the bell icon.
    const inApp =
      Number(info.amountMinor) >= 100
        ? [createNotification(ownerId, 'success', msg.title, msg.lines.join(' · ')).then(() => {})]
        : [];
    await Promise.allSettled([
      ...channels.map(c => sendToChannel(c.type, c.config, msg)),
      ...inApp,
    ]);
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('notifyPayment failed:', e?.message ?? e);
  }
}
