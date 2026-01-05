'use client';
import { firstBy } from 'thenby';
import { PageBody } from '@/components/common/PageBody';
import { Card, CardContent } from '@/components/ui/card';
import { RealtimeChart } from '@/components/metrics/RealtimeChart';
import { WorldMap } from '@/components/metrics/WorldMap';
import { useMobile, useRealtimeQuery } from '@/components/hooks';
import { RealtimeLog } from './RealtimeLog';
import { RealtimeHeader } from './RealtimeHeader';
import { RealtimePaths } from './RealtimePaths';
import { RealtimeReferrers } from './RealtimeReferrers';
import { RealtimeCountries } from './RealtimeCountries';
import { percentFilter } from '@/lib/filters';

const DEMO_WEBSITE_ID = '1be0acac-4fc3-4dc1-a4d2-02e6a2aae843';

// Mock countries data for demo account
const DEMO_COUNTRIES_DATA = {
  'US': 145,
  'GB': 87,
  'DE': 63,
  'FR': 52,
  'IN': 48,
  'CA': 41,
  'AU': 38,
  'JP': 29,
  'BR': 24,
  'NL': 18,
};

export function RealtimePage({ websiteId }: { websiteId: string }) {
  const { data, isLoading, error } = useRealtimeQuery(websiteId);
  const { isMobile } = useMobile();
  const isDemo = websiteId === DEMO_WEBSITE_ID;

  if (isLoading || error) {
    return <PageBody isLoading={isLoading} error={error} />;
  }

  // Use demo data if demo account
  const countriesData = isDemo ? DEMO_COUNTRIES_DATA : data.countries;

  const countries = percentFilter(
    Object.keys(countriesData)
      .map(key => ({ x: key, y: countriesData[key] }))
      .sort(firstBy('y', -1)),
  );

  // For demo, also enhance the data object for other components
  const displayData = isDemo ? {
    ...data,
    countries: DEMO_COUNTRIES_DATA,
    totals: {
      ...data.totals,
      visitors: data.totals?.visitors || 269,
    },
  } : data;

  return (
    <div className="space-y-6 dark bg-[hsl(0,0%,8%)] min-h-screen p-6 text-foreground">
      <RealtimeHeader data={displayData} />

      <Card className="bg-[hsl(0,0%,8%)] border-[hsl(0,0%,12%)]">
        <CardContent className="pt-6">
          <RealtimeChart data={displayData} unit="minute" />
        </CardContent>
      </Card>

      <Card className="bg-[hsl(0,0%,8%)] border-[hsl(0,0%,12%)]">
        <CardContent className="pt-6">
          <RealtimeLog data={displayData} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-[hsl(0,0%,8%)] border-[hsl(0,0%,12%)]">
          <CardContent className="pt-6">
            <RealtimePaths data={displayData} />
          </CardContent>
        </Card>
        <Card className="bg-[hsl(0,0%,8%)] border-[hsl(0,0%,12%)]">
          <CardContent className="pt-6">
            <RealtimeReferrers data={displayData} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-[hsl(0,0%,8%)] border-[hsl(0,0%,12%)]">
          <CardContent className="pt-6">
            <RealtimeCountries data={countries} />
          </CardContent>
        </Card>
        <Card className="md:col-span-2 bg-[hsl(0,0%,8%)] border-[hsl(0,0%,12%)]">
          <CardContent className="pt-6">
            <WorldMap data={countries} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
