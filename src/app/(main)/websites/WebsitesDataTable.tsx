import { WebsiteCard } from './WebsiteCard';
import { DataGrid } from '@/components/common/DataGrid';
import { useLoginQuery, useUserWebsitesQuery } from '@/components/hooks';
import { useApi } from '@/components/hooks/useApi';
import { WebsitesOverview, type OverviewSums } from './WebsitesOverview';
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

  // Aggregate 24h stats across every website for the overview strip. These are
  // the same /stats calls the cards make, so they de-dupe in the query cache.
  const { data: overview, isLoading: overviewLoading } = useQuery<OverviewSums>({
    queryKey: ['all-websites-overview', websiteIds.join(',')],
    queryFn: async () => {
      const empty: OverviewSums = {
        pageviews: 0,
        visitors: 0,
        visits: 0,
        bounces: 0,
        totaltime: 0,
        prev: { pageviews: 0, visitors: 0, visits: 0, bounces: 0, totaltime: 0 },
      };

      if (websiteIds.length === 0) return empty;

      const allStats = await Promise.all(
        websiteIds.map((id: string) =>
          get(`/websites/${id}/stats`, {
            startAt: Date.now() - 24 * 60 * 60 * 1000,
            endAt: Date.now(),
          }).catch(() => null),
        ),
      );

      return allStats.reduce((acc: OverviewSums, stat: any) => {
        if (!stat) return acc;
        const c = stat.comparison || {};
        acc.pageviews += stat.pageviews || 0;
        acc.visitors += stat.visitors || 0;
        acc.visits += stat.visits || 0;
        acc.bounces += stat.bounces || 0;
        acc.totaltime += stat.totaltime || 0;
        acc.prev.pageviews += c.pageviews || 0;
        acc.prev.visitors += c.visitors || 0;
        acc.prev.visits += c.visits || 0;
        acc.prev.bounces += c.bounces || 0;
        acc.prev.totaltime += c.totaltime || 0;
        return acc;
      }, empty);
    },
    enabled: websiteIds.length > 0,
  });

  const username = user?.displayName || user?.username || 'User';

  const renderGreeting = () => (
    <div className="text-zinc-400 text-lg">
      Hey <span className="text-zinc-200 font-medium">{username}</span> — here&apos;s the last 24
      hours
      {websiteIds.length
        ? ` across ${websiteIds.length} ${websiteIds.length === 1 ? 'site' : 'sites'}`
        : ''}
      .
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
      {({ data }: { data: any[] }) => (
        <div className="space-y-6">
          <WebsitesOverview overview={overview ?? null} loading={overviewLoading} />
          <div className="border-t border-[hsl(0,0%,12%)] pt-6">
            <div className="mb-4 flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">Your websites</h2>
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-400">
                {data.length}
              </span>
            </div>
            <div
              className="grid gap-5"
              style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}
            >
              {data.map((website: any) => (
                <WebsiteCard key={website.id} website={website} />
              ))}
            </div>
          </div>
        </div>
      )}
    </DataGrid>
  );
}
