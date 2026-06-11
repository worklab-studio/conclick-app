/* eslint-disable no-console */
import { NextRequest, NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import { exchangeCode, getGoogleConfig, saveConnection, verifyState } from '@/lib/google';

// Google consent round-trip lands here as a top-level browser navigation, so the
// session cookie is present: the caller must BE the signed-in user the state was
// minted for (in /connect, behind canUpdateWebsite). HMAC + user-binding + the
// 15-minute window make the state unforgeable and non-transferable.
export async function GET(request: NextRequest) {
  const { appUrl } = getGoogleConfig();
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state') || '';

  const auth = await checkAuth(request);
  if (!auth?.user) {
    return NextResponse.redirect(`${appUrl}/login`);
  }

  const websiteId = verifyState(state, auth.user.id);
  if (!websiteId) {
    return NextResponse.redirect(`${appUrl}/websites?google=invalid-state`);
  }

  const settingsUrl = `${appUrl}/websites/${websiteId}/settings`;

  if (!code) {
    // User cancelled the consent screen.
    return NextResponse.redirect(`${settingsUrl}?google=cancelled`);
  }

  try {
    const tokens = await exchangeCode(code);

    // Best-effort email for the "connected as" label.
    let email: string | null = null;
    try {
      const info = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
        signal: AbortSignal.timeout(8000),
      }).then(r => (r.ok ? r.json() : null));
      email = info?.email ?? null;
    } catch {
      /* label only */
    }

    await saveConnection(websiteId, tokens, email);
    return NextResponse.redirect(`${settingsUrl}?google=connected`);
  } catch (e: any) {
    console.error('Google callback failed:', e?.message ?? e);
    return NextResponse.redirect(`${settingsUrl}?google=error`);
  }
}
