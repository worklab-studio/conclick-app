import { parseRequest } from '@/lib/request';
import { json, unauthorized } from '@/lib/response';
import { canUpdateTeam } from '@/permissions';
import { revokeTeamInvite } from '@/queries/prisma';

// DELETE — revoke a pending invite (owner/manager only).
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ teamId: string; inviteId: string }> },
) {
  const { auth, error } = await parseRequest(request);
  if (error) return error();
  if (!auth.user) return unauthorized();

  const { teamId, inviteId } = await params;
  if (!(await canUpdateTeam(auth, teamId))) {
    return unauthorized({ message: 'Only the team owner/manager can revoke invites.' });
  }

  await revokeTeamInvite(inviteId);

  return json({ ok: true });
}
