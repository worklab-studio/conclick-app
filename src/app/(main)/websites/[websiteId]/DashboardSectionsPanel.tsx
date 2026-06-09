'use client';

import { useState } from 'react';
import { Users, CreditCard, Filter, Target, Sparkles, Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigation } from '@/components/hooks';
import { SessionsDataTable } from '@/app/(main)/websites/[websiteId]/sessions/SessionsDataTable';
import { SessionModal } from '@/app/(main)/websites/[websiteId]/sessions/SessionModal';
import { CustomersDataTable } from '@/app/(main)/websites/[websiteId]/(reports)/payment-journey/CustomersDataTable';
import { FunnelsInline } from '@/app/(main)/websites/[websiteId]/(reports)/funnels/FunnelsInline';
import { GoalsInline } from '@/app/(main)/websites/[websiteId]/(reports)/goals/GoalsInline';
import { AiTrafficInline } from '@/app/(main)/websites/[websiteId]/AiTrafficInline';
import { CampaignsInline } from '@/app/(main)/websites/[websiteId]/CampaignsInline';
import { RevenueBySourceInline } from '@/app/(main)/websites/[websiteId]/RevenueBySourceInline';
import { AutoFunnelInline } from '@/app/(main)/websites/[websiteId]/AutoFunnelInline';

const TABS = [
  { id: 'users', label: 'Users', icon: Users },
  { id: 'customers', label: 'Customers', icon: CreditCard },
  { id: 'funnels', label: 'Funnels', icon: Filter },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'ai', label: 'AI', icon: Sparkles },
  { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
] as const;

type TabId = (typeof TABS)[number]['id'];

/**
 * datafast-style tabbed panel that lives at the END of the dashboard. The four
 * sections (Users / Customers / Funnels / Goals) render inline; the active tab's
 * view is the only one mounted, so just one query fires at a time. Uses the
 * dashboard's shared date range — no controls of its own.
 */
export function DashboardSectionsPanel({ websiteId }: { websiteId: string }) {
  const [tab, setTab] = useState<TabId>('users');
  const isShare = useNavigation().pathname?.includes('/share/');

  return (
    <div className="overflow-hidden rounded-xl border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,8%)]">
      <div className="flex items-center gap-1 overflow-x-auto border-b border-[hsl(0,0%,12%)] p-2">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={active ? 'true' : undefined}
              className={cn(
                'inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-[#5e5ba4]/15 text-foreground ring-1 ring-inset ring-[#5e5ba4]/25'
                  : 'text-muted-foreground hover:bg-[hsl(0,0%,11%)] hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'users' && <SessionsDataTable websiteId={websiteId} />}
      {tab === 'customers' && (
        <>
          <RevenueBySourceInline websiteId={websiteId} />
          <CustomersDataTable websiteId={websiteId} />
        </>
      )}
      {tab === 'ai' && <AiTrafficInline websiteId={websiteId} />}
      {tab === 'campaigns' && <CampaignsInline websiteId={websiteId} />}
      {(tab === 'funnels' || tab === 'goals') && (
        <div className="p-4">
          {tab === 'funnels' && (
            <>
              <AutoFunnelInline websiteId={websiteId} />
              <FunnelsInline websiteId={websiteId} />
            </>
          )}
          {tab === 'goals' && <GoalsInline websiteId={websiteId} />}
        </div>
      )}

      {/* Lets a visitor/customer row click open the session profile from here —
          owner view only; the public share is read-only. */}
      {!isShare && <SessionModal websiteId={websiteId} />}
    </div>
  );
}
