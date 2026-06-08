import { useWebsiteSessionsQuery } from '@/components/hooks';
import { VisitorsTable } from './VisitorsTable';
import { DataGrid } from '@/components/common/DataGrid';

export function SessionsDataTable({ websiteId }: { websiteId?: string; teamId?: string }) {
  const queryResult = useWebsiteSessionsQuery(websiteId);

  return (
    <DataGrid query={queryResult} allowPaging>
      {({ data }) => {
        return <VisitorsTable data={data} />;
      }}
    </DataGrid>
  );
}
