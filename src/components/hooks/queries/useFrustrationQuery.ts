import { useApi } from '../useApi';
import { useFilterParameters } from '../useFilterParameters';
import { useDateParameters } from '@/components/hooks/useDateParameters';

export interface FrustrationRow {
  type: string;
  selector: string;
  text: string | null;
  count: number;
}

export function useFrustrationQuery(websiteId?: string, pathOverride?: string) {
  const { get, useQuery } = useApi();
  const { startAt, endAt, unit, timezone } = useDateParameters();
  const filters = useFilterParameters();
  // pathOverride scopes friction to one page (used by the funnel leak diagnosis),
  // independent of the dashboard filter bar.
  const merged = pathOverride ? { ...filters, path: pathOverride } : filters;

  return useQuery<FrustrationRow[]>({
    queryKey: ['websites:frustration', { websiteId, startAt, endAt, unit, timezone, ...merged }],
    queryFn: () =>
      get(`/websites/${websiteId}/frustration`, { startAt, endAt, unit, timezone, ...merged }),
    enabled: !!websiteId,
  });
}
