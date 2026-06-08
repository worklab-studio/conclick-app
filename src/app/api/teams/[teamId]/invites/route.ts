/* eslint-disable no-console */
import { z } from 'zod';
import { parseRequest } from '@/lib/request';
import { json, badRequest, unauthorized } from '@/lib/response';
import { canUpdateTeam } from '@/permissions';
import {
  createTeamInvite,
  getTeamInvites,
  getPendingInviteByEmail,
  getTeam,
  getTeamUser,
} from '@/queries/prisma';
import { sendTeamInviteEmail } from '@/lib/email';
import prisma from '@/lib/prisma';

// GET — list pending invites (owner/manager only).
export async function GET(request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const { auth, error } = await parseRequest(request);
  if (error) return error();
  if (!auth.user) return unauthorized();

  const { teamId } = await params;
  if (!(await canUpdateTeam(auth, teamId))) {
    return unauthorized({ message: 'Only the team owner/manager can view invites.' });
  }

  return json({ data: await getTeamInvites(teamId) });
}

// POST — create an email invite and send it.
export async function POST(request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const schema = z.object({
    email: z.string().email().max(255),
    role: z
      .enum(['team-manager', 'team-member', 'team-view-only'])
      .optional()
      .default('team-member'),
  });

  const { auth, body, error } = await parseRequest(request, schema);
  if (error) return error();
  if (!auth.user) return unauthorized();

  const { teamId } = await params;
  if (!(await canUpdateTeam(auth, teamId))) {
    return unauthorized({ message: 'Only the team owner/manager can invite members.' });
  }

  const team = await getTeam(teamId);
  if (!team) return badRequest({ message: 'Team not found.' });

  const email = body.email.toLowerCase();

  // Already a member?
  const existingUser = await prisma.client.user.findFirst({ where: { email, deletedAt: null } });
  if (existingUser && (await getTeamUser(teamId, existingUser.id))) {
    return badRequest({ message: 'That person is already a member of this team.' });
  }

  // Already invited?
  if (await getPendingInviteByEmail(teamId, email)) {
    return badRequest({ message: 'There is already a pending invite for that email.' });
  }

  const invite = await createTeamInvite(teamId, email, body.role, auth.user.id);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const inviteUrl = `${appUrl}/invite/${invite.token}`;

  let emailSent = true;
  try {
    await sendTeamInviteEmail(email, team.name, inviteUrl, auth.user.username);
  } catch (e) {
    console.error('Invite email failed:', e);
    emailSent = false;
  }

  return json({ ok: true, invite, emailSent });
}
