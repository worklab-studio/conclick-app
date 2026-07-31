'use client';

import { useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Crosshair,
  Loader2,
  LogOut,
  TrendingDown,
} from 'lucide-react';
import { useResultQuery, useFrustrationQuery } from '@/components/hooks';
import { useDashboardTabs } from '@/app/(main)/websites/[websiteId]/dashboard-tab-context';
import { formatLongNumber, formatMinorCurrency } from '@/lib/format';
import type { FunnelStepRow } from '@/lib/funnel-insights';

const FR_META: Record<string, { label: string; cls: string }> = {
  rage: { label: 'Rage clicks', cls: 'text-rose-300' },
  dead: { label: 'Dead clicks', cls: 'text-sky-300' },
  form_abandon: { label: 'Form abandons', cls: 'text-violet-300' },
};

// The biggest-leak card: an always-visible summary header (step chips + rose drop
// chip + revenue lost) over a collapsible diagnosis — droppers' onward destinations
// as share bars, friction on the step they were on, and a click-map deep link for
// abandoners. Diagnosis queries are lazy: they fire only while expanded, so a list
// of saved funnels (defaultOpen=false) doesn't burst N journey+friction requests.
export function FunnelLeakDiagnosis({
  websiteId,
  prevStep,
  leakStep,
  lost = 0,
  currency = 'USD',
  defaultOpen = false,
}: {
  websiteId?: string;
  prevStep: FunnelStepRow;
  leakStep: FunnelStepRow;
  lost?: number;
  currency?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const tabs = useDashboardTabs();
  const prevIsPath = (prevStep.type ?? 'path') === 'path';
  const canDiagnose = !!websiteId;

  const {
    data: journey,
    isLoading: jLoading,
    isFetching: jFetching,
  } = useResultQuery<{ items: string[]; count: number }[]>(
    'journey',
    { websiteId, steps: 3, startStep: prevStep.value },
    { enabled: open && canDiagnose },
  );
  const { data: friction } = useFrustrationQuery(
    open && canDiagnose && prevIsPath ? websiteId : undefined,
    prevIsPath ? prevStep.value : undefined,
  );

  const destinations = useMemo(() => {
    const rows = (journey || []) as { items: string[]; count: number }[];
    const tally = new Map<string, number>();
    let exited = 0;
    for (const r of rows) {
      const next = r.items?.[1];
      if (!next) {
        exited += r.count;
        continue;
      }
      if (next === leakStep.value || next === prevStep.value) continue;
      tally.set(next, (tally.get(next) || 0) + r.count);
    }
    const list = [...tally.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count]) => ({ label, count, exit: false }));
    if (exited > 0) list.push({ label: 'Left the site', count: exited, exit: true });
    list.sort((a, b) => b.count - a.count);
    const total = Math.max(
      1,
      list.reduce((s, d) => s + d.count, 0),
    );
    return { list, total };
  }, [journey, leakStep.value, prevStep.value]);

  const frictionRows = ((friction || []) as any[]).slice(0, 3);

  const dropPct = Math.round((leakStep.dropoff || 0) * 100);
  const dropped = leakStep.dropped ?? 0;
  const reached = prevStep.visitors ?? 0;

  return (
    <div className="mt-3 animate-in fade-in overflow-hidden rounded-xl border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,8%)] duration-300">
      {/* Header, the leak summary, always visible */}
      <button
        type="button"
        onClick={() => canDiagnose && setOpen(o => !o)}
        className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-rose-500/15 bg-rose-500/[0.08] text-rose-400">
          <TrendingDown className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground/70">
            Biggest leak
          </span>
          <span className="mt-1 flex items-center gap-2">
            <span
              className="truncate rounded-[7px] border border-[hsl(0,0%,14%)] bg-[#0f0f11] px-2 py-[2px] font-mono text-xs text-foreground/90"
              title={prevStep.value}
            >
              {prevStep.value}
            </span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
            <span
              className="truncate rounded-[7px] border border-[hsl(0,0%,14%)] bg-[#0f0f11] px-2 py-[2px] font-mono text-xs text-foreground/90"
              title={leakStep.value}
            >
              {leakStep.value}
            </span>
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-[13px] font-bold text-rose-300">
            −{dropPct}%
          </span>
          <span className="mt-1.5 block text-[11px] text-muted-foreground">
            {formatLongNumber(dropped)} of {formatLongNumber(reached)} drop here
            {lost > 0 ? <> · ≈{formatMinorCurrency(lost, currency)} lost</> : null}
          </span>
        </span>
        {canDiagnose ? (
          open ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground/60" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground/60" />
          )
        ) : null}
      </button>

      {open && canDiagnose ? (
        <>
          <div
            className={`grid border-t border-[hsl(0,0%,11%)] ${
              prevIsPath ? 'md:grid-cols-[1.25fr_1fr]' : ''
            }`}
          >
            {/* Where the droppers went */}
            <div className="px-4 py-3.5">
              <div className="mb-2.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                Where they went instead
              </div>
              {jLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                </div>
              ) : destinations.list.length === 0 ? (
                <div className="text-xs text-muted-foreground/60">Not enough data yet.</div>
              ) : (
                <div
                  className={`space-y-1.5 transition-opacity duration-300 ${
                    jFetching ? 'opacity-60' : 'opacity-100'
                  }`}
                >
                  {destinations.list.map(d => {
                    const pct = Math.round((d.count / destinations.total) * 100);
                    return (
                      <div
                        key={d.label}
                        className="grid grid-cols-[minmax(90px,auto)_1fr_auto] items-center gap-3"
                      >
                        <span
                          className={`flex min-w-0 items-center gap-1.5 text-xs ${
                            d.exit ? 'text-muted-foreground' : 'font-mono text-foreground/90'
                          }`}
                        >
                          {d.exit ? <LogOut className="h-3 w-3 shrink-0" /> : null}
                          <span className="truncate" title={d.label}>
                            {d.label}
                          </span>
                        </span>
                        <span className="h-1.5 overflow-hidden rounded-full bg-[hsl(0,0%,12%)]">
                          <span
                            className="block h-full rounded-full bg-[#5e5ba4]/60 transition-[width] duration-500"
                            style={{ width: `${Math.max(4, pct)}%` }}
                          />
                        </span>
                        <span className="shrink-0 text-[11.5px] tabular-nums text-muted-foreground">
                          <b className="font-semibold text-foreground/90">
                            {formatLongNumber(d.count)}
                          </b>{' '}
                          · {pct}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Friction on the step they were on */}
            {prevIsPath ? (
              <div className="border-t border-[hsl(0,0%,11%)] px-4 py-3.5 md:border-l md:border-t-0">
                <div className="mb-2.5 truncate text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                  Friction on {prevStep.value}
                </div>
                {frictionRows.length === 0 ? (
                  <div className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                    <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    No rage clicks, dead clicks or form abandons on this step.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {frictionRows.map((f, i) => {
                      const meta = FR_META[f.type] || { label: f.type, cls: 'text-zinc-300' };
                      return (
                        <div key={i} className="flex items-center justify-between gap-3 text-xs">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className={`shrink-0 font-semibold ${meta.cls}`}>
                              {meta.label}
                            </span>
                            <span className="truncate font-mono text-[11px] text-muted-foreground">
                              {f.selector}
                            </span>
                          </span>
                          <span className="shrink-0 tabular-nums text-muted-foreground">
                            {f.count}×
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Click-map deep link */}
          {prevIsPath && tabs ? (
            <div className="flex flex-wrap items-center gap-3 border-t border-[hsl(0,0%,11%)] px-4 py-3">
              <button
                type="button"
                onClick={() => tabs.openClickMap(prevStep.value, 'abandoner')}
                className="inline-flex items-center gap-2 rounded-[9px] border border-[#5e5ba4]/30 bg-[#5e5ba4]/[0.13] px-3.5 py-2 text-xs font-semibold text-[#c7c4f0] transition-colors hover:bg-[#5e5ba4]/20"
              >
                <Crosshair className="h-3.5 w-3.5" /> See where abandoners clicked on{' '}
                {prevStep.value}
              </button>
              <span className="text-[11.5px] text-muted-foreground/70">
                Opens the click map filtered to visitors who dropped at this step.
              </span>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
