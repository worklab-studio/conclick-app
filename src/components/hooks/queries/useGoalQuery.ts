import { useApi } from '../useApi';
import { useDateParameters } from '@/components/hooks/useDateParameters';
import { useFilterParameters } from '../useFilterParameters';
import { getCompareDate } from '@/lib/date';

export interface GoalQueryResult {
  num: number;
  total: number;
  revenue?: number; // minor units
  currency?: string | null;
  series?: { t: string; y: number }[];
}

// Goal runner with a built-in previous-period comparison (same engine as the goal
// report route). Mirrors useFunnelQuery's two-query pattern.
export function useGoalQuery(
  websiteId: string,
  { type, value, compare = true }: { type: string; value: string; compare?: boolean },
) {
  const { post, useQuery } = useApi();
  const { startDate, endDate, timezone } = useDateParameters();
  const filters = useFilterParameters();
  const valid = !!websiteId && !!type && !!value;

  const current = useQuery<GoalQueryResult>({
    queryKey: [
      'reports:goal',
      { websiteId, startDate, endDate, timezone, type, value, ...filters },
    ],
    queryFn: () =>
      post('/reports/goal', {
        websiteId,
        type: 'goal',
        filters,
        parameters: { startDate, endDate, timezone, type, value },
      }),
    enabled: valid,
  });

  const prev = getCompareDate('prev', new Date(startDate), new Date(endDate));
  const previous = useQuery<GoalQueryResult>({
    queryKey: [
      'reports:goal:prev',
      { websiteId, prev: prev?.startDate, timezone, type, value, ...filters },
    ],
    queryFn: () =>
      post('/reports/goal', {
        websiteId,
        type: 'goal',
        filters,
        parameters: {
          startDate: (prev as any).startDate,
          endDate: (prev as any).endDate,
          timezone,
          type,
          value,
        },
      }),
    enabled: valid && compare && !!prev?.startDate,
  });

  return {
    data: current.data,
    compareData: previous.data,
    isLoading: current.isLoading,
    isFetching: current.isFetching,
    error: current.error,
  };
}
