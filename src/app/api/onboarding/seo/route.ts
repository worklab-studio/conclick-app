import { NextRequest, NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import { fetchSeoSnapshot } from '@/lib/seo-enrich';

/**
 * SEO enrichment, fetched on its own.
 *
 * It used to run inside /onboarding/analyze via Promise.all, which meant it
 * competed for the same few seconds as reading the site. On a slow run the
 * lookup lost the race, returned null, and the panel silently disappeared, so
 * the same domain could show stats one moment and nothing the next. Splitting
 * it out lets the analysis paint immediately and the panel fill in when it is
 * ready, which is both faster and consistent.
 */
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request);
  if (!auth?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const domain = new URL(request.url).searchParams.get('domain') || '';
  const seo = await fetchSeoSnapshot(domain).catch(() => null);

  return NextResponse.json({ seo });
}
