import { useWebsite, useMessages } from '@/components/hooks';
import { WebsiteShareForm } from './WebsiteShareForm';
import { WebsiteTrackingCode } from './WebsiteTrackingCode';
import { WebsiteData } from './WebsiteData';
import { WebsiteEditForm } from './WebsiteEditForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function WebsiteSettings({ websiteId }: { websiteId: string; openExternal?: boolean }) {
  const website = useWebsite();
  const { formatMessage, labels } = useMessages();

  return (
    <div className="space-y-6">
      <Card className="dark:bg-[hsl(0,0%,8%)] dark:border-[hsl(0,0%,12%)]">
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <WebsiteEditForm websiteId={websiteId} />
        </CardContent>
      </Card>

      <Card className="dark:bg-[hsl(0,0%,8%)] dark:border-[hsl(0,0%,12%)]">
        <CardHeader>
          <CardTitle>Tracking Code</CardTitle>
        </CardHeader>
        <CardContent>
          <WebsiteTrackingCode websiteId={websiteId} />
        </CardContent>
      </Card>

      <Card className="dark:bg-[hsl(0,0%,8%)] dark:border-[hsl(0,0%,12%)]">
        <CardHeader>
          <CardTitle>Share URL</CardTitle>
        </CardHeader>
        <CardContent>
          <WebsiteShareForm websiteId={websiteId} shareId={website.shareId} />
        </CardContent>
      </Card>

      <Card className="border-red-200 dark:border-red-900/30 dark:bg-[hsl(0,0%,8%)]">
        <CardHeader>
          <CardTitle className="text-red-600">Data</CardTitle>
        </CardHeader>
        <CardContent>
          <WebsiteData websiteId={websiteId} />
        </CardContent>
      </Card>
    </div>
  );
}
