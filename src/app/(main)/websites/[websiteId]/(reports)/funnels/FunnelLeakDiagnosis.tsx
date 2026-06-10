'use client';

import { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Route,
  MousePointerClick,
  Crosshair,
  LogOut,
} from 'lucide-react';
import { useResultQuery, useFrustrationQuery } from '@/components/hooks';
import { useDashboardTabs } from '@/app/(main)/websites/[websiteId]/dashboard-tab-context';
import type { FunnelStepRow } from '@/lib/funnel-insights';

const FR_META: Record<string, { label: string; cls: string }> = {
  rage: { label: 'Rage', cls: 'text-red-300' },
  dead: { label: 'Dead', cls: 'text-amber-300' },
  form_abandon: { label: 'Abandon', cls: 'text-sky-300' },
};

// "Why does this step leak?" — droppers' onward destinations (journey), friction on
// the page they were on, and a deep-link to the Click map for abandoners. Collapsible,
// lazy (queries fire only when expanded). prevStep = the step they reached; leakStep =
// the step they failed to reach.
export function FunnelLeakDiagnosis({
  websiteId,
  prevStep,
  leakStep,
}: {
  websiteId: string;
  prevStep: FunnelStepRow;
  leakStep: FunnelStepRow;
}) {
  const [open, setOpen] = useState(false);
  const tabs = useDashboardTabs();
  const prevIsPath = (prevStep.type ?? 'path') === 'path';

  const { data: journey, isLoading: jLoading } = useResultQuery<
    { items: string[]; count: number }[]
  >('journey', { websiteId, steps: 3, startStep: prevStep.value }, { enabled: open });
  const { data: friction } = useFrustrationQuery(
    open && prevIsPath ? websiteId : undefined,
    prevIsPath ? prevStep.value : undefined,
  );

  const { destinations, exited } = useMemo(() => {
    const rows = (journey || []) as { items: string[]; count: number }[];
    const tally = new Map<string, number>();
    let exit = 0;
    for (const r of rows) {
      const next = r.items?.[1];
      if (!next) {
        exit += r.count;
        continue;
      }
      if (next === leakStep.value || next === prevStep.value) continue;
      tally.set(next, (tally.get(next) || 0) + r.count);
    }
    return {
      destinations: [...tally.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([label, count]) => ({ label, count })),
      exited: exit,
    };
  }, [journey, leakStep.value, prevStep.value]);

  const frictionRows = ((friction || []) as FunnelStepRow[] as any[]).slice(0, 3);

  return (
    <div className="mt-3 rounded-lg border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,8.5%)]">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-foreground/90"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        Diagnose this leak
      </button>

      {open ? (
        <div className="space-y-3 border-t border-[hsl(0,0%,12%)] px-3 py-3 text-xs">
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/60">
              <Route className="h-3 w-3" /> Where they went instead
            </div>
            {jLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
              </div>
            ) : destinations.length === 0 && !exited ? (
              <div className="text-muted-foreground/60">Not enough data yet.</div>
            ) : (
              <div className="space-y-1">
                {destinations.map(d => (
                  <div key={d.label} className="flex items-center justify-between gap-3">
                    <span className="truncate text-foreground/90">{d.label}</span>
                    <span className="shrink-0 text-muted-foreground">{d.count}</span>
                  </div>
                ))}
                {exited > 0 ? (
                  <div className="flex items-center justify-between gap-3 text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <LogOut className="h-3 w-3" /> Left the site
                    </span>
                    <span className="shrink-0">{exited}</span>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {prevIsPath ? (
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/60">
                <MousePointerClick className="h-3 w-3" /> Friction on {prevStep.value}
              </div>
              {frictionRows.length === 0 ? (
                <div className="text-muted-foreground/60">No friction detected here.</div>
              ) : (
                <div className="space-y-1">
                  {frictionRows.map((f, i) => {
                    const meta = FR_META[f.type] || { label: f.type, cls: 'text-zinc-300' };
                    return (
                      <div key={i} className="flex items-center justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className={`shrink-0 font-semibold ${meta.cls}`}>{meta.label}</span>
                          <span className="truncate font-mono text-[11px] text-muted-foreground">
                            {f.selector}
                          </span>
                        </span>
                        <span className="shrink-0 text-muted-foreground">{f.count}×</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}

          {prevIsPath && tabs ? (
            <button
              type="button"
              onClick={() => tabs.openClickMap(prevStep.value, 'abandoner')}
              className="inline-flex items-center gap-1.5 rounded-md border border-[hsl(0,0%,16%)] px-2.5 py-1.5 text-[11px] text-[#b7b4e4] transition-colors hover:border-[#5e5ba4]/50 hover:text-foreground"
            >
              <Crosshair className="h-3.5 w-3.5" /> See where abandoners clicked on {prevStep.value}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
