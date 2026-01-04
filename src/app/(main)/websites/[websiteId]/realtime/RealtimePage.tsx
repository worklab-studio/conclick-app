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

export function RealtimePage({ websiteId }: { websiteId: string }) {
  const { data, isLoading, error } = useRealtimeQuery(websiteId);
  const { isMobile } = useMobile();

  if (isLoading || error) {
    return <PageBody isLoading={isLoading} error={error} />;
  }

  const countries = percentFilter(
    Object.keys(data.countries)
      .map(key => ({ x: key, y: data.countries[key] }))
      .sort(firstBy('y', -1)),
  );

  return (
    <div className="space-y-6 dark bg-[hsl(0,0%,8%)] min-h-screen p-6 text-foreground">
      <RealtimeHeader data={data} />

      <Card className="bg-[hsl(0,0%,8%)] border-[hsl(0,0%,12%)]">
        <CardContent className="pt-6">
          <RealtimeChart data={data} unit="minute" />
        </CardContent>
      </Card>

      <Card className="bg-[hsl(0,0%,8%)] border-[hsl(0,0%,12%)]">
        <CardContent className="pt-6">
          <RealtimeLog data={data} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-[hsl(0,0%,8%)] border-[hsl(0,0%,12%)]">
          <CardContent className="pt-6">
            <RealtimePaths data={data} />
          </CardContent>
        </Card>
        <Card className="bg-[hsl(0,0%,8%)] border-[hsl(0,0%,12%)]">
          <CardContent className="pt-6">
            <RealtimeReferrers data={data} />
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
