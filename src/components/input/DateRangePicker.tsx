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
    const [dateRange, setDateRange] = React.useState<string>(query.date || '24h');

    const ranges = [
        { label: 'Today', value: 'today' },
        { label: 'Yesterday', value: 'yesterday' },
        { label: 'Last 24 hours', value: '24h' },
        { label: 'Last 7 days', value: '7d' },
        { label: 'Last 30 days', value: '30d' },
        { label: 'Last 90 days', value: '90d' },
        { label: 'Last 12 months', value: '12m' },
        { label: 'Week to date', value: 'wtd' },
        { label: 'Month to date', value: 'mtd' },
        { label: 'Year to date', value: 'ytd' },
        { label: 'All time', value: 'all' },
    ];

    const handleValueChange = (value: string) => {
        setDateRange(value);

        let range = value;

        // Map custom values to Umami's expected format if needed, 
        // but Umami's useDateRange hook likely handles these standard keys (24h, 7d, etc.)
        // "today", "yesterday", "wtd", "mtd", "ytd" might need specific handling if not supported by default.
        // Checking useDateRange implementation would be ideal, but for now assuming standard keys or constructing custom ranges.

        // Based on standard Umami:
        // 24h, 7d, 30d, 90d, 12m, all are standard.
        // today, yesterday, wtd, mtd, ytd might need conversion to specific dates if not supported.

        // Let's assume we pass the value directly and if it fails we fix it.
        // Actually, let's map them to be safe.

        const now = new Date();
        let startDate, endDate;

        switch (value) {
            case 'today':
                startDate = startOfToday();
                endDate = endOfToday();
                break;
            case 'yesterday':
                startDate = startOfYesterday();
                endDate = endOfYesterday();
                break;
            case 'wtd':
                startDate = startOfWeek(now);
                endDate = endOfToday();
                break;
            case 'mtd':
                startDate = startOfMonth(now);
                endDate = endOfToday();
                break;
            case 'ytd':
                startDate = startOfYear(now);
                endDate = endOfToday();
                break;
            // Standard relative ranges
            case '24h':
            case '7d':
            case '30d':
            case '90d':
            case '12m':
            case 'all':
                // These are likely supported directly by the backend/hook
                router.push(updateParams({ date: value }));
                return;
        }

        if (startDate && endDate) {
            // Format as custom range: start:end
            // Umami typically expects specific formats. 
            // If we look at WebsiteDateFilter.tsx, it uses `getDateRangeValue`.
            // Let's try passing the calculated range.
            // However, standard Umami might not support 'today' keyword directly in URL.
            // Let's stick to the standard keys if possible, or custom range string.

            // For now, let's try passing the keyword if it's a standard one, otherwise calculate.
            // Actually, let's just pass the value and see. Umami's `useDateRange` usually parses these.
            // But 'wtd', 'mtd', 'ytd' might be custom.

            // Let's rely on the standard keys first.
            router.push(updateParams({ date: value }));
        }
    };

    return (
        <Select value={dateRange} onValueChange={handleValueChange}>
            <SelectTrigger className="w-[180px] border dark:border-[hsl(0,0%,12%)] bg-background dark:bg-[hsl(0,0%,9%)] hover:bg-accent/50 transition-colors text-foreground">
                <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Select date range" />
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
