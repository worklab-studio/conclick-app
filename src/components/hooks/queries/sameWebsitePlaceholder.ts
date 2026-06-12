import type { Query } from '@tanstack/react-query';

// keepPreviousData, scoped to one website: bridge date-range/filter/segment key
// changes with the previous result, but NEVER across a website switch — site A's
// numbers must not render under site B's dashboard while the refetch is in
// flight. All consumers key their queries as [name, { websiteId, ... }].
export function keepPreviousSameWebsite<T = any>(websiteId: string | undefined) {
  return (previousData: T | undefined, previousQuery: Query | undefined): T | undefined => {
    if (!websiteId) return undefined;
    const prevKey = previousQuery?.queryKey?.[1] as { websiteId?: string } | undefined;
    return prevKey?.websiteId === websiteId ? previousData : undefined;
  };
}
