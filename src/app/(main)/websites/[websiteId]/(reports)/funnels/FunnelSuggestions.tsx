'use client';

import { useMemo } from 'react';
import { Lightbulb, ArrowRight } from 'lucide-react';
import { useResultQuery } from '@/components/hooks';
import type { FunnelStep } from '@/lib/funnel-templates';

export interface FunnelSuggestion {
  steps: FunnelStep[];
  count: number;
}

/**
 * Smart funnel suggestions built from the site's real visitor journeys
 * (useResultQuery('journey')). Surfaces the most common ordered paths as
 * one-click "use this" cards that prefill the funnel builder.
 */
export function FunnelSuggestions({
  websiteId,
  onPick,
}: {
  websiteId: string;
  onPick: (s: FunnelSuggestion) => void;
}) {
  const { data } = useResultQuery<{ items: string[]; count: number }[]>('journey', {
    websiteId,
    steps: 3,
  });

  const suggestions = useMemo<FunnelSuggestion[]>(() => {
    const rows = (data || []) as { items: string[]; count: number }[];
    const seen = new Set<string>();
    const out: FunnelSuggestion[] = [];

    for (const row of rows) {
      const items = (row.items || []).filter(Boolean);
      // collapse consecutive repeats; need at least 2 distinct ordered steps
      const distinct = items.filter((v, i) => i === 0 || v !== items[i - 1]);
      if (distinct.length < 2) continue;
      const key = distinct.join(' > ');
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        steps: distinct.slice(0, 4).map(value => ({ type: 'path', value })),
        count: row.count,
      });
      if (out.length >= 3) break;
    }
    return out;
  }, [data]);

  if (!suggestions.length) return null;

  return (
    <div>
      <div className="mb-2 text-[13px] font-semibold text-foreground/90">
        Suggested from your traffic
      </div>
      <div className="space-y-2">
        {suggestions.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onPick(s)}
            className="flex w-full items-center gap-3 rounded-xl border border-[#5e5ba4]/40 bg-gradient-to-b from-[#5e5ba4]/12 to-[#5e5ba4]/5 px-4 py-3 text-left transition-colors hover:border-[#5e5ba4]/60"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#5e5ba4]/20 text-[#c7c4f0]">
              <Lightbulb className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-foreground">
                {s.steps.map(st => st.value).join('  →  ')}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                A common path · {s.count.toLocaleString()} visitor{s.count === 1 ? '' : 's'}
              </span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-[#c7c4f0]" />
          </button>
        ))}
      </div>
    </div>
  );
}
