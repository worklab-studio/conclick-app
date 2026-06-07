'use client';

import { useEffect, useMemo } from 'react';
import { useMessages, useWebsiteMetricsQuery } from '@/components/hooks';
import { MetricLabel } from '@/components/metrics/MetricLabel';
import { percentFilter } from '@/lib/filters';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Inbox, Maximize2 } from 'lucide-react';
import { formatLongNumber } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface MetricsTableProps {
  websiteId: string;
  type: string;
  title?: string;
  metric?: string;
  dataFilter?: (data: any) => any;
  limit?: number;
  showMore?: boolean;
  filterLink?: boolean;
  /** Fill the parent's height with a scrollable row area + a pinned "More". */
  fill?: boolean;
  params?: Record<string, any>;
  onDataLoad?: (data: any) => void;
  className?: string;
  data?: any; // Allow injecting data directly
}

export function MetricsTable({
  websiteId,
  type,
  title,
  dataFilter,
  limit,
  showMore = false,
  filterLink = true,
  fill = false,
  params,
  onDataLoad,
  className,
  data: injectedData,
}: MetricsTableProps) {
  const { formatMessage, labels } = useMessages();
  const {
    data: fetchedData,
    isLoading,
    error,
  } = useWebsiteMetricsQuery(
    websiteId,
    {
      type,
      limit,
      ...params,
    },
    { enabled: !injectedData },
  );

  const data = injectedData || fetchedData;

  const filteredData = useMemo(() => {
    if (data) {
      let items = data as any[];

      if (dataFilter) {
        if (Array.isArray(dataFilter)) {
          items = dataFilter.reduce((arr, filter) => {
            return filter(arr);
          }, items);
        } else {
          items = dataFilter(items);
        }
      }

      items = percentFilter(items);

      return items
        .sort((a, b) => b.y - a.y)
        .map(({ x, y, z, ...props }) => ({ label: x, count: y, percent: z, ...props }));
    }
    return [];
  }, [data, dataFilter, limit, type]);

  useEffect(() => {
    if (data) {
      onDataLoad?.(data);
    }
  }, [data]);

  if (isLoading && !injectedData) {
    return (
      <div className={cn('space-y-2', fill && 'h-full')}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  if (error && !injectedData) {
    return <div className="text-red-500">Error loading data</div>;
  }

  if (!data || filteredData.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-2 py-10 text-center text-zinc-500',
          fill && 'h-full',
        )}
      >
        <Inbox className="h-6 w-6 opacity-40" />
        <span className="text-sm">No data yet</span>
      </div>
    );
  }

  const rows = filteredData.map((row, index) => (
    <div
      key={index}
      className="group relative flex items-center justify-between overflow-hidden rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted/50"
    >
      <div
        className="absolute left-0 top-0 z-0 h-full rounded-md transition-all duration-500 ease-out"
        style={{ width: `${row.percent}%`, backgroundColor: '#5e5ba4', opacity: 0.15 }}
      />
      <div className="relative z-10 flex flex-1 items-center gap-2 truncate">
        <div className="truncate" title={row.label}>
          {filterLink ? (
            <MetricLabel type={type} data={row} />
          ) : (
            <span className="text-foreground">{row.label}</span>
          )}
        </div>
      </div>
      <div className="relative z-10 flex items-center gap-4">
        <div className="w-16 text-right font-medium">{formatLongNumber(row.count)}</div>
        <div className="w-12 text-right text-xs text-muted-foreground">
          {Math.round(row.percent)}%
        </div>
      </div>
    </div>
  ));

  const moreButton = showMore && (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
          <Maximize2 className="mr-2 h-3 w-3" />
          {formatMessage(labels.more)}
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[80vh] flex-col sm:max-w-lg dark:border-[hsl(0,0%,12%)] dark:bg-[hsl(0,0%,8%)]">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-foreground">
            {title || formatMessage(labels.more)}
          </DialogTitle>
        </DialogHeader>
        <div className="-mr-2 min-h-0 flex-1 overflow-y-auto pr-2">
          <MetricsTable
            websiteId={websiteId}
            type={type}
            title={title}
            limit={1000}
            filterLink={filterLink}
            params={params}
          />
        </div>
      </DialogContent>
    </Dialog>
  );

  // Fixed-height parent: scrollable rows + pinned "More".
  if (fill) {
    return (
      <div className={cn('flex h-full flex-col', className)}>
        <div className="-mr-1 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">{rows}</div>
        {moreButton && (
          <div className="mt-auto flex shrink-0 justify-center border-t border-[hsl(0,0%,12%)] pt-3">
            {moreButton}
          </div>
        )}
      </div>
    );
  }

  // Inline / modal: natural height (parent handles any scrolling).
  return (
    <div className={cn('space-y-1', className)}>
      {rows}
      {moreButton && <div className="flex justify-center pt-2">{moreButton}</div>}
    </div>
  );
}
