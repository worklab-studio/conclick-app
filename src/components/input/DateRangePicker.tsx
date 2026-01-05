'use client';

import * as React from 'react';
import { CalendarIcon } from 'lucide-react';
import { startOfToday, startOfYesterday, startOfWeek, startOfMonth, startOfYear, endOfToday, endOfYesterday } from 'date-fns';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useNavigation } from '@/components/hooks';

export function DateRangePicker({ websiteId }: { websiteId: string }) {
    const { router, updateParams, query } = useNavigation();
    const [dateRange, setDateRange] = React.useState<string>(query.date || '24hour');

    // Map display values to internal API values
    // parseDateRange expects: {num}{unit} where unit is hour|day|week|month|year
    const ranges = [
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

    const handleValueChange = (value: string) => {
        setDateRange(value);
        router.push(updateParams({ date: value }));
    };

    // Find the label for current value
    const currentLabel = ranges.find(r => r.value === dateRange)?.label || 'Last 24 hours';

    return (
        <Select value={dateRange} onValueChange={handleValueChange}>
            <SelectTrigger className="w-[180px] border dark:border-[hsl(0,0%,12%)] bg-background dark:bg-[hsl(0,0%,9%)] hover:bg-accent/50 transition-colors text-foreground">
                <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Select date range">{currentLabel}</SelectValue>
                </div>
            </SelectTrigger>
            <SelectContent className="dark:bg-[hsl(0,0%,8%)] dark:border-[hsl(0,0%,12%)]">
                {ranges.map((range) => (
                    <SelectItem key={range.value} value={range.value} className="cursor-pointer focus:bg-[hsl(0,0%,12%)] text-foreground">
                        {range.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
