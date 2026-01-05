'use client';

import { useLoginQuery, useNavigation, useTeam } from '@/components/hooks';
import { ROLES } from '@/lib/constants';
import { Users, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TeamLeaveButton } from '@/app/(main)/teams/TeamLeaveButton';
import { TeamManage } from './TeamManage';
import { TeamEditForm } from './TeamEditForm';
import { TeamMembersDataTable } from './TeamMembersDataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function TeamSettings({ teamId }: { teamId: string }) {
  const team: any = useTeam();
  const { user } = useLoginQuery();
  const { pathname, router } = useNavigation();

  const isAdmin = pathname.includes('/admin');

  const isTeamOwner =
    !!team?.members?.find(({ userId, role }) => role === ROLES.teamOwner && userId === user.id) &&
    user.role !== ROLES.viewOnly;

  const canEdit =
    user.isAdmin ||
    (!!team?.members?.find(
      ({ userId, role }) =>
        (role === ROLES.teamOwner || role === ROLES.teamManager) && userId === user.id,
    ) &&
      user.role !== ROLES.viewOnly);

  return (
    <div className="mx-auto w-full px-3 md:px-6 py-8" style={{ maxWidth: '1320px' }}>
      <div className="mx-4 space-y-6">
        <div className="flex items-center">
          <Button
            variant="ghost"
            className="gap-2 pl-0 hover:bg-transparent hover:text-foreground text-muted-foreground"
            onClick={() => router.push('/account?tab=teams')}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Teams
          </Button>
        </div>

        <Card className="dark:bg-[hsl(0,0%,8%)] dark:border-[hsl(0,0%,12%)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <CardTitle>{team?.name}</CardTitle>
            </div>
            {!isTeamOwner && !isAdmin && <TeamLeaveButton teamId={team.id} teamName={team.name} />}
          </CardHeader>
        </Card>

        <Card className="dark:bg-[hsl(0,0%,8%)] dark:border-[hsl(0,0%,12%)]">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <TeamEditForm teamId={teamId} allowEdit={canEdit} showAccessCode={canEdit} />
          </CardContent>
        </Card>

        <Card className="dark:bg-[hsl(0,0%,8%)] dark:border-[hsl(0,0%,12%)]">
          <CardHeader>
            <CardTitle>Members</CardTitle>
          </CardHeader>
          <CardContent>
            <TeamMembersDataTable teamId={teamId} allowEdit={canEdit} />
          </CardContent>
        </Card>

        {isTeamOwner && (
          <Card className="border-red-200 dark:bg-[hsl(0,0%,8%)] dark:border-red-900/30">
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <TeamManage teamId={teamId} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
