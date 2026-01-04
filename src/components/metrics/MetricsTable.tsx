'use client';

import { useEffect, useMemo } from 'react';
import { useMessages, useNavigation, useWebsiteMetricsQuery } from '@/components/hooks';
import { MetricLabel } from '@/components/metrics/MetricLabel';
import { percentFilter } from '@/lib/filters';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, Maximize2 } from 'lucide-react';
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
  params?: Record<string, any>;
  onDataLoad?: (data: any) => void;
  className?: string;
  data?: any; // Allow injecting data directly
}

export function MetricsTable({
  websiteId,
  type,
  title,
  metric,
  dataFilter,
  limit,
  showMore = false,
  filterLink = true,
  params,
  onDataLoad,
  className,
  data: injectedData,
}: MetricsTableProps) {
  const { updateParams } = useNavigation();
  const { formatMessage, labels } = useMessages();
  const { data: fetchedData, isLoading, error } = useWebsiteMetricsQuery(websiteId, {
    type,
    limit,
    ...params,
  }, { enabled: !injectedData });

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
      <div className="space-y-2">
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
    return <div className="text-center text-zinc-500 py-8">No data available</div>;
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-1">
        {filteredData.map((row, index) => (
          <div key={index} className="group relative flex items-center justify-between py-2 px-2 hover:bg-muted/50 rounded-md transition-colors text-sm overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full z-0 transition-all duration-500 ease-out rounded-md"
              style={{ width: `${row.percent}%`, backgroundColor: '#5e5ba4', opacity: 0.15 }}
            />
            <div className="relative z-10 flex items-center gap-2 truncate flex-1">
              <div className="truncate" title={row.label}>
                {filterLink ? <MetricLabel type={type} data={row} /> : <span className="text-foreground">{row.label}</span>}
              </div>
            </div>

            <div className="relative z-10 flex items-center gap-4">
              <div className="font-medium w-16 text-right">
                {formatLongNumber(row.count)}
              </div>
              <div className="w-12 text-right text-muted-foreground text-xs">
                {Math.round(row.percent)}%
              </div>
            </div>
          </div>
        ))}
      </div>

      {showMore && limit && (
        <div className="flex justify-center pt-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => updateParams({ view: type })}
          >
            <Maximize2 className="mr-2 h-3 w-3" />
            {formatMessage(labels.more)}
          </Button>
        </div>
      )}
    </div>
  );
}
