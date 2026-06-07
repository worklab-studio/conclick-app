'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MetricsTable } from '@/components/metrics/MetricsTable';

export interface MetricPanelTab {
  value: string;
  label: string;
  type: string;
}

/**
 * A fixed-height analytics panel: a header, segmented tabs, and a scrollable
 * metrics list with a "More" action pinned to the bottom (opens a scrollable
 * modal with the full list). Every panel is the same height so the dashboard
 * grid stays even regardless of how much data each one has.
 */
export function MetricPanel({
  title,
  websiteId,
  tabs,
}: {
  title: string;
  websiteId: string;
  tabs: MetricPanelTab[];
}) {
  return (
    <Card className="flex h-[400px] flex-col dark:border-[hsl(0,0%,12%)] dark:bg-[hsl(0,0%,8%)]">
      <CardHeader className="shrink-0 pb-2">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col">
        <Tabs defaultValue={tabs[0]?.value} className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mb-4 w-fit shrink-0 rounded-lg border border-white/5 bg-zinc-900/50 p-1">
            {tabs.map(t => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map(t => (
            <TabsContent key={t.value} value={t.value} className="mt-0 min-h-0 flex-1 outline-none">
              <MetricsTable
                websiteId={websiteId}
                type={t.type}
                title={title}
                limit={10}
                showMore
                fill
              />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
