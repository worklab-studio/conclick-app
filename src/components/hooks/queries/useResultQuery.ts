import { keepPreviousSameWebsite } from './sameWebsitePlaceholder';
import { useApi } from '../useApi';
import { useFilterParameters } from '../useFilterParameters';
import { ReactQueryOptions } from '@/lib/types';
import { useDateParameters } from '@/components/hooks/useDateParameters';

export function useResultQuery<T = any>(
  type: string,
  params?: Record<string, any>,
  options?: ReactQueryOptions<T>,
) {
  const { websiteId, ...parameters } = params;
  const { post, useQuery } = useApi();
  const { startDate, endDate, timezone } = useDateParameters();
  const filters = useFilterParameters();

  return useQuery<T>({
    queryKey: [
      'reports',
      {
        type,
        websiteId,
        startDate,
        endDate,
        timezone,
        ...params,
        ...filters,
      },
    ],
    queryFn: () =>
      post(`/reports/${type}`, {
        websiteId,
        type,
        filters,
        parameters: {
          startDate,
          endDate,
          timezone,
          ...parameters,
        },
      }),
    enabled: !!type,
    // Date/filter key changes render the previous result while the new one
    // loads (LoadingPanel dims it via isFetching). Website-scoped — never
    // bridges across a website switch.
    placeholderData: keepPreviousSameWebsite<T>(websiteId) as any,
    ...options,
  });
}
