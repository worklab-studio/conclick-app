import { keepPreviousData } from '@tanstack/react-query';
import { useApi } from '../useApi';
import { useDateParameters } from '../useDateParameters';
import { useFilterParameters } from '../useFilterParameters';
import { useModified } from '../useModified';
import { usePagedQuery } from '../usePagedQuery';

export function useWebsiteSessionsQuery(
  websiteId: string,
  params?: Record<string, string | number>,
) {
  const { get } = useApi();
  const { modified } = useModified(`sessions`);
  const { startAt, endAt, unit, timezone } = useDateParameters();
  const filters = useFilterParameters();

  return usePagedQuery({
    // Keep the previous rows on screen while a filter/page change loads — the table
    // never collapses to a spinner, so the page height (and scroll) stays put.
    placeholderData: keepPreviousData,
    queryKey: [
      'sessions',
      { websiteId, modified, startAt, endAt, unit, timezone, ...params, ...filters },
    ],
    queryFn: pageParams => {
      return get(`/websites/${websiteId}/sessions`, {
        startAt,
        endAt,
        unit,
        timezone,
        ...filters,
        ...pageParams,
        ...params,
        pageSize: 20,
      });
    },
  });
}
