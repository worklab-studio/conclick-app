'use client';
import { Grid, Column } from '@umami/react-zen';
import { SectionHeader } from '@/components/common/SectionHeader';
import { Funnel } from './Funnel';
import { FunnelAddButton } from './FunnelAddButton';
import { useDateRange, useReportsQuery, useNavigation } from '@/components/hooks';
import { LoadingPanel } from '@/components/common/LoadingPanel';
import { Panel } from '@/components/common/Panel';
import { TabEmptyState } from '@/components/common/TabEmptyState';
import { Filter } from 'lucide-react';
import { SmartSetupButton } from '../SmartSetupButton';

// Funnels report body WITHOUT WebsiteControls — the date range comes from the
// dashboard's shared picker. Used inline in the dashboard "Funnels" panel tab.
export function FunnelsInline({ websiteId }: { websiteId: string }) {
  const { data, isLoading, isFetching, error } = useReportsQuery({ websiteId, type: 'funnel' });
  const {
    dateRange: { startDate, endDate },
  } = useDateRange();
  const isShare = useNavigation().pathname?.includes('/share/');

  return (
    <Column gap>
      {!isShare && (
        <SectionHeader>
          <div className="flex items-center gap-2">
            <SmartSetupButton websiteId={websiteId} />
            <FunnelAddButton websiteId={websiteId} />
          </div>
        </SectionHeader>
      )}
      <LoadingPanel
        data={data}
        isLoading={isLoading}
        isFetching={isFetching}
        error={error}
        isEmpty={data?.['data']?.length === 0}
        renderEmpty={() => (
          <TabEmptyState
            icon={Filter}
            title="No funnels yet"
            description="Build a funnel to see where visitors drop off across a sequence of steps. On a single-page site, use tracked events (e.g. view_pricing → click_buy → purchase) as the steps."
          />
        )}
      >
        {data && (
          <Grid gap>
            {data['data']?.map((report: any) => (
              <Panel key={report.id}>
                <Funnel {...report} startDate={startDate} endDate={endDate} />
              </Panel>
            ))}
          </Grid>
        )}
      </LoadingPanel>
    </Column>
  );
}
