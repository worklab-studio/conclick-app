import { useWebsite } from '@/components/hooks';
import { WebsiteShareForm } from './WebsiteShareForm';
import { WebsiteTrackingCode } from './WebsiteTrackingCode';
import { WebsiteData } from './WebsiteData';
import { WebsiteEditForm } from './WebsiteEditForm';
import { RevenueIntegrationForm } from './RevenueIntegrationForm';
import { GoogleIntegrationForm } from './GoogleIntegrationForm';
import { WebsiteAutocaptureForm } from './WebsiteAutocaptureForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function WebsiteSettings({ websiteId }: { websiteId: string; openExternal?: boolean }) {
  const website = useWebsite();

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
          <CardTitle>Autocapture</CardTitle>
        </CardHeader>
        <CardContent>
          <WebsiteAutocaptureForm websiteId={websiteId} />
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

      <Card
        id="revenue-integration"
        className="scroll-mt-20 dark:border-[hsl(0,0%,12%)] dark:bg-[hsl(0,0%,8%)]"
      >
        <CardHeader>
          <CardTitle>Revenue Integration</CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueIntegrationForm websiteId={websiteId} />
        </CardContent>
      </Card>

      <Card id="google" className="scroll-mt-20 dark:border-[hsl(0,0%,12%)] dark:bg-[hsl(0,0%,8%)]">
        <CardHeader>
          <CardTitle>Google, Search Console &amp; Analytics import</CardTitle>
        </CardHeader>
        <CardContent>
          <GoogleIntegrationForm websiteId={websiteId} />
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
