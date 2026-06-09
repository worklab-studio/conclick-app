import { Dialog } from '@umami/react-zen';
import { Globe, Zap, Users } from 'lucide-react';
import { useMessages, useResultQuery } from '@/components/hooks';
import { LoadingPanel } from '@/components/common/LoadingPanel';
import { formatLongNumber } from '@/lib/format';
import { ReportEditButton } from '@/components/input/ReportEditButton';
import { FunnelEditForm } from './FunnelEditForm';

type FunnelResult = {
  type: string;
  value: string;
  visitors: number;
  previous: number;
  dropped: number;
  dropoff: number;
  remaining: number;
};

export function Funnel({ id, name, type, parameters, websiteId }: any) {
  const { formatMessage, labels } = useMessages();
  const { data, error, isLoading } = useResultQuery(type, {
    websiteId,
    ...parameters,
  });
  const rows = (data as FunnelResult[]) || [];

  return (
    <LoadingPanel data={data} isLoading={isLoading} error={error}>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="truncate text-[15px] font-semibold text-foreground">{name}</div>
          <ReportEditButton id={id} name={name} type={type}>
            {({ close }: { close: () => void }) => (
              <Dialog
                title={formatMessage(labels.funnel)}
                variant="modal"
                style={{ minHeight: 300, minWidth: 400 }}
              >
                <FunnelEditForm id={id} websiteId={websiteId} onClose={close} />
              </Dialog>
            )}
          </ReportEditButton>
        </div>

        <div>
          {rows.map((step, index) => {
            const isPage = step.type === 'path';
            const Icon = isPage ? Globe : Zap;
            const remainingPct = Math.round(step.remaining * 100);
            const dropPct = Math.round(step.dropoff * 100);
            const isLast = index === rows.length - 1;
            return (
              <div key={index} className="flex gap-3.5">
                {/* number + connector */}
                <div className="flex flex-col items-center">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#5e5ba4] text-xs font-bold text-white">
                    {index + 1}
                  </div>
                  {!isLast && <div className="my-1 w-px flex-1 bg-[hsl(0,0%,16%)]" />}
                </div>

                {/* body */}
                <div className={`min-w-0 flex-1 ${isLast ? '' : 'pb-5'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 shrink-0 text-[#8b88cf]" />
                      <span className="truncate text-sm font-medium text-foreground">
                        {step.value}
                      </span>
                    </div>
                    <span className="shrink-0 text-lg font-bold tabular-nums text-foreground">
                      {remainingPct}%
                    </span>
                  </div>

                  <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[hsl(0,0%,14%)]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#5e5ba4] to-[#7c79c4] transition-all"
                      style={{ width: `${Math.max(0, Math.min(step.remaining * 100, 100))}%` }}
                    />
                  </div>

                  <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5" title={String(step.visitors)}>
                      <Users className="h-3 w-3" />
                      {formatLongNumber(step.visitors)}{' '}
                      {formatMessage(labels.visitors).toLowerCase()}
                    </span>
                    {index > 0 && step.dropped > 0 ? (
                      <span className="text-red-400/80">
                        −{formatLongNumber(step.dropped)} dropped ({dropPct}%)
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </LoadingPanel>
  );
}
