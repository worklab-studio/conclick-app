'use client';
import { Grid, Column } from '@umami/react-zen';
import { SectionHeader } from '@/components/common/SectionHeader';
import { Funnel } from './Funnel';
import { FunnelAddButton } from './FunnelAddButton';
import { useDateRange, useReportsQuery, useNavigation } from '@/components/hooks';
import { LoadingPanel } from '@/components/common/LoadingPanel';
import { Panel } from '@/components/common/Panel';
import { SmartSetupButton } from '../SmartSetupButton';

// Saved funnels under the auto-detected one. The dashboard tab always shows the
// auto funnel above this list, so the empty state is a slim hint pointing at
// "Save as funnel" — not a tall "No funnels yet" block that reads as if the
// funnel above doesn't exist.
export function FunnelsInline({ websiteId }: { websiteId: string }) {
  const { data, isLoading, isFetching, error } = useReportsQuery({ websiteId, type: 'funnel' });
  const {
    dateRange: { startDate, endDate },
  } = useDateRange();
  const isShare = useNavigation().pathname?.includes('/share/');
  const reports = (data?.['data'] as any[]) || [];

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
        isEmpty={reports.length === 0}
        renderEmpty={() => (
          <div className="rounded-lg border border-dashed border-[hsl(0,0%,14%)] px-4 py-3 text-[12.5px] text-muted-foreground">
            No saved funnels yet,{' '}
            <span className="font-medium text-foreground/80">Save as funnel</span> keeps the
            auto-detected one above, or build your own with{' '}
            <span className="font-medium text-foreground/80">+ Funnel</span>.
          </div>
        )}
      >
        {data && (
          <>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">
              Saved funnels
            </div>
            <Grid gap>
              {reports.map((report: any) => (
                <Panel key={report.id}>
                  <Funnel {...report} startDate={startDate} endDate={endDate} />
                </Panel>
              ))}
            </Grid>
          </>
        )}
      </LoadingPanel>
    </Column>
  );
}
