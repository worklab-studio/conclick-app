'use client';

import { WebsiteHeader } from './WebsiteHeader';
import { WebsiteMetricsBar } from './WebsiteMetricsBar';
import { WebsiteChart } from './WebsiteChart';
import { WebsitePanels } from './WebsitePanels';
import { useWebsiteQuery } from '@/components/hooks';

import { useState } from 'react';

export function WebsitePage({ websiteId }: { websiteId: string }) {
  const { data: website, isLoading, error } = useWebsiteQuery(websiteId);
  const [chartType, setChartType] = useState('overview');

  if (isLoading || error) {
    return null;
  }

  return (
    <div className="mx-auto w-full px-3 md:px-6 py-8" style={{ maxWidth: '1320px' }}>
      <div className="mx-4 space-y-6">
        <WebsiteHeader websiteId={websiteId} />
        <WebsiteMetricsBar websiteId={websiteId} chartType={chartType} />
        <WebsiteChart websiteId={websiteId} chartType={chartType} onChartTypeChange={setChartType} />
        <WebsitePanels websiteId={websiteId} />
      </div>
    </div>
  );
}
