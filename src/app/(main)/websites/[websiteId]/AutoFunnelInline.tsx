'use client';

import { Loader2, Filter, AlertTriangle } from 'lucide-react';
import { useResultQuery } from '@/components/hooks';

interface Journey {
  items: string[];
  count: number;
}
interface Step {
  label: string;
  count: number;
  drop: number;
}

// Greedily derive the dominant path from the journey sequences: at each depth,
// pick the most-common next step among sequences matching the path so far. The
// per-step counts are monotonically decreasing → a real funnel + drop-offs.
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

// "Your real funnel" — auto-detected from how visitors actually move through the
// site, with the biggest drop-off called out. Pure client-side over the existing
// journey report (no new query).
export function AutoFunnelInline({ websiteId }: { websiteId: string }) {
  const { data, isLoading } = useResultQuery<Journey[]>('journey', { websiteId, steps: 5 });
  const funnel = deriveFunnel(Array.isArray(data) ? data : []);

  if (isLoading) {
    return (
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Detecting your funnel…
      </div>
    );
  }

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
