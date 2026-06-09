import { useApi } from '../useApi';
import { useFilterParameters } from '../useFilterParameters';
import { useDateParameters } from '@/components/hooks/useDateParameters';

export interface RevenueBySourceRow {
  source: string;
  customers: number;
  revenue: number;
  currency: string;
}

export function useRevenueBySourceQuery(websiteId?: string) {
  const { get, useQuery } = useApi();
  const { startAt, endAt, unit, timezone } = useDateParameters();
  const filters = useFilterParameters();

  return useQuery<RevenueBySourceRow[]>({
    queryKey: [
      'websites:revenue-sources',
      { websiteId, startAt, endAt, unit, timezone, ...filters },
    ],
    queryFn: () =>
      get(`/websites/${websiteId}/revenue-sources`, { startAt, endAt, unit, timezone, ...filters }),
    enabled: !!websiteId,
  });
}
