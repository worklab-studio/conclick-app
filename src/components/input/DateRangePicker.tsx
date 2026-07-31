'use client';

import * as React from 'react';
import { CalendarIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useNavigation, useDateRangeQuery } from '@/components/hooks';
import { getDateRangeValue } from '@/lib/date';

// The date range lives in the URL query, shared by the whole dashboard.
// parseDateRange expects {num}{unit} (hour|day|week|month|year); "All time" becomes
// a concrete range:<first-data>:<now>:all from the website's real data span.
const RANGES = [
  { label: 'Today', value: '0day' },
  { label: 'Yesterday', value: '1day' },
  { label: 'Last 24 hours', value: '24hour' },
  { label: 'Last 7 days', value: '7day' },
  { label: 'Last 30 days', value: '30day' },
  { label: 'Last 90 days', value: '90day' },
  { label: 'Last 12 months', value: '12month' },
  { label: 'Week to date', value: '0week' },
  { label: 'Month to date', value: '0month' },
  { label: 'Year to date', value: '0year' },
  { label: 'All time', value: 'all' },
];

export function DateRangePicker({ websiteId }: { websiteId?: string }) {
  const { router, updateParams, query } = useNavigation();
  // The website's actual first/last data dates — "All time" starts where data starts.
  const websiteDateRange = useDateRangeQuery(websiteId);

  const urlDate = (query.date as string) || '24hour';
  const selected = urlDate.endsWith(':all') ? 'all' : urlDate;

  const handleValueChange = (value: string) => {
    if (value === 'all') {
      const { startDate, endDate } = websiteDateRange;
      const date =
        startDate && endDate ? `${getDateRangeValue(startDate, endDate ?? new Date())}:all` : 'all'; // data span not loaded yet, parseDateRange falls back safely
      router.push(updateParams({ date, offset: undefined }), { scroll: false });
    } else {
      router.push(updateParams({ date: value, offset: undefined }), { scroll: false });
    }
  };

  const currentLabel = RANGES.find(r => r.value === selected)?.label || 'Last 24 hours';

  return (
    <Select value={selected} onValueChange={handleValueChange}>
      <SelectTrigger className="w-[180px] border dark:border-[hsl(0,0%,12%)] bg-background dark:bg-[hsl(0,0%,9%)] hover:bg-accent/50 transition-colors text-foreground">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder="Select date range">{currentLabel}</SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent className="dark:bg-[hsl(0,0%,8%)] dark:border-[hsl(0,0%,12%)]">
        {RANGES.map(range => (
          <SelectItem
            key={range.value}
            value={range.value}
            className="cursor-pointer focus:bg-[hsl(0,0%,12%)] text-foreground"
          >
            {range.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
