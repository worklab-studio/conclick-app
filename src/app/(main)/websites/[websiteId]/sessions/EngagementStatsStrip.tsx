'use client';

import { MousePointerClick, ArrowDownWideNarrow } from 'lucide-react';
import { useEngagementStatsQuery } from '@/components/hooks';

// Aggregate engagement strip above the Users list — only appears once there's
// engagement data (i.e. Autocapture is on and visitors have browsed).
export function EngagementStatsStrip({ websiteId }: { websiteId?: string }) {
  const { data } = useEngagementStatsQuery(websiteId);

  if (!data || (data.avgScroll == null && data.clicksPerVisit == null)) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 border-b border-[hsl(0,0%,12%)] px-7 py-2.5 text-sm">
      {data.avgScroll != null ? (
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <ArrowDownWideNarrow className="h-3.5 w-3.5 text-[#8b88cf]" />
          Avg scroll <span className="font-semibold text-foreground">{data.avgScroll}%</span>
        </span>
      ) : null}
      {data.clicksPerVisit != null ? (
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <MousePointerClick className="h-3.5 w-3.5 text-[#8b88cf]" />
          <span className="font-semibold text-foreground">{data.clicksPerVisit}</span> clicks /
          visit
        </span>
      ) : null}
    </div>
  );
}
