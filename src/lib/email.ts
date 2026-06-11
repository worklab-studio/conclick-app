import { Resend } from 'resend';
import { formatMinorCurrency } from '@/lib/format';

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
        <div style="font-weight:600;color:#18181b;margin-bottom:10px;">${s.name}</div>
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
