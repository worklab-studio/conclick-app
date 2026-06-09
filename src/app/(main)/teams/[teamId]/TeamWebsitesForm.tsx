'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  useApi,
  useLoginQuery,
  useModified,
  useTeamWebsitesQuery,
  useUserWebsitesQuery,
} from '@/components/hooks';
import { SiteIcon } from '@/app/(main)/websites/SiteIcon';

// Team owner picks which of their websites belong to this team. Toggling a
// checkbox assigns/removes the site (POST /websites/<id> { teamId }). Team
// members then get access to assigned sites under the owner's plan.
export function TeamWebsitesForm({ teamId }: { teamId: string }) {
  const { user } = useLoginQuery();
  const { post } = useApi();
  const { touch } = useModified();
  const personal = useUserWebsitesQuery({ userId: user?.id });
  const teamSites = useTeamWebsitesQuery(teamId);
  const [busy, setBusy] = useState<string | undefined>();

  const personalList: any[] = (personal.data as any)?.data || [];
  const teamList: any[] = (teamSites.data as any)?.data || [];
  const inTeamIds = new Set(teamList.map(w => w.id));
  const candidates = [...teamList, ...personalList.filter(w => !inTeamIds.has(w.id))];

  const toggle = async (websiteId: string, currentlyInTeam: boolean) => {
    setBusy(websiteId);
    try {
      await post(`/websites/${websiteId}`, { teamId: currentlyInTeam ? null : teamId });
      touch('websites');
      await Promise.all([personal.refetch(), teamSites.refetch()]);
    } finally {
      setBusy(undefined);
    }
  };

  const loading = personal.isLoading || teamSites.isLoading;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Choose which of your websites belong to this team. Team members get access to these — under
        your plan, with no extra seats.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your websites…
        </div>
      ) : candidates.length === 0 ? (
        <div className="py-6 text-sm text-muted-foreground">
          You don&apos;t have any websites yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[hsl(0,0%,12%)]">
          {candidates.map(w => {
            const inTeam = inTeamIds.has(w.id);
            return (
              <label
                key={w.id}
                className="flex cursor-pointer items-center gap-3 border-b border-[hsl(0,0%,10%)] px-4 py-3 transition-colors last:border-b-0 hover:bg-[hsl(0,0%,10%)]"
              >
                <input
                  type="checkbox"
                  checked={inTeam}
                  disabled={busy === w.id}
                  onChange={() => toggle(w.id, inTeam)}
                  className="h-4 w-4 shrink-0 rounded border-[hsl(0,0%,28%)] bg-transparent accent-[#5e5ba4]"
                />
                <SiteIcon domain={w.domain} name={w.name} size={20} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">{w.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{w.domain}</div>
                </div>
                {busy === w.id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : inTeam ? (
                  <span className="text-xs font-medium text-[#8b88cf]">In team</span>
                ) : null}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
