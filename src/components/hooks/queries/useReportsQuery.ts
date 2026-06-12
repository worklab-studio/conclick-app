import { keepPreviousSameWebsite } from './sameWebsitePlaceholder';
import { useApi } from '../useApi';
import { usePagedQuery } from '../usePagedQuery';
import { useModified } from '../useModified';
import { ReactQueryOptions } from '@/lib/types';

export function useReportsQuery(
  { websiteId, type }: { websiteId: string; type?: string },
  options?: ReactQueryOptions,
) {
  const { modified } = useModified(`reports:${type}`);
  const { get } = useApi();

  return usePagedQuery({
    queryKey: ['reports', { websiteId, type, modified }],
    queryFn: async () => get('/reports', { websiteId, type }),
    enabled: !!websiteId && !!type,
    // Bridges the `modified` key bump after create/delete — the list updates
    // in place instead of collapsing to a loading panel. Website-scoped.
    placeholderData: keepPreviousSameWebsite(websiteId),
    ...options,
  });
}
