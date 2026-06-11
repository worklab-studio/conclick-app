'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Target } from 'lucide-react';
import { Goal } from './Goal';
import { GoalAddButton } from './GoalAddButton';
import { useDateRange, useReportsQuery, useNavigation } from '@/components/hooks';
import { LoadingPanel } from '@/components/common/LoadingPanel';
import { TabEmptyState } from '@/components/common/TabEmptyState';
import { SmartSetupButton } from '../SmartSetupButton';

// Goals report body WITHOUT WebsiteControls — date range comes from the dashboard's
// shared picker. House chrome (matches the rest of the dashboard tabs).
export function GoalsInline({ websiteId }: { websiteId: string }) {
  const { data, isLoading, error } = useReportsQuery({ websiteId, type: 'goal' });
  const {
    dateRange: { startDate, endDate },
  } = useDateRange();
  const isShare = useNavigation().pathname?.includes('/share/');

  // Active goals first (by conversions desc). Commit a new order only once every goal
  // has reported for the current range; otherwise hold the last committed order so the
  // grid doesn't reshuffle card-by-card while loading. Reset on date-range change.
  const rangeKey = `${+startDate}:${+endDate}`;
  const [counts, setCounts] = useState<Record<string, number>>({});
  const lastOrder = useRef<string[]>([]);
  useEffect(() => {
    setCounts({});
  }, [rangeKey]);
  const onResult = useCallback((id: string, num: number) => {
    setCounts(prev => (prev[id] === num ? prev : { ...prev, [id]: num }));
  }, []);

  const reports = useMemo(() => {
    const list = [...((data?.['data'] as any[]) || [])];
    if (list.length && list.every(r => counts[r.id] !== undefined)) {
      list.sort((a, b) => counts[b.id] - counts[a.id]);
      lastOrder.current = list.map(r => r.id);
    } else if (lastOrder.current.length) {
      const pos = new Map(lastOrder.current.map((id, i) => [id, i] as const));
      list.sort((a, b) => (pos.get(a.id) ?? Infinity) - (pos.get(b.id) ?? Infinity));
    }
    return list;
  }, [data, counts]);

  return (
    <div className="space-y-3">
      {!isShare && (
        <div className="flex items-center justify-end gap-2">
          <SmartSetupButton websiteId={websiteId} />
          <GoalAddButton websiteId={websiteId} />
        </div>
      )}
      <LoadingPanel
        data={data}
        isLoading={isLoading}
        error={error}
        isEmpty={(data?.['data'] as any[])?.length === 0}
        renderEmpty={() => (
          <TabEmptyState
            icon={Target}
            title="No goals yet"
            description="Track a conversion target — a page view or a custom event. On a single-page site, use event goals (track an action like 'signup' or 'purchase')."
          />
        )}
      >
        {data && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {reports.map((report: any) => (
              <div
                key={report.id}
                className="rounded-lg border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,9%)] p-4"
              >
                <Goal {...report} startDate={startDate} endDate={endDate} onResult={onResult} />
              </div>
            ))}
          </div>
        )}
      </LoadingPanel>
    </div>
  );
}
