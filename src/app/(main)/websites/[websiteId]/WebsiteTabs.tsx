'use client';

import Link from 'next/link';
import { LayoutDashboard, Users, Route, Filter, Target, DollarSign } from 'lucide-react';
import { useNavigation } from '@/components/hooks';
import { cn } from '@/lib/utils';

type Tab = {
  label: string;
  /** Path suffix appended to `/websites/<id>`. '' = overview. */
  suffix: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

// Section nav modelled on datafast's tabbed panel. These map to the existing
// (already-working) report routes — the URLs omit the (reports) route group.
const TABS: Tab[] = [
  { label: 'Overview', suffix: '', icon: LayoutDashboard, exact: true },
  { label: 'Users', suffix: '/sessions', icon: Users },
  { label: 'Journeys', suffix: '/journeys', icon: Route },
  { label: 'Funnels', suffix: '/funnels', icon: Filter },
  { label: 'Goals', suffix: '/goals', icon: Target },
  { label: 'Revenue', suffix: '/revenue', icon: DollarSign },
];

export function WebsiteTabs({ websiteId }: { websiteId: string }) {
  const { renderUrl, pathname } = useNavigation();
  const base = `/websites/${websiteId}`;

  // The portion of the path after `/websites/<id>` (robust to a /teams/<id> prefix).
  const idx = pathname.indexOf(base);
  const rest = idx >= 0 ? pathname.slice(idx + base.length) : '';

  const isActive = (tab: Tab) =>
    tab.exact
      ? rest === '' || rest === '/'
      : rest === tab.suffix || rest.startsWith(`${tab.suffix}/`);

  return (
    <div className="border-b border-[hsl(0,0%,12%)]">
      <div className="mx-auto w-full px-3 md:px-6" style={{ maxWidth: '1320px' }}>
        <nav className="flex items-center gap-1 overflow-x-auto py-2">
          {TABS.map(tab => {
            const active = isActive(tab);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.label}
                href={renderUrl(`${base}${tab.suffix}`)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-[#5e5ba4]/15 text-foreground ring-1 ring-inset ring-[#5e5ba4]/25'
                    : 'text-muted-foreground hover:bg-[hsl(0,0%,10%)] hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
