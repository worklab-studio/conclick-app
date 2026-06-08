'use client';
import { WebsiteProvider } from '@/app/(main)/websites/WebsiteProvider';
import { WebsiteSettings } from '@/app/(main)/websites/[websiteId]/settings/WebsiteSettings';
import { WebsiteSettingsHeader } from '@/app/(main)/websites/[websiteId]/settings/WebsiteSettingsHeader';

export function WebsiteSettingsPage({ websiteId }: { websiteId: string }) {
  return (
    <WebsiteProvider websiteId={websiteId}>
      <div className="mx-auto w-full px-3 md:px-6 py-8" style={{ maxWidth: '1320px' }}>
        <div className="space-y-6">
          <WebsiteSettingsHeader />
          <WebsiteSettings websiteId={websiteId} />
        </div>
      </div>
    </WebsiteProvider>
  );
}
