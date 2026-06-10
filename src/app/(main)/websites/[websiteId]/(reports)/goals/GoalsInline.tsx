'use client';
import { useCallback, useMemo, useState } from 'react';
import { Grid, Column } from '@umami/react-zen';
import { SectionHeader } from '@/components/common/SectionHeader';
import { Goal } from './Goal';
import { GoalAddButton } from './GoalAddButton';
import { useDateRange, useReportsQuery, useNavigation } from '@/components/hooks';
import { LoadingPanel } from '@/components/common/LoadingPanel';
import { Panel } from '@/components/common/Panel';
import { TabEmptyState } from '@/components/common/TabEmptyState';
import { Target } from 'lucide-react';
import { SmartSetupButton } from '../SmartSetupButton';

// Goals report body WITHOUT WebsiteControls — date range comes from the
// dashboard's shared picker. Used inline in the dashboard "Goals" panel tab.
export function GoalsInline({ websiteId }: { websiteId: string }) {
  const { data, isLoading, error } = useReportsQuery({ websiteId, type: 'goal' });
  const {
    dateRange: { startDate, endDate },
  } = useDateRange();
  const isShare = useNavigation().pathname?.includes('/share/');

  // Active goals first (by conversions desc); goals whose counts haven't loaded
  // keep their insertion order so the grid doesn't jump while loading.
  const [counts, setCounts] = useState<Record<string, number>>({});
  const onResult = useCallback((id: string, num: number) => {
    setCounts(prev => (prev[id] === num ? prev : { ...prev, [id]: num }));
  }, []);
  const reports = useMemo(() => {
    const list = [...((data?.['data'] as any[]) || [])];
    return list.sort((a, b) => (counts[b.id] ?? -1) - (counts[a.id] ?? -1));
  }, [data, counts]);

  return (
    <Column gap>
      {!isShare && (
        <SectionHeader>
          <div className="flex items-center gap-2">
            <SmartSetupButton websiteId={websiteId} />
            <GoalAddButton websiteId={websiteId} />
          </div>
        </SectionHeader>
      )}
      <LoadingPanel
        data={data}
        isLoading={isLoading}
        error={error}
        isEmpty={data?.['data']?.length === 0}
        renderEmpty={() => (
          <TabEmptyState
            icon={Target}
            title="No goals yet"
            description="Track a conversion target — a page view or a custom event. On a single-page site, use event goals (track an action like 'signup' or 'purchase')."
          />
        )}
      >
        {data && (
          <Grid columns={{ xs: '1fr', md: '1fr 1fr' }} gap>
            {reports.map((report: any) => (
              <Panel key={report.id}>
                <Goal {...report} startDate={startDate} endDate={endDate} onResult={onResult} />
              </Panel>
            ))}
          </Grid>
        )}
      </LoadingPanel>
    </Column>
  );
}
