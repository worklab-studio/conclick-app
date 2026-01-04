'use client';

import { useMessages, useNavigation } from '@/components/hooks';
import { EventsChart } from '@/components/metrics/EventsChart';
import { MetricsTable } from '@/components/metrics/MetricsTable';
import { WeeklyTraffic } from '@/components/metrics/WeeklyTraffic';
import { WorldMap } from '@/components/metrics/WorldMap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function WebsitePanels({ websiteId }: { websiteId: string }) {
  const { formatMessage, labels } = useMessages();
  const { pathname } = useNavigation();

  const tableProps = {
    websiteId,
    limit: 10,
    allowDownload: false,
    showMore: true,
    metric: formatMessage(labels.visitors),
  };

  const isSharePage = pathname.includes('/share/');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="dark:bg-[hsl(0,0%,8%)] dark:border-[hsl(0,0%,12%)]">
        <CardHeader className="pb-2">
          <CardTitle>{formatMessage(labels.pages)}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="path">
            <TabsList className="mb-4 w-fit bg-zinc-900/50 border border-white/5 p-1 rounded-lg">
              <TabsTrigger value="path" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100">{formatMessage(labels.path)}</TabsTrigger>
              <TabsTrigger value="entry" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100">{formatMessage(labels.entry)}</TabsTrigger>
              <TabsTrigger value="exit" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100">{formatMessage(labels.exit)}</TabsTrigger>
            </TabsList>
            <TabsContent value="path">
              <MetricsTable type="path" title={formatMessage(labels.path)} {...tableProps} />
            </TabsContent>
            <TabsContent value="entry">
              <MetricsTable type="entry" title={formatMessage(labels.path)} {...tableProps} />
            </TabsContent>
            <TabsContent value="exit">
              <MetricsTable type="exit" title={formatMessage(labels.path)} {...tableProps} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="dark:bg-[hsl(0,0%,8%)] dark:border-[hsl(0,0%,12%)]">
        <CardHeader className="pb-2">
          <CardTitle>{formatMessage(labels.sources)}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="referrer">
            <TabsList className="mb-4 w-fit bg-zinc-900/50 border border-white/5 p-1 rounded-lg">
              <TabsTrigger value="referrer" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100">{formatMessage(labels.referrers)}</TabsTrigger>
              <TabsTrigger value="channel" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100">{formatMessage(labels.channels)}</TabsTrigger>
            </TabsList>
            <TabsContent value="referrer">
              <MetricsTable
                type="referrer"
                title={formatMessage(labels.referrer)}
                {...tableProps}
              />
            </TabsContent>
            <TabsContent value="channel">
              <MetricsTable type="channel" title={formatMessage(labels.channel)} {...tableProps} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="dark:bg-[hsl(0,0%,8%)] dark:border-[hsl(0,0%,12%)]">
        <CardHeader className="pb-2">
          <CardTitle>{formatMessage(labels.environment)}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="browser">
            <TabsList className="mb-4 w-fit bg-zinc-900/50 border border-white/5 p-1 rounded-lg">
              <TabsTrigger value="browser" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100">{formatMessage(labels.browsers)}</TabsTrigger>
              <TabsTrigger value="os" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100">{formatMessage(labels.os)}</TabsTrigger>
              <TabsTrigger value="device" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100">{formatMessage(labels.devices)}</TabsTrigger>
            </TabsList>
            <TabsContent value="browser">
              <MetricsTable type="browser" title={formatMessage(labels.browser)} {...tableProps} />
            </TabsContent>
            <TabsContent value="os">
              <MetricsTable type="os" title={formatMessage(labels.os)} {...tableProps} />
            </TabsContent>
            <TabsContent value="device">
              <MetricsTable type="device" title={formatMessage(labels.device)} {...tableProps} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="dark:bg-[hsl(0,0%,8%)] dark:border-[hsl(0,0%,12%)]">
        <CardHeader className="pb-2">
          <CardTitle>{formatMessage(labels.location)}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="country">
            <TabsList className="mb-4 w-fit bg-zinc-900/50 border border-white/5 p-1 rounded-lg">
              <TabsTrigger value="country" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100">{formatMessage(labels.countries)}</TabsTrigger>
              <TabsTrigger value="region" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100">{formatMessage(labels.regions)}</TabsTrigger>
              <TabsTrigger value="city" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100">{formatMessage(labels.cities)}</TabsTrigger>
            </TabsList>
            <TabsContent value="country">
              <MetricsTable type="country" title={formatMessage(labels.country)} {...tableProps} />
            </TabsContent>
            <TabsContent value="region">
              <MetricsTable type="region" title={formatMessage(labels.region)} {...tableProps} />
            </TabsContent>
            <TabsContent value="city">
              <MetricsTable type="city" title={formatMessage(labels.city)} {...tableProps} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="flex flex-col h-full dark:bg-[hsl(0,0%,8%)] dark:border-[hsl(0,0%,12%)]">
        <CardHeader className="pb-2">
          <CardTitle>{formatMessage(labels.map)}</CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex-1 flex items-center justify-center">
          <WorldMap websiteId={websiteId} />
        </CardContent>
      </Card>

      <Card className="dark:bg-[hsl(0,0%,8%)] dark:border-[hsl(0,0%,12%)]">
        <CardHeader>
          <CardTitle>{formatMessage(labels.traffic)}</CardTitle>
        </CardHeader>
        <CardContent>
          <WeeklyTraffic websiteId={websiteId} />
        </CardContent>
      </Card>

      {isSharePage && (
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="dark:bg-[hsl(0,0%,8%)] dark:border-[hsl(0,0%,12%)]">
            <CardHeader>
              <CardTitle>{formatMessage(labels.events)}</CardTitle>
            </CardHeader>
            <CardContent>
              <MetricsTable
                websiteId={websiteId}
                type="event"
                title={formatMessage(labels.event)}
                metric={formatMessage(labels.count)}
                limit={15}
                filterLink={false}
              />
            </CardContent>
          </Card>
          <Card className="md:col-span-2 dark:bg-[hsl(0,0%,8%)] dark:border-[hsl(0,0%,12%)]">
            <CardContent>
              <EventsChart websiteId={websiteId} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
