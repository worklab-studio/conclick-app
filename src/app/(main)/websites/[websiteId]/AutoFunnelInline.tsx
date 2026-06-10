'use client';

import { useMemo, useState } from 'react';
import {
  Loader2,
  Filter,
  AlertTriangle,
  Check,
  Plus,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import {
  useResultQuery,
  useWebsiteValuesQuery,
  useDateRange,
  useUpdateQuery,
  useFunnelQuery,
} from '@/components/hooks';
import { FunnelChart } from '@/app/(main)/websites/[websiteId]/(reports)/funnels/FunnelChart';
import { buildAutoSteps } from '@/lib/auto-funnel';

interface Journey {
  items: string[];
  count: number;
}
interface Step {
  label: string;
  count: number;
  drop: number;
}

type Segment = { key: string; label: string; filter?: Record<string, string> };
const SEGMENTS: Segment[] = [
  { key: 'all', label: 'All' },
  { key: 'desktop', label: 'Desktop', filter: { device: 'desktop' } },
  { key: 'mobile', label: 'Mobile', filter: { device: 'mobile' } },
];

// Journey-derived fallback (only when no real conversion step exists). Greedily
// derives the dominant path from journey sequences.
function deriveFunnel(journeys: Journey[]): { steps: Step[]; biggestLeak: number } | null {
  if (!journeys?.length) return null;
  const path: string[] = [];
  const counts: number[] = [];
  let pool = journeys;
  for (let depth = 0; depth < 5; depth++) {
    const tally = new Map<string, number>();
    for (const j of pool) {
      const item = j.items?.[depth];
      if (item == null) continue;
      tally.set(item, (tally.get(item) || 0) + j.count);
    }
    if (!tally.size) break;
    const [topItem, topCount] = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
    path.push(topItem);
    counts.push(topCount);
    pool = pool.filter(j => j.items?.[depth] === topItem);
    if (!pool.length) break;
  }
  if (path.length < 2) return null;
  const steps: Step[] = path.map((label, i) => ({
    label,
    count: counts[i],
    drop: i > 0 && counts[i - 1] ? Math.round((1 - counts[i] / counts[i - 1]) * 100) : 0,
  }));
  let biggestLeak = -1;
  let worst = -1;
  for (let i = 1; i < steps.length; i++) {
    if (steps[i].drop > worst) {
      worst = steps[i].drop;
      biggestLeak = i;
    }
  }
  return { steps, biggestLeak };
}

// "Your real funnel" — auto-detected from the site's own pages + conversion events,
// then run through the SAME accurate funnel engine as saved funnels (window-bound,
// session-level) so the numbers are trustworthy. Shows revenue, the biggest leak,
// and a one-click "Save as funnel". Falls back to a journey-derived sketch only when
// no conversion event is available yet.
export function AutoFunnelInline({ websiteId }: { websiteId: string }) {
  const {
    dateRange: { startDate, endDate },
  } = useDateRange();
  const { data: pagesData } = useWebsiteValuesQuery({
    websiteId,
    type: 'path',
    startDate,
    endDate,
  });
  const { data: eventsData } = useWebsiteValuesQuery({
    websiteId,
    type: 'event',
    startDate,
    endDate,
  });
  const pages = useMemo(() => (pagesData || []) as { value: string; count: number }[], [pagesData]);
  const events = useMemo(
    () => (eventsData || []) as { value: string; count: number }[],
    [eventsData],
  );

  const { steps, isSinglePage } = useMemo(() => buildAutoSteps(pages, events), [pages, events]);
  const canRun = steps.length >= 2;
  const windowMinutes = isSinglePage ? 30 : 1440;

  const [segment, setSegment] = useState<Segment>(SEGMENTS[0]);
  const [compare, setCompare] = useState(false);

  const {
    data: funnelData,
    isLoading: funnelLoading,
    compareData,
  } = useFunnelQuery(websiteId, {
    steps,
    window: windowMinutes,
    segment: segment.filter,
    compare: compare && canRun,
  });
  const { data: journeyData, isLoading: journeyLoading } = useResultQuery<Journey[]>('journey', {
    websiteId,
    steps: 5,
  });

  const rows = (funnelData as any[]) || [];
  const realFunnel = canRun && rows.length >= 2;
  const empty = realFunnel && (rows[0]?.visitors || 0) === 0;

  const cmp = (compareData as any[]) || [];
  const lastNow = rows[rows.length - 1]?.remaining ?? 0;
  const lastPrev = cmp.length ? (cmp[cmp.length - 1]?.remaining ?? null) : null;
  const convDelta =
    compare && lastPrev != null ? Math.round((lastNow - lastPrev) * 1000) / 10 : null;

  const { mutateAsync, isPending, touch } = useUpdateQuery('/reports');
  const [saved, setSaved] = useState(false);
  const saveAsFunnel = async () => {
    if (!canRun) return;
    await mutateAsync(
      {
        type: 'funnel',
        name: steps
          .map(s => s.value)
          .join(' → ')
          .slice(0, 60),
        websiteId,
        parameters: { window: windowMinutes, steps },
      },
      {
        onSuccess: () => {
          touch('reports:funnel');
          setSaved(true);
        },
      },
    );
  };

  if ((canRun && funnelLoading) || (!canRun && journeyLoading)) {
    return (
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Detecting your funnel…
      </div>
    );
  }

  // Accurate path — real funnel engine + shared chart + leak diagnosis.
  if (realFunnel) {
    const chip = (active: boolean) =>
      `rounded-md px-2 py-0.5 text-xs transition-colors ${
        active
          ? 'bg-[#5e5ba4]/15 text-foreground ring-1 ring-inset ring-[#5e5ba4]/25'
          : 'text-muted-foreground hover:text-foreground'
      }`;
    return (
      <div className="mb-4 rounded-lg border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,9%)] p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Filter className="h-4 w-4 text-[#8b88cf]" /> Your real funnel · auto-detected
          </div>
          <button
            type="button"
            onClick={saveAsFunnel}
            disabled={isPending || saved}
            className="inline-flex items-center gap-1.5 rounded-md border border-[hsl(0,0%,16%)] px-2.5 py-1 text-xs text-[#b7b4e4] transition-colors hover:border-[#5e5ba4]/50 hover:text-foreground disabled:opacity-60"
          >
            {saved ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" /> Saved
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" /> Save as funnel
              </>
            )}
          </button>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex items-center gap-1">
            {SEGMENTS.map(s => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSegment(s)}
                className={chip(segment.key === s.key)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setCompare(c => !c)} className={chip(compare)}>
            vs previous
          </button>
          {convDelta != null ? (
            <span
              className={`inline-flex items-center gap-1 text-xs ${
                convDelta >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {convDelta >= 0 ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              {convDelta >= 0 ? '+' : ''}
              {convDelta}pp conversion
            </span>
          ) : null}
        </div>

        {empty ? (
          <div className="rounded-md border border-dashed border-[hsl(0,0%,14%)] px-3 py-8 text-center text-sm text-muted-foreground">
            No funnel data{segment.filter ? ` for ${segment.label}` : ''} in this range yet.
          </div>
        ) : (
          <FunnelChart rows={rows} websiteId={websiteId} />
        )}
      </div>
    );
  }

  // Fallback: journey-derived sketch (no conversion event captured yet).
  const funnel = deriveFunnel(Array.isArray(journeyData) ? journeyData : []);
  if (!funnel) return null;
  const top = funnel.steps[0].count || 1;

  return (
    <div className="mb-4 rounded-lg border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,9%)] p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Filter className="h-4 w-4 text-[#8b88cf]" /> Your real funnel · auto-detected
      </div>
      <div className="space-y-1.5">
        {funnel.steps.map((s, i) => {
          const pct = Math.round((s.count / top) * 100);
          const isLeak = i === funnel.biggestLeak;
          return (
            <div key={i}>
              <div className="flex items-center gap-3">
                <div className="w-6 shrink-0 text-xs text-muted-foreground">{i + 1}</div>
                <div className="relative h-7 flex-1 overflow-hidden rounded bg-[hsl(0,0%,11%)]">
                  <div
                    className="absolute inset-y-0 left-0 rounded bg-[#5e5ba4]/40"
                    style={{ width: `${Math.max(6, pct)}%` }}
                  />
                  <div className="absolute inset-0 flex items-center px-2">
                    <span className="truncate text-xs text-foreground">{s.label}</span>
                  </div>
                </div>
                <div className="w-14 shrink-0 text-right text-sm text-foreground">{s.count}</div>
              </div>
              {i > 0 && s.drop > 0 ? (
                <div
                  className={`ml-9 mt-0.5 text-[11px] ${
                    isLeak ? 'font-semibold text-amber-400' : 'text-muted-foreground/60'
                  }`}
                >
                  {isLeak ? <AlertTriangle className="mr-1 inline h-3 w-3" /> : null}−{s.drop}% drop
                  {isLeak ? ' · biggest leak' : ''}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      {funnel.biggestLeak > 0 ? (
        <div className="mt-3 rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-300/90">
          Biggest leak:{' '}
          <span className="font-semibold">{funnel.steps[funnel.biggestLeak - 1].label}</span> →{' '}
          <span className="font-semibold">{funnel.steps[funnel.biggestLeak].label}</span> (
          {funnel.steps[funnel.biggestLeak].drop}% drop-off).
        </div>
      ) : null}
    </div>
  );
}
