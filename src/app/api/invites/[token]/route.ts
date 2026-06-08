import { json, notFound } from '@/lib/response';
import { getTeamInviteByToken, getTeam } from '@/queries/prisma';

// GET — public invite summary for the accept page. The unguessable token IS the
// secret, so no auth is required to look up the team name / status.
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const invite = await getTeamInviteByToken(token);
  if (!invite) return notFound({ message: 'Invitation not found.' });

  const expired = !!invite.expiresAt && new Date(invite.expiresAt) < new Date();
  const team = await getTeam(invite.teamId);

  return json({
    email: invite.email,
    role: invite.role,
    status: invite.status,
    expired,
    teamName: team?.name ?? null,
  });
}
