'use client';
import { WebsiteSettingsPage } from '@/app/(main)/account/websites/[websiteId]/WebsiteSettingsPage';

export function SettingsPage({ websiteId }: { websiteId: string }) {
  return <WebsiteSettingsPage websiteId={websiteId} />;
}
