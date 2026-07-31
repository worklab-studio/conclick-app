'use client';

import { useEffect, useState } from 'react';
import { Globe, Zap, Search, Check } from 'lucide-react';
import { useDateRange, useWebsiteValuesQuery } from '@/components/hooks';

/**
 * "Pick from your site" control — lists the website's real top pages
 * (type='path') or real events (type='event') from useWebsiteValuesQuery, each
 * with its visitor count, so a non-technical user selects instead of typing.
 * Includes a search box (server-side) and a custom-value fallback input.
 */
export function MetricValuePicker({
  websiteId,
  type,
  value,
  onChange,
}: {
  websiteId: string;
  type: 'path' | 'event';
  value: string;
  onChange: (value: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const {
    dateRange: { startDate, endDate },
  } = useDateRange();
  const { data, isLoading } = useWebsiteValuesQuery({
    websiteId,
    type,
    startDate,
    endDate,
    search: debounced,
    clean: true,
  });
  const items = (data || []) as { value: string; count: number }[];
  const Icon = type === 'event' ? Zap : Globe;

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={type === 'event' ? 'Search your events…' : 'Search your pages…'}
          className="h-10 w-full rounded-lg border border-[hsl(0,0%,16%)] bg-[#18181b] pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-[#5e5ba4] focus:outline-none focus:ring-1 focus:ring-[#5e5ba4]"
        />
      </div>

      <div className="mt-2 max-h-52 overflow-y-auto rounded-lg border border-[hsl(0,0%,13%)]">
        {isLoading ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm leading-relaxed text-muted-foreground">
            {type === 'event'
              ? 'No events tracked yet. Events record actions like button clicks, add one in your tracking code, or pick a page instead.'
              : 'No pages found for this date range.'}
          </div>
        ) : (
          items.map(item => {
            const selected = item.value === value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => onChange(item.value)}
                className={`flex w-full items-center justify-between gap-3 border-b border-[hsl(0,0%,11%)] px-3 py-2.5 text-left transition-colors last:border-b-0 ${
                  selected
                    ? 'bg-[#5e5ba4]/12 shadow-[inset_3px_0_0_#5e5ba4]'
                    : 'hover:bg-[hsl(0,0%,11%)]'
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Icon
                    className={`h-3.5 w-3.5 shrink-0 ${selected ? 'text-[#8b88cf]' : 'text-muted-foreground/50'}`}
                  />
                  <span
                    className={`truncate text-sm ${selected ? 'font-semibold text-foreground' : 'text-foreground/90'}`}
                  >
                    {item.value}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-muted-foreground/70">
                    {item.count.toLocaleString()}
                  </span>
                  {selected && <Check className="h-3.5 w-3.5 text-[#8b88cf]" />}
                </span>
              </button>
            );
          })
        )}
      </div>

      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={type === 'event' ? 'or type an event name…' : 'or type a path, e.g. /pricing'}
        className="mt-2 h-9 w-full rounded-lg border border-[hsl(0,0%,14%)] bg-transparent px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-[#5e5ba4] focus:outline-none"
      />
    </div>
  );
}
