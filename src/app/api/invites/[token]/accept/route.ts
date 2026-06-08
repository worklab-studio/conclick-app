import { parseRequest } from '@/lib/request';
import { json, badRequest, notFound, unauthorized } from '@/lib/response';
import {
  getTeamInviteByToken,
  acceptTeamInvite,
  createTeamUser,
  getTeamUser,
} from '@/queries/prisma';

// POST — accept an invite. Requires a signed-in user; the token is the secret
// (consistent with the access-code join model).
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { auth, error } = await parseRequest(request);
  if (error) return error();
  if (!auth.user) return unauthorized();

  const { token } = await params;

  const invite = await getTeamInviteByToken(token);
  if (!invite) return notFound({ message: 'Invitation not found.' });
  if (invite.status !== 'pending') {
    return badRequest({ message: 'This invitation is no longer valid.' });
  }
  if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
    return badRequest({ message: 'This invitation has expired.' });
  }

  // The invite is addressed to a specific email — the signed-in user must match,
  // so a leaked link can't be redeemed by someone else.
  const userEmail = (auth.user as any).email?.toLowerCase();
  if (userEmail && invite.email && userEmail !== invite.email.toLowerCase()) {
    return unauthorized({
      message: `This invitation was sent to ${invite.email}. Please sign in with that email to accept it.`,
    });
  }

  // Create the membership (idempotent — ignore if already a member / unique race).
  const existing = await getTeamUser(invite.teamId, auth.user.id);
  if (!existing) {
    try {
      await createTeamUser(auth.user.id, invite.teamId, invite.role);
    } catch (e: any) {
      if (e?.code !== 'P2002') throw e;
    }
  }

  await acceptTeamInvite(token, auth.user.id);

  return json({ ok: true, teamId: invite.teamId });
}
