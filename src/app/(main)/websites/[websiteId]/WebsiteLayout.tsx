'use client';
import { ReactNode } from 'react';
import { WebsiteProvider } from '@/app/(main)/websites/WebsiteProvider';
import { WebsiteTabs } from './WebsiteTabs';

export function WebsiteLayout({ websiteId, children }: { websiteId: string; children: ReactNode }) {
  return (
    <WebsiteProvider websiteId={websiteId}>
      <WebsiteTabs websiteId={websiteId} />
      {children}
    </WebsiteProvider>
  );
}
