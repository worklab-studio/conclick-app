import { useEffect, useMemo } from 'react';
import { Dialog } from '@umami/react-zen';
import { Globe, Zap, Users, TrendingUp, TrendingDown } from 'lucide-react';
import { ReportEditButton } from '@/components/input/ReportEditButton';
import { useMessages, useGoalQuery } from '@/components/hooks';
import { LoadingPanel } from '@/components/common/LoadingPanel';
import { formatLongNumber } from '@/lib/format';
import { GoalEditForm } from './GoalEditForm';
import { GoalFunnelButton } from './GoalFunnelButton';

export interface GoalProps {
  id: string;
  name: string;
  type: string;
  parameters: {
    name: string;
    type: string;
    value: string;
  };
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

function money(minor: number, currency?: string | null) {
  const major = (minor || 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: Number.isInteger(major) ? 0 : 2,
    }).format(major);
  } catch {
    return `$${major.toFixed(0)}`;
  }
}

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Tiny inline sparkline of converting sessions per day (last ≤14 days, zeros
// densified). Pure SVG, no chart lib.
function Sparkline({ series, endDate }: { series: GoalData['series']; endDate?: Date }) {
  const points = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const s of series || []) byDay.set(String(s.t).slice(0, 10), s.y);
    const end = endDate ? new Date(endDate) : new Date();
    const out: number[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(d.getDate() - i);
      out.push(byDay.get(dayKey(d)) || 0);
    }
    return out;
  }, [series, endDate]);

  const max = Math.max(1, ...points);
  if (!points.some(p => p > 0)) return null;

  const W = 112;
  const H = 24;
  const step = W / (points.length - 1);
  const poly = points.map((p, i) => `${i * step},${H - 2 - (p / max) * (H - 4)}`).join(' ');

  return (
    <svg width={W} height={H} className="shrink-0 opacity-80" aria-hidden>
      <polyline points={poly} fill="none" stroke="#7c79c4" strokeWidth="1.5" />
    </svg>
  );
}

export function Goal({ id, name, type, parameters, websiteId, endDate, onResult }: GoalProps) {
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

  // Trend vs previous period, in percentage points.
  const prevNum = compareData?.num || 0;
  const prevTotal = compareData?.total || 0;
  const delta =
    compareData && prevTotal > 0
      ? Math.round((num / Math.max(total, 1) - prevNum / prevTotal) * 1000) / 10
      : null;

  useEffect(() => {
    if (data) onResult?.(id, num);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, num, id]);

  return (
    <LoadingPanel data={data} isLoading={isLoading} isFetching={isFetching} error={error}>
      {data && (
        <div className={`space-y-4 ${dead ? 'opacity-60' : ''}`}>
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
                    style={{ minHeight: 300, minWidth: 400 }}
                  >
                    <GoalEditForm id={id} websiteId={websiteId} onClose={close} />
                  </Dialog>
                )}
              </ReportEditButton>
            </div>
          </div>

          <div className="flex items-end justify-between gap-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tabular-nums text-foreground">{pct}%</span>
              <span className="text-xs text-muted-foreground">
                {formatMessage(labels.conversionRate).toLowerCase()}
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
            <Sparkline series={data.series} endDate={endDate} />
          </div>

          <div className="h-2.5 w-full overflow-hidden rounded-full bg-[hsl(0,0%,14%)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#5e5ba4] to-[#7c79c4] transition-all"
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div
              className="flex items-center gap-1.5 text-sm text-muted-foreground"
              title={`${num} / ${total}`}
            >
              <Users className="h-3.5 w-3.5" />
              <span className="tabular-nums">
                {formatLongNumber(num)} / {formatLongNumber(total)}
              </span>
            </div>
            {revenue > 0 ? (
              <span
                className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-sm font-semibold text-emerald-300"
                title="Revenue from visitors who completed this goal"
              >
                {money(revenue, data.currency)}
              </span>
            ) : dead ? (
              <span className="text-xs text-muted-foreground/70">
                No conversions in this period yet.
              </span>
            ) : null}
          </div>
        </div>
      )}
    </LoadingPanel>
  );
}
