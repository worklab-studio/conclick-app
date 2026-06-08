'use client';

import { isSameDay } from 'date-fns';
import { Eye, Zap } from 'lucide-react';
import { LoadingPanel } from '@/components/common/LoadingPanel';
import { useMessages, useSessionActivityQuery, useTimezone } from '@/components/hooks';

export function SessionActivity({
  websiteId,
  sessionId,
  startDate,
  endDate,
}: {
  websiteId: string;
  sessionId: string;
  startDate: Date;
  endDate: Date;
}) {
  const { formatMessage, labels } = useMessages();
  const { formatTimezoneDate } = useTimezone();
  const { data, isLoading, error } = useSessionActivityQuery(
    websiteId,
    sessionId,
    startDate,
    endDate,
  );
  let lastDay: any = null;

  return (
    <LoadingPanel data={data} isLoading={isLoading} error={error}>
      <div className="space-y-0.5">
        {data?.map(({ eventId, createdAt, urlPath, eventName }: any) => {
          const showHeader = !lastDay || !isSameDay(new Date(lastDay), new Date(createdAt));
          lastDay = createdAt;

          return (
            <div key={eventId}>
              {showHeader && (
                <div className="mb-2 mt-4 text-[13px] font-bold text-foreground first:mt-0">
                  {formatTimezoneDate(createdAt, 'PPPP')}
                </div>
              )}
              <div className="flex items-center gap-3.5 py-1.5 text-sm">
                <span className="h-2 w-2 shrink-0 rounded-full bg-[#5e5ba4] shadow-[0_0_0_4px_rgba(94,91,164,0.12)]" />
                <span className="w-24 shrink-0 tabular-nums text-muted-foreground">
                  {formatTimezoneDate(createdAt, 'pp')}
                </span>
                <span className="inline-flex min-w-0 items-center gap-2 text-foreground">
                  {eventName ? (
                    <Zap className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                  ) : (
                    <Eye className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                  )}
                  <span className="shrink-0 text-muted-foreground">
                    {eventName
                      ? formatMessage(labels.triggeredEvent)
                      : formatMessage(labels.viewedPage)}
                  </span>
                  <span className="truncate rounded-md bg-[#5e5ba4]/12 px-1.5 py-0.5 font-mono text-xs text-indigo-300">
                    {eventName || urlPath}
                  </span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </LoadingPanel>
  );
}
