'use client';

import { createContext, useContext } from 'react';

// Lets a child (e.g. the funnel leak diagnosis) ask the dashboard panel to jump to
// the Click map tab focused on a specific page + cohort. Null when rendered outside
// the dashboard panel (e.g. the standalone funnels page) — callers degrade gracefully.
export interface DashboardTabApi {
  openClickMap: (urlPath: string, cohort?: string) => void;
}

export const DashboardTabContext = createContext<DashboardTabApi | null>(null);

export const useDashboardTabs = () => useContext(DashboardTabContext);
