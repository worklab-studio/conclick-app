import { WebsiteCard, type CardRange } from './WebsiteCard';
import { DataGrid } from '@/components/common/DataGrid';
import { useLoginQuery, useUserWebsitesQuery } from '@/components/hooks';
import { useApi } from '@/components/hooks/useApi';
import { useDateParameters } from '@/components/hooks/useDateParameters';
import { WebsitesOverview, type OverviewSums } from './WebsitesOverview';
import { useMemo, useState } from 'react';
import { keepPreviousData } from '@tanstack/react-query';
import { WebsiteAddButton } from './WebsiteAddButton';
import { DateFilter } from '@/components/input/DateFilter';
import { parseDateRange } from '@/lib/date';
import { Globe } from 'lucide-react';

// The page-level date range, shared by the overview strip, the greeting and
// every website card — the same selector each website's own dashboard uses.
// Persisted so the page reopens on whatever window you actually work in.
const RANGE_STORAGE_KEY = 'conclick.websites.dateRange';

// parseDateRange('all') only reaches back one year; "all time" here means the
// same fixed epoch WebsiteCard's connected-check already uses, so the two
// "since forever" queries agree with each other (and share the query cache).
const ALL_TIME_START = new Date('2020-01-01').getTime();

// Copy per range value: how the greeting phrases it mid-sentence, the short
// chip on each card, and what the delta pills compare against. `compare: null`
// means comparison is meaningless (all time) and the cards hide their pill.
const RANGE_COPY: Record<string, { phrase: string; chip: string; compare: string | null }> = {
  '0day': { phrase: 'today so far', chip: 'Today', compare: 'previous day' },
  '24hour': { phrase: 'the last 24 hours', chip: '24h', compare: 'previous 24h' },
  '0week': { phrase: 'this week', chip: 'This week', compare: 'previous week' },
  '7day': { phrase: 'the last 7 days', chip: '7d', compare: 'previous 7 days' },
  '0month': { phrase: 'this month', chip: 'This month', compare: 'previous month' },
  '30day': { phrase: 'the last 30 days', chip: '30d', compare: 'previous 30 days' },
  '90day': { phrase: 'the last 90 days', chip: '90d', compare: 'previous 90 days' },
  '0year': { phrase: 'this year', chip: 'This year', compare: 'previous year' },
  '6month': { phrase: 'the last 6 months', chip: '6mo', compare: 'previous 6 months' },
  '12month': { phrase: 'the last 12 months', chip: '12mo', compare: 'previous 12 months' },
  all: { phrase: 'all time', chip: 'All time', compare: null },
};
// Custom "range:start:end" picks from the date picker.
const CUSTOM_COPY = { phrase: 'the selected dates', chip: 'Custom', compare: 'previous period' };

function buildRange(value: string, timezone?: string): CardRange {
  const copy = RANGE_COPY[value] ?? CUSTOM_COPY;

  if (value === 'all') {
    return { value, startAt: ALL_TIME_START, endAt: Date.now(), unit: 'month', ...copy };
  }

  const parsed = parseDateRange(value, undefined, timezone);
  if (!parsed) {
    // Unknown value (stale localStorage from an older build): fall back to 24h
    // rather than rendering an empty page.
    const fallback = parseDateRange('24hour', undefined, timezone);
    return {
      value: '24hour',
      startAt: fallback.startDate.getTime(),
      endAt: fallback.endDate.getTime(),
      unit: fallback.unit,
      ...RANGE_COPY['24hour'],
    };
  }

  return {
    value,
    startAt: parsed.startDate.getTime(),
    endAt: parsed.endDate.getTime(),
    unit: parsed.unit,
    ...copy,
  };
}

export function WebsitesDataTable({ userId, teamId }: { userId?: string; teamId?: string }) {
  const { user } = useLoginQuery();
  const queryResult = useUserWebsitesQuery({ userId: userId || user?.id, teamId });
  const { timezone } = useDateParameters();

  const [rangeValue, setRangeValue] = useState<string>(() => {
    if (typeof window === 'undefined') return '24hour';
    return localStorage.getItem(RANGE_STORAGE_KEY) || '24hour';
  });

  const handleRangeChange = (value: string) => {
    setRangeValue(value);
    try {
      localStorage.setItem(RANGE_STORAGE_KEY, value);
    } catch {
      // Private-mode storage failures just lose persistence, not the feature.
    }
  };

  const range = useMemo(() => buildRange(rangeValue, timezone), [rangeValue, timezone]);

  const { get, useQuery } = useApi();

  // Safely extract website IDs for stats fetching
  const websiteIds = useMemo(() => {
    const data = queryResult.data;
    if (!data) return [];
    if (Array.isArray(data)) return data.map((w: any) => w.id);
    if (data.data && Array.isArray(data.data)) return data.data.map((w: any) => w.id);
    return [];
  }, [queryResult.data]);

  // ONE request for the whole fleet: stats + comparison + visitors series for
  // every site, from /api/websites/overview. The old shape (2 HTTP calls per
  // site) paid the auth/permission tax 22 times and stampeded the connection
  // pool — the fleet took 9-15s to settle. staleTime keeps range-hopping
  // instant for a minute; keepPreviousData means a range switch morphs the
  // numbers in place instead of blanking to skeletons, and because the whole
  // fleet arrives in one response, the strip swap is atomic by construction.
  const { data: batch } = useQuery<{
    data: { websiteId: string; stats: any; sessions: any[] }[];
    window: { startAt: number; endAt: number; unit: string };
  }>({
    queryKey: ['websites:overview-batch', websiteIds.join(','), range.value, timezone],
    queryFn: async () => {
      const res = await get('/websites/overview', {
        websiteIds: websiteIds.join(','),
        startAt: range.startAt,
        endAt: range.endAt,
        unit: range.unit,
        timezone,
      });
      // The window rides along so card sparklines bucket a placeholder series
      // against the window it was fetched for, not the newly selected one.
      return { ...res, window: { startAt: range.startAt, endAt: range.endAt, unit: range.unit } };
    },
    enabled: websiteIds.length > 0,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  const overview = useMemo<OverviewSums | null>(() => {
    if (!batch?.data) return null;
    return batch.data.reduce(
      (acc: OverviewSums, row: any) => {
        const stat = row.stats;
        if (!stat) return acc;
        const c = stat.comparison || {};
        acc.pageviews += Number(stat.pageviews) || 0;
        acc.visitors += Number(stat.visitors) || 0;
        acc.visits += Number(stat.visits) || 0;
        acc.bounces += Number(stat.bounces) || 0;
        acc.totaltime += Number(stat.totaltime) || 0;
        acc.prev.pageviews += Number(c.pageviews) || 0;
        acc.prev.visitors += Number(c.visitors) || 0;
        acc.prev.visits += Number(c.visits) || 0;
        acc.prev.bounces += Number(c.bounces) || 0;
        acc.prev.totaltime += Number(c.totaltime) || 0;
        return acc;
      },
      {
        pageviews: 0,
        visitors: 0,
        visits: 0,
        bounces: 0,
        totaltime: 0,
        prev: { pageviews: 0, visitors: 0, visits: 0, bounces: 0, totaltime: 0 },
      },
    );
  }, [batch]);
  const overviewLoading = !overview;

  // Per-site slices for the cards (they render from the batch — zero requests
  // of their own).
  const preloadedById = useMemo(() => {
    const map: Record<string, { stats: any; sessions: any[]; window: any }> = {};
    for (const row of batch?.data || []) {
      map[row.websiteId] = { stats: row.stats, sessions: row.sessions, window: batch.window };
    }
    return map;
  }, [batch]);

  const username = user?.displayName || user?.username || 'User';

  const renderGreeting = () => (
    <div className="text-zinc-400 text-lg">
      Hey <span className="text-zinc-200 font-medium">{username}</span> — here&apos;s {range.phrase}
      {websiteIds.length
        ? ` across ${websiteIds.length} ${websiteIds.length === 1 ? 'site' : 'sites'}`
        : ''}
      .
    </div>
  );

  // Sits beside the search box in DataGrid's action slot — the same dropdown
  // every website's own dashboard uses, so the interaction is already familiar.
  const renderActions = () => (
    <div className="shrink-0">
      <DateFilter value={rangeValue} onChange={handleRangeChange} showAllTime />
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
      renderActions={renderActions}
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
                <WebsiteCard
                  key={website.id}
                  website={website}
                  range={range}
                  batched
                  preloaded={preloadedById[website.id]}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </DataGrid>
  );
}
