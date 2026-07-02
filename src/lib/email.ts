import { Resend } from 'resend';
import { formatMinorCurrency } from '@/lib/format';
import type { DigestSnapshot } from '@/lib/digest/snapshot';
import type { Narrative } from '@/lib/digest/narrative';
import { collectMilestones, collectSpikes } from '@/lib/digest/narrative';
import { milestoneLabel } from '@/lib/digest/milestones';

// Lazily constructed: the Resend constructor throws on a missing key, and
// `next build` evaluates this module while collecting API-route page data (where
// RESEND_API_KEY isn't set). Construct on first use at runtime instead, and skip
// sending entirely if the key is absent.
let _resend: Resend | null = null;
function resendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!_resend) _resend = new Resend(key);
  return _resend;
}

// Sending domain must be verified in Resend. Overridable via EMAIL_FROM.
const FROM_EMAIL = process.env.EMAIL_FROM || 'Conclick <noreply@xautopilot.app>';

export async function sendTeamInviteEmail(
  email: string,
  teamName: string,
  inviteUrl: string,
  inviterName?: string,
) {
  const who = inviterName ? `${inviterName} invited you` : 'You have been invited';
  const resend = resendClient();
  if (!resend) return undefined;
  return resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `You're invited to join ${teamName} on Conclick`,
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #18181b; font-size: 24px; font-weight: 600; margin-bottom: 16px;">${who} to join ${teamName}</h1>
        <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          ${teamName} uses Conclick for privacy-friendly analytics. Accept the invitation to view the team's dashboards.
        </p>
        <a href="${inviteUrl}" style="display: inline-block; background: #5e5ba4; color: white; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 8px; margin-bottom: 24px;">
          Accept invitation
        </a>
        <p style="color: #71717a; font-size: 14px; margin-top: 24px;">
          Or paste this link into your browser:<br />
          <a href="${inviteUrl}" style="color: #5e5ba4; word-break: break-all;">${inviteUrl}</a>
        </p>
        <p style="color: #a1a1aa; font-size: 13px; margin-top: 16px;">
          This invitation expires in 7 days. If you weren't expecting it, you can ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;" />
        <p style="color: #a1a1aa; font-size: 12px;">Conclick — Analytics that respect privacy</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, resetToken: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`;

  const resend = resendClient();
  if (!resend) return undefined;
  return resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Reset your password - Conclick',
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #18181b; font-size: 24px; font-weight: 600; margin-bottom: 24px;">Reset your password</h1>
        <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          We received a request to reset your password. Click the button below to choose a new password.
        </p>
        <a href="${resetUrl}" style="display: inline-block; background: #4f46e5; color: white; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 8px; margin-bottom: 24px;">
          Reset Password
        </a>
        <p style="color: #71717a; font-size: 14px; margin-top: 24px;">
          This link expires in 1 hour. If you didn't request this, you can ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;" />
        <p style="color: #a1a1aa; font-size: 12px;">
          Conclick - Analytics that respect privacy
        </p>
      </div>
    `,
  });
}

export async function sendWelcomeEmail(email: string, username: string) {
  const resend = resendClient();
  if (!resend) return undefined;
  return resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Welcome to Conclick! 🎉',
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #18181b; font-size: 24px; font-weight: 600; margin-bottom: 24px;">Welcome to Conclick, ${username}! 🎉</h1>
        <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
          Your 14-day free trial has started. Here's what you can do:
        </p>
        <ul style="color: #52525b; font-size: 16px; line-height: 1.8; padding-left: 24px; margin-bottom: 24px;">
          <li>Track unlimited websites</li>
          <li>See real-time visitor data</li>
          <li>Privacy-focused analytics</li>
          <li>Beautiful, minimal dashboard</li>
        </ul>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/websites" style="display: inline-block; background: #4f46e5; color: white; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 8px; margin-bottom: 24px;">
          Add Your First Website
        </a>
        <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;" />
        <p style="color: #a1a1aa; font-size: 12px;">
          Conclick - Analytics that respect privacy
        </p>
      </div>
    `,
  });
}

export async function sendTrialEndingEmail(email: string, daysLeft: number) {
  const resend = resendClient();
  if (!resend) return undefined;
  return resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `Your Conclick trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #18181b; font-size: 24px; font-weight: 600; margin-bottom: 24px;">Your trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}</h1>
        <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          Don't lose access to your analytics data. Upgrade now to continue tracking your websites.
        </p>
        <div style="background: #fafafa; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <p style="color: #18181b; font-weight: 600; margin-bottom: 8px;">Pro Plan</p>
          <p style="color: #52525b; font-size: 14px; margin-bottom: 4px;">$9/month or $7/month billed yearly</p>
          <p style="color: #71717a; font-size: 14px;">Unlimited websites • Unlimited tracking</p>
        </div>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/account/billing" style="display: inline-block; background: #4f46e5; color: white; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 8px;">
          Upgrade Now
        </a>
        <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;" />
        <p style="color: #a1a1aa; font-size: 12px;">
          Conclick - Analytics that respect privacy
        </p>
      </div>
    `,
  });
}

export async function sendSubscriptionConfirmation(email: string, plan: string) {
  const planDisplay = plan === 'annual' ? '$7/month (billed yearly)' : '$9/month';

  const resend = resendClient();
  if (!resend) return undefined;
  return resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Your Conclick subscription is active! 🚀',
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #18181b; font-size: 24px; font-weight: 600; margin-bottom: 24px;">You're all set! 🚀</h1>
        <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          Your Conclick Pro subscription is now active.
        </p>
        <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <p style="color: #166534; font-weight: 600; margin-bottom: 4px;">Pro Plan Active</p>
          <p style="color: #15803d; font-size: 14px;">${planDisplay}</p>
        </div>
        <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          You now have access to:
        </p>
        <ul style="color: #52525b; font-size: 16px; line-height: 1.8; padding-left: 24px; margin-bottom: 24px;">
          <li>Unlimited websites</li>
          <li>Unlimited tracking</li>
          <li>Priority support</li>
        </ul>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/websites" style="display: inline-block; background: #4f46e5; color: white; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 8px;">
          Go to Dashboard
        </a>
        <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;" />
        <p style="color: #a1a1aa; font-size: 12px;">
          Conclick - Analytics that respect privacy
        </p>
      </div>
    `,
  });
}

export interface DigestSite {
  name: string;
  visitors: number;
  pageviews: number;
  payments: number;
  revenue: number; // minor units
  currency: string;
  topSource: string;
  leak?: { fromStep: string; toStep: string; dropPct: number; lostRevenue: number };
}

const digestMoney = (minor: number, currency: string) =>
  formatMinorCurrency(minor, currency, 'en-US');

// Founder daily digest: yesterday's numbers per website + a top source. Sent by
// the daily-digest cron to website owners who haven't opted out.
export async function sendFounderDailyDigest(email: string, sites: DigestSite[]) {
  const resend = resendClient();
  if (!resend || !sites.length) return undefined;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.conclick.io';
  const totalVisitors = sites.reduce((a, s) => a + s.visitors, 0);
  const totalRevenue = sites.reduce((a, s) => a + s.revenue, 0);
  const currency = sites.find(s => s.revenue > 0)?.currency || 'USD';

  const cards = sites
    .map(
      s => `
      <div style="border:1px solid #e4e4e7;border-radius:12px;padding:16px;margin-bottom:12px;">
        <div style="font-weight:600;color:#18181b;margin-bottom:10px;">${escapeHtml(s.name)}</div>
        <table style="width:100%;font-size:14px;color:#52525b;border-collapse:collapse;">
          <tr><td style="padding:2px 0;">Visitors</td><td style="text-align:right;font-weight:600;color:#18181b;">${s.visitors}</td></tr>
          <tr><td style="padding:2px 0;">Pageviews</td><td style="text-align:right;">${s.pageviews}</td></tr>
          <tr><td style="padding:2px 0;">Payments</td><td style="text-align:right;">${s.payments}</td></tr>
          <tr><td style="padding:2px 0;">Revenue</td><td style="text-align:right;font-weight:600;color:#15803d;">${digestMoney(s.revenue, s.currency)}</td></tr>
          <tr><td style="padding:2px 0;">Top source</td><td style="text-align:right;">${s.topSource || '—'}</td></tr>
        </table>
        ${
          s.leak
            ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px 10px;margin-top:10px;color:#92400e;font-size:13px;">⚠ Biggest funnel leak: <b>${s.leak.fromStep}</b> → <b>${s.leak.toStep}</b> (${s.leak.dropPct}% drop${s.leak.lostRevenue > 0 ? `, ≈${digestMoney(s.leak.lostRevenue, s.currency)} left on the table` : ''})</div>`
            : ''
        }
      </div>`,
    )
    .join('');

  return resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `Yesterday: ${totalVisitors} visitors${totalRevenue ? `, ${digestMoney(totalRevenue, currency)}` : ''} · Conclick`,
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #18181b; font-size: 22px; font-weight: 600; margin-bottom: 20px;">Yesterday's recap</h1>
        ${cards}
        <a href="${appUrl}/websites" style="display: inline-block; background: #5e5ba4; color: white; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 8px; margin-top: 8px;">
          Open dashboard
        </a>
        <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;" />
        <p style="color: #a1a1aa; font-size: 12px;">
          Conclick — Analytics that respect privacy ·
          <a href="${appUrl}/account/preferences" style="color: #a1a1aa;">manage digest</a>
        </p>
      </div>
    `,
  });
}

// ---------------------------------------------------------------------------
// Hyped daily summary (LLM narrative + analytics + peak moments + milestones).
// Branded HTML + a plain-text alternative + one-click List-Unsubscribe headers
// for inbox placement. No remote images (a CSS wordmark renders in Gmail where
// inline SVG would be stripped).
// ---------------------------------------------------------------------------

const BRAND = '#5e5ba4';
const GREEN = '#15803d';

function deltaChip(pct: number | null): string {
  if (pct == null) return '';
  const flat = pct === 0;
  const up = pct > 0;
  const color = flat ? '#71717a' : up ? GREEN : '#b91c1c';
  const arrow = flat ? '→' : up ? '▲' : '▼';
  return `<span style="color:${color};font-size:12px;font-weight:600;white-space:nowrap;">${arrow} ${Math.abs(pct)}%</span>`;
}

function statTile(label: string, value: string, chip = ''): string {
  return `<td style="width:33.33%;padding:14px 10px;text-align:center;vertical-align:top;">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#a1a1aa;font-weight:600;">${label}</div>
    <div style="font-size:24px;font-weight:700;color:#18181b;margin:4px 0 2px;line-height:1.1;">${value}</div>
    ${chip || '&nbsp;'}
  </td>`;
}

export function renderHypeDigest(
  snapshot: DigestSnapshot,
  narrative: Narrative,
  unsubscribeUrl: string,
): { subject: string; html: string; text: string } {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.conclick.io';
  const t = snapshot.totals;
  const milestones = collectMilestones(snapshot);
  const spikes = collectSpikes(snapshot);

  const milestoneBanner = milestones.length
    ? `<div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:14px 16px;margin:0 0 16px;">
        <div style="font-size:14px;font-weight:700;color:${GREEN};">🏆 Milestone${milestones.length > 1 ? 's' : ''} unlocked</div>
        ${milestones
          .map(m => `<div style="font-size:14px;color:#065f46;margin-top:4px;">${escapeHtml(m.hit.siteName)} crossed <b>${milestoneLabel(m.hit, m.ccy)}</b></div>`)
          .join('')}
      </div>`
    : '';

  const spikeBlock = spikes.length
    ? `<div style="margin:0 0 16px;">
        ${spikes
          .map(x => {
            const site = escapeHtml(x.site);
            const label = escapeHtml(x.s.label);
            const text =
              x.s.kind === 'traffic'
                ? `Overall traffic on <b>${site}</b> is ${x.s.multiple}× its usual (${x.s.today} visitors)`
                : x.s.isNew
                  ? `New traffic from <b>${label}</b> on ${site} — ${x.s.today} visits today`
                  : `<b>${label}</b> sent ${x.s.multiple}× its usual to ${site} (${x.s.today} visits)`;
            return `<div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:10px;padding:10px 12px;margin-bottom:8px;font-size:13px;color:#4c1d95;">📈 ${text}</div>`;
          })
          .join('')}
      </div>`
    : '';

  const perSite =
    snapshot.sites.length > 1
      ? `<table style="width:100%;border-collapse:collapse;margin:8px 0 4px;">
          ${snapshot.sites
            .slice()
            .sort((a, b) => b.visitors - a.visitors)
            .map(
              s => `<tr>
                <td style="padding:8px 0;border-top:1px solid #f1f1f4;font-size:14px;color:#18181b;font-weight:600;">${escapeHtml(s.name)}</td>
                <td style="padding:8px 0;border-top:1px solid #f1f1f4;font-size:13px;color:#71717a;text-align:right;">${s.visitors.toLocaleString('en-US')} visitors · ${escapeHtml(s.topReferrers[0]?.label || 'Direct')}${s.revenueMinor > 0 ? ` · ${digestMoney(s.revenueMinor, s.currency)}` : ''}</td>
              </tr>`,
            )
            .join('')}
        </table>`
      : '';

  const compareLine = (() => {
    const parts: string[] = [];
    if (snapshot.deltas.vsLastWeekPct != null) {
      const w = snapshot.deltas.vsLastWeekPct;
      parts.push(`${Math.abs(w)}% ${w >= 0 ? 'above' : 'below'} your weekly average`);
    }
    if (snapshot.deltas.vsLastMonthPct != null) {
      const m = snapshot.deltas.vsLastMonthPct;
      parts.push(`${Math.abs(m)}% ${m >= 0 ? 'ahead of' : 'behind'} last month`);
    }
    return parts.length
      ? `<p style="font-size:13px;color:#71717a;margin:4px 0 0;text-align:center;">You're ${parts.join(' and ')}.</p>`
      : '';
  })();

  const html = `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;background:#f4f4f5;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(narrative.emailNarrative).slice(0, 120)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;">
  <tr><td style="padding:22px 28px 0;">
    <span style="font-size:17px;font-weight:800;color:${BRAND};letter-spacing:-.01em;">Conclick</span>
    <span style="font-size:12px;color:#a1a1aa;float:right;padding-top:5px;">${escapeHtml(snapshot.dateLabel)}</span>
  </td></tr>
  <tr><td style="padding:18px 28px 6px;">
    <h1 style="font-size:21px;line-height:1.25;font-weight:800;color:#18181b;margin:0 0 10px;">${escapeHtml(narrative.subject)}</h1>
    <p style="font-size:15px;line-height:1.6;color:#3f3f46;margin:0 0 18px;">${escapeHtml(narrative.emailNarrative)}</p>
    ${milestoneBanner}
    ${spikeBlock}
  </td></tr>
  <tr><td style="padding:0 22px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border:1px solid #efeff1;border-radius:12px;">
      <tr>
        ${statTile('Visitors', t.visitors.toLocaleString('en-US'), deltaChip(snapshot.deltas.vsYesterdayPct))}
        ${statTile('Pageviews', t.pageviews.toLocaleString('en-US'))}
        ${statTile('Revenue', t.revenueMinor > 0 ? digestMoney(t.revenueMinor, t.currency) : '—')}
      </tr>
    </table>
    ${compareLine}
  </td></tr>
  <tr><td style="padding:14px 28px 4px;">${perSite}</td></tr>
  <tr><td style="padding:8px 28px 26px;" align="center">
    <a href="${appUrl}/websites" style="display:inline-block;background:${BRAND};color:#fff;font-weight:700;font-size:15px;text-decoration:none;padding:13px 30px;border-radius:10px;">Open your dashboard →</a>
  </td></tr>
  <tr><td style="padding:18px 28px;border-top:1px solid #f1f1f4;">
    <p style="font-size:12px;color:#a1a1aa;margin:0;line-height:1.6;">
      Conclick — privacy-friendly analytics. You get this because daily summaries are on.<br/>
      <a href="${unsubscribeUrl}" style="color:#a1a1aa;">Unsubscribe</a> ·
      <a href="${appUrl}/account" style="color:#a1a1aa;">Notification settings</a>
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  return {
    subject: narrative.subject,
    html,
    text: buildDigestText(snapshot, narrative, unsubscribeUrl, appUrl),
  };
}

export async function sendHypeDailyDigest(
  email: string,
  snapshot: DigestSnapshot,
  narrative: Narrative,
  unsubscribeUrl: string,
) {
  const resend = resendClient();
  if (!resend) return undefined;
  const { subject, html, text } = renderHypeDigest(snapshot, narrative, unsubscribeUrl);
  return resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject,
    html,
    text,
    headers: {
      'List-Unsubscribe': `<${unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  });
}

// Plain-text alternative — a real text/plain part is one of the biggest
// inbox-placement levers, so it mirrors the HTML content faithfully.
export function buildDigestText(
  snapshot: DigestSnapshot,
  narrative: Narrative,
  unsubscribeUrl: string,
  appUrl: string,
): string {
  const t = snapshot.totals;
  const lines: string[] = [];
  lines.push(`Conclick — ${snapshot.dateLabel}`, '', narrative.subject, '', narrative.emailNarrative, '');

  for (const m of collectMilestones(snapshot)) {
    lines.push(`** Milestone: ${m.hit.siteName} crossed ${milestoneLabel(m.hit, m.ccy)}`);
  }
  for (const x of collectSpikes(snapshot)) {
    lines.push(
      x.s.kind === 'traffic'
        ? `** Spike: overall traffic on ${x.site} is ${x.s.multiple}x usual (${x.s.today} visitors)`
        : x.s.isNew
          ? `** Spike: new traffic from ${x.s.label} on ${x.site} (${x.s.today} visits)`
          : `** Spike: ${x.s.label} sent ${x.s.multiple}x usual to ${x.site} (${x.s.today} visits)`,
    );
  }
  if (collectMilestones(snapshot).length || collectSpikes(snapshot).length) lines.push('');

  const dyd = snapshot.deltas.vsYesterdayPct;
  lines.push(
    `Visitors: ${t.visitors.toLocaleString('en-US')}${dyd != null ? ` (${dyd >= 0 ? '+' : ''}${dyd}% vs yesterday)` : ''}`,
    `Pageviews: ${t.pageviews.toLocaleString('en-US')}`,
    `Revenue: ${t.revenueMinor > 0 ? digestMoney(t.revenueMinor, t.currency) : '—'}`,
  );
  if (snapshot.deltas.vsLastWeekPct != null)
    lines.push(`vs weekly average: ${snapshot.deltas.vsLastWeekPct >= 0 ? '+' : ''}${snapshot.deltas.vsLastWeekPct}%`);
  if (snapshot.deltas.vsLastMonthPct != null)
    lines.push(`vs last month: ${snapshot.deltas.vsLastMonthPct >= 0 ? '+' : ''}${snapshot.deltas.vsLastMonthPct}%`);

  if (snapshot.sites.length > 1) {
    lines.push('', 'By site:');
    for (const s of snapshot.sites.slice().sort((a, b) => b.visitors - a.visitors)) {
      lines.push(`  - ${s.name}: ${s.visitors.toLocaleString('en-US')} visitors, ${s.topReferrers[0]?.label || 'Direct'}${s.revenueMinor > 0 ? `, ${digestMoney(s.revenueMinor, s.currency)}` : ''}`);
    }
  }

  lines.push('', `Open your dashboard: ${appUrl}/websites`, '', `Unsubscribe: ${unsubscribeUrl}`);
  return lines.join('\n');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
