import { useApi } from '../useApi';
import { useFilterParameters } from '../useFilterParameters';
import { useDateParameters } from '@/components/hooks/useDateParameters';

export interface FrustrationRow {
  type: string;
  selector: string;
  text: string | null;
  count: number;
}

export function useFrustrationQuery(websiteId?: string) {
  const { get, useQuery } = useApi();
  const { startAt, endAt, unit, timezone } = useDateParameters();
  const filters = useFilterParameters();

  return useQuery<FrustrationRow[]>({
    queryKey: ['websites:frustration', { websiteId, startAt, endAt, unit, timezone, ...filters }],
    queryFn: () =>
      get(`/websites/${websiteId}/frustration`, { startAt, endAt, unit, timezone, ...filters }),
    enabled: !!websiteId,
  });
}
