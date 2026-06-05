import { z } from 'zod';
import { json, badRequest, notFound } from '@/lib/response';
import { parseRequest } from '@/lib/request';
import { ROLES } from '@/lib/constants';
import { createTeamUser, findTeam, getTeamUser } from '@/queries/prisma';

export async function POST(request: Request) {
  const schema = z.object({
    accessCode: z.string().max(50),
  });

  const { auth, body, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const { accessCode } = body;

  const team = await findTeam({
    where: {
      accessCode,
    },
  });

  if (!team) {
    return notFound({ message: 'Team not found.', code: 'team-not-found' });
  }

  const teamUser = await getTeamUser(team.id, auth.user.id);

  if (teamUser) {
    return badRequest({ message: 'User is already a team member.' });
  }

  // Catch unique-constraint races: two concurrent joins can both pass the
  // existence check above. If the DB has a (teamId,userId) unique, Prisma
  // throws P2002 — convert to a friendly 400.
  try {
    const user = await createTeamUser(auth.user.id, team.id, ROLES.teamMember);
    return json(user);
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return badRequest({ message: 'User is already a team member.' });
    }
    throw e;
  }
}
