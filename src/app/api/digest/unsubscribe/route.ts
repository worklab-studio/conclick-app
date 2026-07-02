import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyUnsubToken } from '@/lib/digest/unsub';

// Public, login-free unsubscribe for the daily digest.
//   GET  — human clicks the email footer link → confirmation page (HTML)
//   POST — RFC 8058 one-click (List-Unsubscribe-Post) → 200, no body needed
// Both verify the keyed token, flip dailyDigestEnabled=false, and are
// idempotent (updateMany is a no-op if already off / user gone).

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function unsubscribe(userId: string, token: string | null): Promise<boolean> {
  // The token is the gate — it can't be forged without APP_SECRET, so a valid
  // token means a legitimate request. Only touch the DB for real UUID ids
  // (the preview sentinel isn't a UUID and would otherwise 500 against the
  // uuid column). Wrap defensively so this public endpoint never 500s.
  if (!verifyUnsubToken(userId, token)) return false;
  if (UUID_RE.test(userId)) {
    try {
      await prisma.client.user.updateMany({
        where: { id: userId, deletedAt: null },
        data: { dailyDigestEnabled: false },
      });
    } catch {
      // idempotent best-effort; a one-click POST still returns 2xx
    }
  }
  return true;
}

function page(title: string, body: string, status = 200) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="robots" content="noindex"/>
<title>${title}</title></head>
<body style="margin:0;background:#0a0a0a;color:#e5e5e5;font-family:system-ui,-apple-system,sans-serif">
<div style="max-width:440px;margin:14vh auto;padding:40px 28px;background:#111;border:1px solid #222;border-radius:16px;text-align:center">
<div style="font-size:22px;font-weight:700;color:#fff;margin-bottom:12px">${title}</div>
<p style="font-size:15px;line-height:1.6;color:#a3a3a3;margin:0 0 24px">${body}</p>
<a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.conclick.io'}/account"
   style="display:inline-block;background:#5e5ba4;color:#fff;font-weight:600;text-decoration:none;padding:11px 22px;border-radius:9px">
Manage notification settings</a>
</div></body></html>`;
  return new NextResponse(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ok = await unsubscribe(searchParams.get('u') || '', searchParams.get('t'));
  return ok
    ? page("You're unsubscribed", 'You will no longer receive the Conclick daily summary. You can turn it back on anytime from your account settings.')
    : page('Invalid link', 'This unsubscribe link is no longer valid. Open your account settings to manage email preferences.', 400);
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ok = await unsubscribe(searchParams.get('u') || '', searchParams.get('t'));
  return new NextResponse(ok ? 'Unsubscribed' : 'Invalid', {
    status: ok ? 200 : 400,
    headers: { 'Content-Type': 'text/plain' },
  });
}
