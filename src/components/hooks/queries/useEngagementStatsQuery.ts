import { useApi } from '../useApi';
import { useFilterParameters } from '../useFilterParameters';
import { useDateParameters } from '@/components/hooks/useDateParameters';

export interface EngagementStats {
  avgScroll: number | null;
  clicksPerVisit: number | null;
  visits: number;
  sessions: number;
}

export function useEngagementStatsQuery(websiteId?: string) {
  const { get, useQuery } = useApi();
  const { startAt, endAt, unit, timezone } = useDateParameters();
  const filters = useFilterParameters();

  return useQuery<EngagementStats>({
    queryKey: ['websites:engagement', { websiteId, startAt, endAt, unit, timezone, ...filters }],
    queryFn: () =>
      get(`/websites/${websiteId}/engagement`, { startAt, endAt, unit, timezone, ...filters }),
    enabled: !!websiteId,
  });
}
