'use client';

import { useMessages, useNavigation } from '@/components/hooks';
import { EventsChart } from '@/components/metrics/EventsChart';
import { MetricsTable } from '@/components/metrics/MetricsTable';
import { WeeklyTraffic } from '@/components/metrics/WeeklyTraffic';
import { WorldMap } from '@/components/metrics/WorldMap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LazyMount } from '@/components/common/LazyMount';
import { MetricPanel } from './MetricPanel';

export function WebsitePanels({ websiteId }: { websiteId: string }) {
  const { formatMessage, labels } = useMessages();
  const { pathname } = useNavigation();
  const isSharePage = pathname.includes('/share/');

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <MetricPanel
        title={formatMessage(labels.pages)}
        websiteId={websiteId}
        tabs={[
          { value: 'path', label: formatMessage(labels.path), type: 'path' },
          { value: 'entry', label: formatMessage(labels.entry), type: 'entry' },
          { value: 'exit', label: formatMessage(labels.exit), type: 'exit' },
        ]}
      />

      <MetricPanel
        title={formatMessage(labels.sources)}
        websiteId={websiteId}
        tabs={[
          { value: 'referrer', label: formatMessage(labels.referrers), type: 'referrer' },
          { value: 'channel', label: formatMessage(labels.channels), type: 'channel' },
        ]}
      />

      <MetricPanel
        title={formatMessage(labels.environment)}
        websiteId={websiteId}
        tabs={[
          { value: 'browser', label: formatMessage(labels.browsers), type: 'browser' },
          { value: 'os', label: formatMessage(labels.os), type: 'os' },
          { value: 'device', label: formatMessage(labels.devices), type: 'device' },
        ]}
      />

      <MetricPanel
        title={formatMessage(labels.location)}
        websiteId={websiteId}
        tabs={[
          { value: 'country', label: formatMessage(labels.countries), type: 'country' },
          { value: 'region', label: formatMessage(labels.regions), type: 'region' },
          { value: 'city', label: formatMessage(labels.cities), type: 'city' },
        ]}
      />

      <LazyMount minHeight={600} className="h-full">
        <Card className="flex h-full min-h-[600px] flex-col dark:border-[hsl(0,0%,12%)] dark:bg-[hsl(0,0%,8%)]">
          <CardHeader className="shrink-0 pb-2">
            <CardTitle>{formatMessage(labels.map)}</CardTitle>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 items-center justify-center p-0">
            <WorldMap websiteId={websiteId} />
          </CardContent>
        </Card>
      </LazyMount>

      <LazyMount minHeight={600}>
        <Card className="flex min-h-[600px] flex-col dark:border-[hsl(0,0%,12%)] dark:bg-[hsl(0,0%,8%)]">
          <CardHeader className="shrink-0">
            <CardTitle>{formatMessage(labels.traffic)}</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <WeeklyTraffic websiteId={websiteId} />
          </CardContent>
        </Card>
      </LazyMount>

      {isSharePage && (
        <div className="grid grid-cols-1 gap-4 md:col-span-2 md:grid-cols-3">
          <Card className="flex h-[400px] flex-col dark:border-[hsl(0,0%,12%)] dark:bg-[hsl(0,0%,8%)]">
            <CardHeader className="shrink-0">
              <CardTitle>{formatMessage(labels.events)}</CardTitle>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-y-auto">
              <MetricsTable
                websiteId={websiteId}
                type="event"
                title={formatMessage(labels.event)}
                limit={15}
                filterLink={false}
              />
            </CardContent>
          </Card>
          <Card className="dark:border-[hsl(0,0%,12%)] dark:bg-[hsl(0,0%,8%)] md:col-span-2">
            <CardContent>
              <EventsChart websiteId={websiteId} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
