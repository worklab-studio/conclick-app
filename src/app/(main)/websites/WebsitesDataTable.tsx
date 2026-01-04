import Link from 'next/link';
import { WebsiteCard } from './WebsiteCard';
import { DataGrid } from '@/components/common/DataGrid';
import { useLoginQuery, useNavigation, useUserWebsitesQuery } from '@/components/hooks';
import { useMemo } from 'react';

export function WebsitesDataTable({
  userId,
  teamId,
  allowEdit = true,
  allowView = true,
  showActions = true,
}: {
  userId?: string;
  teamId?: string;
  allowEdit?: boolean;
  allowView?: boolean;
  showActions?: boolean;
}) {
  const { user } = useLoginQuery();
  const queryResult = useUserWebsitesQuery({ userId: userId || user?.id, teamId });
  const { renderUrl } = useNavigation();

  const renderLink = (row: any) => (
    <Link href={renderUrl(`/websites/${row.id}`, false)}>{row.name}</Link>
  );

  const renderGreeting = () => (
    <div className="text-foreground">
      <span className="text-base">
        Hey <span className="font-semibold">{user?.displayName || user?.username || 'User'}</span>
      </span>
    </div>
  );

  return (
    <DataGrid query={queryResult} allowSearch allowPaging renderGreeting={renderGreeting}>
      {({ data }) => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((website: any) => (
            <WebsiteCard key={website.id} website={website} />
          ))}
        </div>
      )}
    </DataGrid>
  );
}
