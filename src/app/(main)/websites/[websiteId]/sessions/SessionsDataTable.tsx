'use client';

import { useWebsiteSessionsQuery, useNavigation } from '@/components/hooks';
import { VisitorsTable } from './VisitorsTable';
import { VisitorsFilter } from './VisitorsFilter';
import { DataGrid } from '@/components/common/DataGrid';

export function SessionsDataTable({ websiteId }: { websiteId?: string; teamId?: string }) {
  const { query } = useNavigation();
  const userFilter = (query?.userFilter as string) || undefined;
  const queryResult = useWebsiteSessionsQuery(websiteId, userFilter ? { userFilter } : undefined);

  return (
    <div>
      <VisitorsFilter />
      <DataGrid query={queryResult} allowPaging>
        {({ data }) => <VisitorsTable data={data} />}
      </DataGrid>
    </div>
  );
}
