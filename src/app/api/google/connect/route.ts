import { NextRequest, NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import { canUpdateWebsite } from '@/permissions';
import { buildAuthUrl, googleConfigured, signState } from '@/lib/google';

// Kicks off the Google consent flow for a website. The signed state carries the
// websiteId through the round-trip (CSRF-proof, 15-minute window).
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request);
  if (!auth?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!googleConfigured()) {
    return NextResponse.json(
      { error: 'Google OAuth is not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).' },
      { status: 500 },
    );
  }

  const websiteId = new URL(request.url).searchParams.get('websiteId');
  if (!websiteId) return NextResponse.json({ error: 'Missing websiteId' }, { status: 400 });

  if (!(await canUpdateWebsite(auth, websiteId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.redirect(buildAuthUrl(signState(websiteId, auth.user.id)));
}
