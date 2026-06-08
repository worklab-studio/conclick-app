'use client';

import { useNavigation } from '@/components/hooks';
import { cn } from '@/lib/utils';

const SEGMENTS = [
  { id: '', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'returning', label: 'Returning' },
  { id: 'paying', label: 'Paying' },
  { id: 'bounced', label: 'Bounced' },
];

export function VisitorsFilter() {
  const { query, updateParams, router } = useNavigation();
  const active = (query?.userFilter as string) || '';

  const select = (id: string) => {
    // Reset to page 1 — a filtered set has fewer pages.
    router.push(updateParams({ userFilter: id || undefined, page: 1 }));
  };

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-[hsl(0,0%,12%)] px-7 py-3">
      {SEGMENTS.map(s => {
        const on = active === s.id;
        return (
          <button
            key={s.id || 'all'}
            type="button"
            onClick={() => select(s.id)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              on
                ? 'bg-[#5e5ba4]/15 text-foreground ring-1 ring-inset ring-[#5e5ba4]/25'
                : 'text-muted-foreground hover:bg-[hsl(0,0%,11%)] hover:text-foreground',
            )}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}
