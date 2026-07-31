import { useEffect, useMemo } from 'react';
import { Dialog } from '@umami/react-zen';
import { Globe, Zap, Users, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { ReportEditButton } from '@/components/input/ReportEditButton';
import { useMessages, useGoalQuery, useWebsiteValuesQuery } from '@/components/hooks';
import { LoadingPanel } from '@/components/common/LoadingPanel';
import { formatLongNumber, formatMinorCurrency } from '@/lib/format';
import { normalizePath } from '@/lib/event-noise';
import { GoalBuilder } from './GoalBuilder';
import { GoalFunnelButton } from './GoalFunnelButton';

export interface GoalProps {
  id: string;
  name: string;
  type: string;
  parameters: { name?: string; type: string; value: string; targetWeekly?: number };
  websiteId: string;
  startDate: Date;
  endDate: Date;
  onResult?: (id: string, num: number) => void;
}

export type GoalData = {
  num: number;
  total: number;
  revenue?: number;
  currency?: string | null;
  series?: { t: string; y: number }[];
};

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Tiny bar chart of converting sessions per day, windowed to the active date range
// (≤14 buckets, zeros densified). Reads correctly on sparse data, unlike a line.
function Sparkline({
  series,
  startDate,
  endDate,
}: {
  series: GoalData['series'];
  startDate?: Date;
  endDate?: Date;
}) {
  const points = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const s of series || []) byDay.set(String(s.t).slice(0, 10), s.y);
    const end = endDate ? new Date(endDate) : new Date();
    const span = startDate ? Math.ceil((+end - +new Date(startDate)) / 86400000) + 1 : 14;
    const days = Math.max(1, Math.min(14, span));
    const out: number[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(d.getDate() - i);
      out.push(byDay.get(dayKey(d)) || 0);
    }
    return out;
  }, [series, startDate, endDate]);

  const max = Math.max(1, ...points);
  if (!points.some(p => p > 0)) return null;

  const BW = 5;
  const GAP = 3;
  const H = 24;
  const W = points.length * (BW + GAP) - GAP;

  return (
    <svg width={W} height={H} className="shrink-0" aria-hidden>
      {points.map((p, i) => {
        const h = p > 0 ? Math.max(3, Math.round((p / max) * (H - 2))) : 2;
        return (
          <rect
            key={i}
            x={i * (BW + GAP)}
            y={H - h}
            width={BW}
            height={h}
            rx={1.5}
            className={p > 0 ? 'fill-[#7c79c4]' : 'fill-[hsl(0,0%,15%)]'}
          />
        );
      })}
    </svg>
  );
}

export function Goal({
  id,
  name,
  type,
  parameters,
  websiteId,
  startDate,
  endDate,
  onResult,
}: GoalProps) {
  const { formatMessage, labels } = useMessages();
  const { data, compareData, error, isLoading, isFetching } = useGoalQuery(websiteId, {
    type: parameters?.type,
    value: parameters?.value,
  });
  const isPage = parameters?.type === 'path';
  const Icon = isPage ? Globe : Zap;
  const num = data?.num || 0;
  const total = data?.total || 0;
  const pct = total ? Math.round((num / total) * 100) : 0;
  const revenue = data?.revenue || 0;
  const dead = !!data && num === 0;

  const prevNum = compareData?.num || 0;
  const prevTotal = compareData?.total || 0;
  const delta =
    compareData && prevTotal > 0
      ? Math.round((num / Math.max(total, 1) - prevNum / prevTotal) * 1000) / 10
      : null;

  // Weekly target scaled to the visible range: 25/week over a 30-day view
  // means ~107 expected. Card switches to progress-toward-target mode.
  const targetWeekly = Number(parameters?.targetWeekly) || 0;
  const rangeDays = Math.max(
    1,
    Math.round((+new Date(endDate) - +new Date(startDate)) / 86400000) || 1,
  );
  const scaledTarget = targetWeekly ? Math.max(1, Math.round((targetWeekly * rangeDays) / 7)) : 0;
  const targetPct = scaledTarget ? Math.min(100, Math.round((num / scaledTarget) * 100)) : 0;
  const targetHit = scaledTarget > 0 && num >= scaledTarget;

  // Zero-conversion diagnosis: "never fired vs typo vs just quiet". The values
  // list is range-scoped and shared across cards of the same type (one cached
  // query), so this costs nothing extra per card.
  const { data: knownValues } = useWebsiteValuesQuery({
    websiteId,
    type: parameters?.type === 'path' ? 'path' : 'event',
    startDate,
    endDate,
    clean: true,
  });
  const diagnosis = useMemo(() => {
    if (!dead || !knownValues) return null;
    const target = String(parameters?.value || '');
    const norm = (v: string) =>
      parameters?.type === 'path' ? normalizePath(v) : v.trim().toLowerCase();
    const list = (knownValues as { value: string }[]) || [];
    if (list.some(v => norm(v.value) === norm(target))) {
      // It fired in this period but no session converted under current filters.
      return 'No conversions under the current filters, try clearing them.';
    }
    const near = list.find(
      v =>
        v.value !== target &&
        (norm(v.value).includes(norm(target)) || norm(target).includes(norm(v.value))),
    );
    if (near) return `Nothing named “${target}” fired, did you mean “${near.value}”?`;
    return `“${target}” hasn't fired in this period, check the name or widen the range.`;
  }, [dead, knownValues, parameters?.value, parameters?.type]);

  useEffect(() => {
    if (data) onResult?.(id, num);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, num, id]);

  return (
    <LoadingPanel data={data} isLoading={isLoading} isFetching={isFetching} error={error}>
      {data && (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-[15px] font-semibold text-foreground">{name}</div>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon className="h-3.5 w-3.5 shrink-0 text-[#8b88cf]" />
                <span className="truncate">{parameters.value}</span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <GoalFunnelButton
                websiteId={websiteId}
                goalType={parameters?.type}
                goalValue={parameters?.value}
              />
              <ReportEditButton id={id} name={name} type={type}>
                {({ close }: { close: () => void }) => (
                  <Dialog
                    title={formatMessage(labels.goal)}
                    variant="modal"
                    style={{ minHeight: 300, minWidth: 460 }}
                  >
                    <GoalBuilder
                      id={id}
                      websiteId={websiteId}
                      initial={{
                        type: parameters.type as 'path' | 'event',
                        value: parameters.value,
                        name,
                        targetWeekly: parameters.targetWeekly,
                      }}
                      onClose={close}
                    />
                  </Dialog>
                )}
              </ReportEditButton>
            </div>
          </div>

          <div className="flex items-end justify-between gap-4">
            <div className="flex items-baseline gap-2">
              <span
                className={`text-3xl font-bold tabular-nums ${
                  dead ? 'text-muted-foreground/50' : 'text-foreground'
                }`}
              >
                {pct}%
              </span>
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/60">
                {formatMessage(labels.conversionRate)}
              </span>
              {delta != null && delta !== 0 ? (
                <span
                  className={`inline-flex items-center gap-0.5 text-xs font-medium ${
                    delta > 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                  title="vs previous period"
                >
                  {delta > 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {delta > 0 ? '+' : ''}
                  {delta}pp
                </span>
              ) : null}
            </div>
            <Sparkline series={data.series} startDate={startDate} endDate={endDate} />
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-[hsl(0,0%,14%)]">
            <div
              className={`h-full rounded-full transition-all ${
                scaledTarget
                  ? targetHit
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                    : 'bg-gradient-to-r from-[#5e5ba4] to-[#7c79c4]'
                  : 'bg-gradient-to-r from-[#5e5ba4] to-[#7c79c4]'
              }`}
              style={{ width: `${Math.min(scaledTarget ? targetPct : pct, 100)}%` }}
            />
          </div>

          {scaledTarget > 0 && (
            <div className="-mt-2 flex items-center justify-between text-xs">
              <span
                className={`inline-flex items-center gap-1 ${
                  targetHit ? 'text-emerald-400' : 'text-muted-foreground'
                }`}
              >
                <Target className="h-3 w-3" />
                {formatLongNumber(num)} of ~{formatLongNumber(scaledTarget)} target
                <span className="text-muted-foreground/50">
                  ({targetWeekly}/wk over {rangeDays}d)
                </span>
              </span>
              {targetHit ? (
                <span className="font-semibold text-emerald-400">Target hit</span>
              ) : (
                <span className="tabular-nums text-muted-foreground/70">{targetPct}%</span>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <div
              className={`flex items-center gap-1.5 text-sm text-muted-foreground ${dead ? 'opacity-50' : ''}`}
              title={`${num} / ${total}`}
            >
              <Users className="h-3.5 w-3.5" />
              <span className="tabular-nums">
                {formatLongNumber(num)} / {formatLongNumber(total)} visitors
              </span>
            </div>
            {revenue > 0 ? (
              <span
                className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-sm font-semibold text-emerald-300"
                title="Revenue from visitors who completed this goal"
              >
                {formatMinorCurrency(revenue, data.currency)}
              </span>
            ) : null}
          </div>

          {dead && diagnosis ? (
            <div className="rounded-lg border border-[hsl(0,0%,14%)] bg-[hsl(0,0%,9%)] px-3 py-2 text-xs leading-relaxed text-muted-foreground">
              {diagnosis}
            </div>
          ) : null}
        </div>
      )}
    </LoadingPanel>
  );
}
