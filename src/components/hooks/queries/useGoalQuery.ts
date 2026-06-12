import { keepPreviousSameWebsite } from './sameWebsitePlaceholder';
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
    // Keep the card rendered across key changes — no flash back to skeletons.
    // Scoped to this website: never bridges across a website switch.
    placeholderData: keepPreviousSameWebsite(websiteId),
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
    placeholderData: keepPreviousSameWebsite(websiteId),
  });

  return {
    data: current.data,
    // A disabled query still serves placeholder data — never leak a stale
    // comparison after compare is switched off.
    compareData: compare ? previous.data : undefined,
    isLoading: current.isLoading,
    isFetching: current.isFetching,
    error: current.error,
  };
}
