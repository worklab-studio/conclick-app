import { NextRequest, NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import { buildSlackAuthUrl, getSlackConfig, signState, slackConfigured } from '@/lib/slack';

// Kicks off "Add to Slack". The signed, user-bound state rides the round-trip.
export async function GET(request: NextRequest) {
  const { appUrl } = getSlackConfig();

  const auth = await checkAuth(request);
  if (!auth?.user) return NextResponse.redirect(`${appUrl}/login`);

  if (!slackConfigured()) {
    return NextResponse.redirect(`${appUrl}/account?tab=integrations&slack=not-configured`);
  }

  return NextResponse.redirect(buildSlackAuthUrl(signState(auth.user.id)));
}
