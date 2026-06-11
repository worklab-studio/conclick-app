import { useApi } from '../useApi';
import { useDateParameters } from '@/components/hooks/useDateParameters';

export type ClickMapCohort =
  | 'all'
  | 'paid'
  | 'non_buyer'
  | 'refunded'
  | 'high_ltv'
  | 'abandoner'
  | 'trial';

export interface ClickMapDepthBucket {
  bucket: number;
  clicks: number;
  sessions: number;
  revenue: number;
}

export interface ClickMapElement {
  selector: string;
  label: string | null;
  clicks: number;
  sessions: number;
  revenue: number;
  medianY?: number | null;
}

export interface ClickMapResult {
  cohort: ClickMapCohort;
  estimated: boolean;
  currency: string;
  hasRevenueData: boolean;
  total: { clicks: number; sessions: number; revenue: number };
  depth: ClickMapDepthBucket[];
  elements: ClickMapElement[];
}

export function useClickMapQuery(
  websiteId?: string,
  urlPath?: string,
  cohort: ClickMapCohort = 'all',
) {
  const { get, useQuery } = useApi();
  const { startAt, endAt, unit, timezone } = useDateParameters();

  return useQuery<ClickMapResult>({
    queryKey: [
      'websites:click-map',
      { websiteId, urlPath, cohort, startAt, endAt, unit, timezone },
    ],
    queryFn: () =>
      get(`/websites/${websiteId}/click-map`, {
        startAt,
        endAt,
        unit,
        timezone,
        path: urlPath,
        cohort,
      }),
    enabled: !!websiteId && !!urlPath,
  });
}
