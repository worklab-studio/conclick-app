import { WebsiteCard } from './WebsiteCard';
import { DataGrid } from '@/components/common/DataGrid';
import { useLoginQuery, useUserWebsitesQuery } from '@/components/hooks';
import { useApi } from '@/components/hooks/useApi';
import { formatLongNumber } from '@/lib/format';
import { useMemo } from 'react';
import { WebsiteAddButton } from './WebsiteAddButton';
import { Globe } from 'lucide-react';

export function WebsitesDataTable({ userId, teamId }: { userId?: string; teamId?: string }) {
  const { user } = useLoginQuery();
  const queryResult = useUserWebsitesQuery({ userId: userId || user?.id, teamId });

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
        }).catch(() => ({ visitors: 0 })),
      );

      const allStats = await Promise.all(statsPromises);
      const totalVisitors = allStats.reduce(
        (sum: number, stat: any) => sum + (stat?.visitors || 0),
        0,
      );

      return { totalVisitors };
    },
    enabled: websiteIds.length > 0,
  });

  const totalVisitors = totalStats?.totalVisitors || 0;
  const username = user?.displayName || user?.username || 'User';

  const renderGreeting = () => (
    <div className="text-zinc-400 text-lg">
      Hey <span className="text-zinc-200 font-medium">{username}</span>, you got{' '}
      <span className="text-indigo-400 font-bold text-xl">{formatLongNumber(totalVisitors)}</span>{' '}
      visitors in the last 24 hours.
    </div>
  );

  const renderEmpty = () => (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 border border-dashed border-zinc-800 rounded-2xl bg-zinc-950/50 mt-6">
      <div className="bg-indigo-500/10 p-6 rounded-full mb-6 ring-1 ring-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
        <Globe className="text-indigo-500" size={64} strokeWidth={1.5} />
      </div>
      <h3 className="text-2xl font-bold text-white mb-3">No websites found</h3>
      <p className="text-zinc-400 max-w-md mb-8 text-lg leading-relaxed">
        Add your first website to track its analytics and revenue.
        <br />
        <span className="text-sm opacity-70">It only takes a few seconds to get started.</span>
      </p>
      <div className="transform scale-110">
        <WebsiteAddButton teamId={teamId} />
      </div>
    </div>
  );

  return (
    <DataGrid
      query={queryResult}
      allowSearch
      allowPaging
      renderGreeting={renderGreeting}
      renderEmpty={renderEmpty}
    >
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
