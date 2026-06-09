'use client';
import { Grid, Column } from '@umami/react-zen';
import { SectionHeader } from '@/components/common/SectionHeader';
import { Goal } from './Goal';
import { GoalAddButton } from './GoalAddButton';
import { useDateRange, useReportsQuery, useNavigation } from '@/components/hooks';
import { LoadingPanel } from '@/components/common/LoadingPanel';
import { Panel } from '@/components/common/Panel';
import { TabEmptyState } from '@/components/common/TabEmptyState';
import { Target } from 'lucide-react';

// Goals report body WITHOUT WebsiteControls — date range comes from the
// dashboard's shared picker. Used inline in the dashboard "Goals" panel tab.
export function GoalsInline({ websiteId }: { websiteId: string }) {
  const { data, isLoading, error } = useReportsQuery({ websiteId, type: 'goal' });
  const {
    dateRange: { startDate, endDate },
  } = useDateRange();
  const isShare = useNavigation().pathname?.includes('/share/');

  return (
    <Column gap>
      {!isShare && (
        <SectionHeader>
          <GoalAddButton websiteId={websiteId} />
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
            {data['data']?.map((report: any) => (
              <Panel key={report.id}>
                <Goal {...report} startDate={startDate} endDate={endDate} />
              </Panel>
            ))}
          </Grid>
        )}
      </LoadingPanel>
    </Column>
  );
}
