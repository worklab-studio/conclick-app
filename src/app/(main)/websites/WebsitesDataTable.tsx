import Link from 'next/link';
import { WebsiteCard } from './WebsiteCard';
import { DataGrid } from '@/components/common/DataGrid';
import { useLoginQuery, useNavigation, useUserWebsitesQuery } from '@/components/hooks';
import { useApi } from '@/components/hooks/useApi';
import { formatLongNumber } from '@/lib/format';
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
  const { get, useQuery } = useApi();

  // Safely extract website IDs for stats fetching
  const websiteIds = useMemo(() => {
    const data = queryResult.data;
    if (!data) return [];
    if (Array.isArray(data)) return data.map((w: any) => w.id);
    if (data.data && Array.isArray(data.data)) return data.data.map((w: any) => w.id);
    return [];
  }, [queryResult.data]);

  // Fetch stats for all websites and calculate total
  const { data: totalStats } = useQuery({
    queryKey: ['all-websites-stats', websiteIds.join(',')],
    queryFn: async () => {
      if (websiteIds.length === 0) return { totalVisitors: 0 };

      const statsPromises = websiteIds.map((id: string) =>
        get(`/websites/${id}/stats`, {
          startAt: Date.now() - 24 * 60 * 60 * 1000,
          endAt: Date.now(),
        }).catch(() => ({ visitors: 0 }))
      );

      const allStats = await Promise.all(statsPromises);
      const totalVisitors = allStats.reduce((sum: number, stat: any) => sum + (stat?.visitors || 0), 0);

      return { totalVisitors };
    },
    enabled: websiteIds.length > 0,
  });

  const totalVisitors = totalStats?.totalVisitors || 0;
  const username = user?.displayName || user?.username || 'User';

  const renderLink = (row: any) => (
    <Link href={renderUrl(`/websites/${row.id}`, false)}>{row.name}</Link>
  );

  const renderGreeting = () => (
    <div className="text-zinc-400 text-lg">
      Hey <span className="text-zinc-200 font-medium">{username}</span>, you got{' '}
      <span className="text-indigo-400 font-bold text-xl">{formatLongNumber(totalVisitors)}</span>{' '}
      visitors in the last 24 hours.
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
