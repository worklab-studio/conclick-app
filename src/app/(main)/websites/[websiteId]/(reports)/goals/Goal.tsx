import { Dialog } from '@umami/react-zen';
import { Globe, Zap, Users } from 'lucide-react';
import { ReportEditButton } from '@/components/input/ReportEditButton';
import { useMessages, useResultQuery } from '@/components/hooks';
import { LoadingPanel } from '@/components/common/LoadingPanel';
import { formatLongNumber } from '@/lib/format';
import { GoalEditForm } from './GoalEditForm';

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
}

export type GoalData = { num: number; total: number };

export function Goal({ id, name, type, parameters, websiteId, startDate, endDate }: GoalProps) {
  const { formatMessage, labels } = useMessages();
  const { data, error, isLoading, isFetching } = useResultQuery<GoalData>(type, {
    websiteId,
    startDate,
    endDate,
    ...parameters,
  });
  const isPage = parameters?.type === 'path';
  const Icon = isPage ? Globe : Zap;
  const num = data?.num || 0;
  const total = data?.total || 0;
  const pct = total ? Math.round((num / total) * 100) : 0;

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

          <div className="flex items-end justify-between gap-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tabular-nums text-foreground">{pct}%</span>
              <span className="text-xs text-muted-foreground">
                {formatMessage(labels.conversionRate).toLowerCase()}
              </span>
            </div>
            <div
              className="flex items-center gap-1.5 text-sm text-muted-foreground"
              title={`${num} / ${total}`}
            >
              <Users className="h-3.5 w-3.5" />
              <span className="tabular-nums">
                {formatLongNumber(num)} / {formatLongNumber(total)}
              </span>
            </div>
          </div>

          <div className="h-2.5 w-full overflow-hidden rounded-full bg-[hsl(0,0%,14%)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#5e5ba4] to-[#7c79c4] transition-all"
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
        </div>
      )}
    </LoadingPanel>
  );
}
