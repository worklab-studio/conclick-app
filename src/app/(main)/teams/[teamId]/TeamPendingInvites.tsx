'use client';

import { useApi } from '@/components/hooks';
import { useToast } from '@umami/react-zen';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Mail, X } from 'lucide-react';

function roleLabel(role: string) {
  if (role === 'team-manager') return 'Manager';
  if (role === 'team-view-only') return 'View only';
  return 'Member';
}

export function TeamPendingInvites({ teamId }: { teamId: string }) {
  const { get, del } = useApi();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['teams:invites', teamId],
    queryFn: () => get(`/teams/${teamId}/invites`),
  });

  const invites: any[] = data?.data || [];

  const revoke = async (id: string) => {
    try {
      await del(`/teams/${teamId}/invites/${id}`);
      toast('Invite revoked.');
      queryClient.invalidateQueries({ queryKey: ['teams:invites', teamId] });
    } catch (e: any) {
      toast(e?.message || 'Could not revoke the invite.');
    }
  };

  if (!invites.length) return null;

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
        Pending invites
      </div>
      <div className="divide-y divide-[hsl(0,0%,12%)] rounded-lg border border-[hsl(0,0%,12%)]">
        {invites.map((inv: any) => (
          <div key={inv.id} className="flex items-center justify-between gap-3 p-3">
            <div className="flex min-w-0 items-center gap-3">
              <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <div className="truncate text-sm text-foreground">{inv.email}</div>
                <div className="text-xs text-muted-foreground">{roleLabel(inv.role)} · pending</div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => revoke(inv.id)}
              title="Revoke invite"
              className="shrink-0 text-muted-foreground hover:text-red-400"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
