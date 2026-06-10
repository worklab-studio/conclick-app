'use client';

import { MousePointerClick, Loader2 } from 'lucide-react';
import { useFrustrationQuery } from '@/components/hooks';
import { TabEmptyState } from '@/components/common/TabEmptyState';

const TYPE_META: Record<string, { label: string; cls: string }> = {
  rage: { label: 'Rage click', cls: 'bg-red-500/10 text-red-300 ring-red-500/20' },
  dead: { label: 'Dead click', cls: 'bg-amber-500/10 text-amber-300 ring-amber-500/20' },
  form_abandon: { label: 'Form abandon', cls: 'bg-sky-500/10 text-sky-300 ring-sky-500/20' },
};

// Privacy-first "where visitors get stuck": rage/dead clicks + form abandons,
// element-level only. Read-side over the tracker's frustration events.
export function FrictionInline({ websiteId }: { websiteId: string }) {
  const { data, isLoading } = useFrustrationQuery(websiteId);
  const rows = Array.isArray(data) ? data : [];

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  if (!rows.length) {
    return (
      <TabEmptyState
        icon={MousePointerClick}
        title="No friction detected yet"
        description="Turn on Autocapture in Settings to catch rage clicks, dead clicks, and form abandons — element-level only, never what visitors type."
      />
    );
  }

  return (
    <div className="divide-y divide-[hsl(0,0%,12%)]">
      <div className="hidden text-[11px] font-medium uppercase tracking-wide text-muted-foreground/60 md:block">
        <div className="flex items-center gap-4 px-7 py-2">
          <div className="w-28">Type</div>
          <div className="flex-1">Element</div>
          <div className="w-16 text-right">Count</div>
        </div>
      </div>

      {rows.map((r, i) => {
        const meta = TYPE_META[r.type] || {
          label: r.type,
          cls: 'bg-zinc-500/10 text-zinc-300 ring-zinc-500/20',
        };
        return (
          <div key={`${r.type}:${r.selector}:${i}`} className="flex items-center gap-4 px-7 py-3">
            <div className="w-28 shrink-0">
              <span
                className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${meta.cls}`}
              >
                {meta.label}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-mono text-xs text-foreground">{r.selector}</div>
              {r.text ? (
                <div className="truncate text-xs text-muted-foreground">“{r.text}”</div>
              ) : null}
            </div>
            <div className="w-16 shrink-0 text-right text-sm font-semibold text-foreground">
              {r.count}×
            </div>
          </div>
        );
      })}
    </div>
  );
}
