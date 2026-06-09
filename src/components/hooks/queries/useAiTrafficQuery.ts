import { useApi } from '../useApi';
import { useFilterParameters } from '../useFilterParameters';
import { useDateParameters } from '@/components/hooks/useDateParameters';

export interface AiTrafficRow {
  source: string;
  visitors: number;
  paying: number;
  revenue: number;
  currency: string;
}

export function useAiTrafficQuery(websiteId?: string) {
  const { get, useQuery } = useApi();
  const { startAt, endAt, unit, timezone } = useDateParameters();
  const filters = useFilterParameters();

  return useQuery<AiTrafficRow[]>({
    queryKey: ['websites:ai-traffic', { websiteId, startAt, endAt, unit, timezone, ...filters }],
    queryFn: () =>
      get(`/websites/${websiteId}/ai-traffic`, { startAt, endAt, unit, timezone, ...filters }),
    enabled: !!websiteId,
  });
}
