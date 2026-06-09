'use client';
import dynamic from 'next/dynamic';
import { WebsiteProvider } from '@/app/(main)/websites/WebsiteProvider';
import { WebsitePage } from '@/app/(main)/websites/[websiteId]/WebsitePage';
import { useShareTokenQuery } from '@/components/hooks';
import { Header } from './Header';
import { Footer } from './Footer';

// Lazy-load the immersive live globe (maplibre) only when the /live view is
// requested, so the normal share dashboard doesn't carry its bundle and SSR
// never touches `window`.
const LiveVisitorsPage = dynamic(
  () =>
    import('@/app/(main)/websites/[websiteId]/live/LiveVisitorsPage').then(m => m.LiveVisitorsPage),
  { ssr: false },
);

export function SharePage({ shareId, live }: { shareId: string; live?: boolean }) {
  const { shareToken, isLoading } = useShareTokenQuery(shareId);

  if (isLoading || !shareToken) {
    return null;
  }

  // Live globe — full-screen immersive view (opens in its own tab), no chrome.
  if (live) {
    return (
      <WebsiteProvider websiteId={shareToken.websiteId}>
        <LiveVisitorsPage websiteId={shareToken.websiteId} />
      </WebsiteProvider>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <WebsiteProvider websiteId={shareToken.websiteId}>
        <WebsitePage websiteId={shareToken.websiteId} shareMode />
      </WebsiteProvider>
      <Footer />
    </div>
  );
}
