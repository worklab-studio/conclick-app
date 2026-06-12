'use client';

import { Dialog } from '@umami/react-zen';
import { useMessages, useResultQuery } from '@/components/hooks';
import { LoadingPanel } from '@/components/common/LoadingPanel';
import { ReportEditButton } from '@/components/input/ReportEditButton';
import { FunnelEditForm } from './FunnelEditForm';
import { FunnelChart } from './FunnelChart';

export function Funnel({ id, name, type, parameters, websiteId }: any) {
  const { formatMessage, labels } = useMessages();
  const { data, error, isLoading, isFetching } = useResultQuery(type, {
    websiteId,
    ...parameters,
  });
  const rows = (data as any[]) || [];

  return (
    <LoadingPanel data={data} isLoading={isLoading} isFetching={isFetching} error={error}>
      <div className="space-y-3">
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
        {rows.length > 0 ? <FunnelChart rows={rows} websiteId={websiteId} /> : null}
      </div>
    </LoadingPanel>
  );
}
