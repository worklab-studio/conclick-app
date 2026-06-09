import { useApi } from '../useApi';
import { useFilterParameters } from '../useFilterParameters';
import { useDateParameters } from '@/components/hooks/useDateParameters';

export interface CampaignRow {
  campaign: string;
  visitors: number;
  paying: number;
  revenue: number;
  currency: string;
}

export function useCampaignsQuery(websiteId?: string) {
  const { get, useQuery } = useApi();
  const { startAt, endAt, unit, timezone } = useDateParameters();
  const filters = useFilterParameters();

  return useQuery<CampaignRow[]>({
    queryKey: ['websites:campaigns', { websiteId, startAt, endAt, unit, timezone, ...filters }],
    queryFn: () =>
      get(`/websites/${websiteId}/campaigns`, { startAt, endAt, unit, timezone, ...filters }),
    enabled: !!websiteId,
  });
}
