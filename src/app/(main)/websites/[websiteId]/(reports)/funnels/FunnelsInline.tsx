'use client';
import { Grid, Column } from '@umami/react-zen';
import { SectionHeader } from '@/components/common/SectionHeader';
import { Funnel } from './Funnel';
import { FunnelAddButton } from './FunnelAddButton';
import { useDateRange, useReportsQuery, useNavigation } from '@/components/hooks';
import { LoadingPanel } from '@/components/common/LoadingPanel';
import { Panel } from '@/components/common/Panel';

// Funnels report body WITHOUT WebsiteControls — the date range comes from the
// dashboard's shared picker. Used inline in the dashboard "Funnels" panel tab.
export function FunnelsInline({ websiteId }: { websiteId: string }) {
  const { data, isLoading, error } = useReportsQuery({ websiteId, type: 'funnel' });
  const {
    dateRange: { startDate, endDate },
  } = useDateRange();
  const isShare = useNavigation().pathname?.includes('/share/');

  return (
    <Column gap>
      {!isShare && (
        <SectionHeader>
          <FunnelAddButton websiteId={websiteId} />
        </SectionHeader>
      )}
      <LoadingPanel data={data} isLoading={isLoading} error={error}>
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
