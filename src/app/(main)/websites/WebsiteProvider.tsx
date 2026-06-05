'use client';
import { createContext, ReactNode } from 'react';
import { Loading } from '@umami/react-zen';
import { Website } from '@/generated/prisma/client';
import { useWebsiteQuery } from '@/components/hooks/queries/useWebsiteQuery';

export const WebsiteContext = createContext<Website>(null);

export function WebsiteProvider({
  websiteId,
  children,
}: {
  websiteId: string;
  children: ReactNode;
}) {
  const { data: website, isLoading, error } = useWebsiteQuery(websiteId);

  // Only show the spinner while we genuinely have no data yet. Previously the
  // condition `isFetching && isLoading` was equivalent to just `isLoading`, so
  // refetches that briefly cleared data rendered null instead of the spinner.
  if (isLoading) {
    return <Loading placement="absolute" />;
  }

  if (error) {
    // Render an error state instead of silently returning null on 404/403/etc.
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Could not load this website.</p>
        <p style={{ opacity: 0.6, fontSize: '0.875rem' }}>
          {(error as any)?.message ?? 'Unknown error'}
        </p>
      </div>
    );
  }

  if (!website) {
    return null;
  }

  return <WebsiteContext.Provider value={website}>{children}</WebsiteContext.Provider>;
}
