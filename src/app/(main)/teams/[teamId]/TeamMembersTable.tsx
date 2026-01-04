import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useMessages } from '@/components/hooks';
import { ROLES } from '@/lib/constants';
import { TeamMemberRemoveButton } from './TeamMemberRemoveButton';
import { TeamMemberEditButton } from './TeamMemberEditButton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export function TeamMembersTable({
  data = [],
  teamId,
  allowEdit = false,
}: {
  data: any[];
  teamId: string;
  allowEdit: boolean;
}) {
  const { formatMessage, labels } = useMessages();

  const roles = {
    [ROLES.teamOwner]: formatMessage(labels.teamOwner),
    [ROLES.teamManager]: formatMessage(labels.teamManager),
    [ROLES.teamMember]: formatMessage(labels.teamMember),
    [ROLES.teamViewOnly]: formatMessage(labels.viewOnly),
  };

  return (
    <div className="rounded-md border dark:border-zinc-800 overflow-hidden">
      <Table>
        <TableHeader className="bg-zinc-900/50">
          <TableRow className="border-b border-zinc-800 hover:bg-transparent">
            <TableHead className="font-semibold text-zinc-400 pl-4">{formatMessage(labels.username)}</TableHead>
            <TableHead className="font-semibold text-zinc-400">{formatMessage(labels.role)}</TableHead>
            {allowEdit && <TableHead className="text-right text-zinc-400 pr-4">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.id} className="border-b border-dashed border-zinc-800/50 hover:bg-zinc-900/30 transition-colors">
              <TableCell className="font-medium py-4 pl-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={`https://avatar.vercel.sh/${row?.user?.username}`} />
                    <AvatarFallback>{row?.user?.username?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="text-foreground">{row?.user?.username}</span>
                </div>
              </TableCell>
              <TableCell className="py-4">
                <Badge variant="outline" className="font-normal border-zinc-700 text-zinc-300">
                  {roles[row?.role]}
                </Badge>
              </TableCell>
              {allowEdit && (
                <TableCell className="text-right py-4 pr-4">
                  {row?.role !== ROLES.teamOwner && (
                    <div className="flex items-center justify-end gap-2">
                      <TeamMemberEditButton teamId={teamId} userId={row?.user?.id} role={row?.role} />
                      <TeamMemberRemoveButton
                        teamId={teamId}
                        userId={row?.user?.id}
                        userName={row?.user?.username}
                      />
                    </div>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
          {!data.length && (
            <TableRow>
              <TableCell colSpan={allowEdit ? 3 : 2} className="h-24 text-center text-muted-foreground">
                No members found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
