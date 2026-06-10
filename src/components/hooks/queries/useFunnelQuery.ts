import { useApi } from '../useApi';
import { useDateParameters } from '@/components/hooks/useDateParameters';
import { useFilterParameters } from '../useFilterParameters';
import { getCompareDate } from '@/lib/date';

interface FunnelStep {
  type: string;
  value: string;
}

// Funnel runner with funnel-LOCAL segmentation (an explicit filter override, so the
// segment switcher doesn't change the whole dashboard) and an optional previous-period
// comparison (runs the same funnel over the prior range). Posts straight to the funnel
// report — same engine as saved funnels, so numbers stay consistent.
export function useFunnelQuery(
  websiteId: string,
  {
    steps,
    window: win,
    segment,
    compare,
  }: { steps: FunnelStep[]; window: number; segment?: Record<string, string>; compare?: boolean },
) {
  const { post, useQuery } = useApi();
  const { startDate, endDate, timezone } = useDateParameters();
  const baseFilters = useFilterParameters();
  const filters = segment ? { ...baseFilters, ...segment } : baseFilters;
  const valid =
    !!websiteId && Array.isArray(steps) && steps.length >= 2 && steps.every(s => !!s.value);

  const current = useQuery<any[]>({
    queryKey: [
      'reports:funnel',
      { websiteId, startDate, endDate, timezone, win, steps, ...filters },
    ],
    queryFn: () =>
      post('/reports/funnel', {
        websiteId,
        type: 'funnel',
        filters,
        parameters: { startDate, endDate, timezone, window: win, steps },
      }),
    enabled: valid,
  });

  const prev = compare ? getCompareDate('prev', new Date(startDate), new Date(endDate)) : null;
  const previous = useQuery<any[]>({
    queryKey: [
      'reports:funnel:prev',
      { websiteId, prev: prev?.startDate, timezone, win, steps, ...filters },
    ],
    queryFn: () =>
      post('/reports/funnel', {
        websiteId,
        type: 'funnel',
        filters,
        parameters: {
          startDate: (prev as any).startDate,
          endDate: (prev as any).endDate,
          timezone,
          window: win,
          steps,
        },
      }),
    enabled: valid && !!prev?.startDate,
  });

  return { data: current.data, isLoading: current.isLoading, compareData: previous.data };
}
