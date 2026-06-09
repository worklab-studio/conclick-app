import { z } from 'zod';
import { canUpdateWebsite, canDeleteWebsite, canViewWebsite } from '@/permissions';
import { SHARE_ID_REGEX, ROLES } from '@/lib/constants';
import { parseRequest } from '@/lib/request';
import { ok, json, unauthorized, serverError, badRequest } from '@/lib/response';
import { deleteWebsite, getTeamUser, getWebsite, updateWebsite } from '@/queries/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  const { websiteId } = await params;

  if (!(await canViewWebsite(auth, websiteId))) {
    return unauthorized();
  }

  const website = await getWebsite(websiteId);

  return json(website);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const schema = z.object({
    name: z.string().optional(),
    domain: z.string().optional(),
    shareId: z.string().regex(SHARE_ID_REGEX).nullable().optional(),
    stripeId: z.string().optional(),
    stripeSecretKey: z.string().optional(),
    stripePublishableKey: z.string().optional(),
    autocaptureEnabled: z.boolean().optional(),
    teamId: z.uuid().nullable().optional(),
  });

  const { auth, body, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const { websiteId } = await params;
  const {
    name,
    domain,
    shareId,
    stripeId,
    stripeSecretKey,
    stripePublishableKey,
    autocaptureEnabled,
    teamId,
  } = body;

  if (!(await canUpdateWebsite(auth, websiteId))) {
    return unauthorized();
  }

  const data: Record<string, any> = {
    name,
    domain,
    shareId,
    stripeId,
    stripeSecretKey,
    stripePublishableKey,
    autocaptureEnabled,
  };

  // Move a website into / out of a team. Only a team owner may do so: assigning
  // clears the personal owner; removing returns it to the team owner (the actor).
  if (teamId !== undefined) {
    if (teamId) {
      const membership = await getTeamUser(teamId, auth.user.id);
      if (membership?.role !== ROLES.teamOwner) {
        return unauthorized();
      }
      data.teamId = teamId;
      data.userId = null;
    } else {
      const current = await getWebsite(websiteId);
      if (current?.teamId) {
        const membership = await getTeamUser(current.teamId, auth.user.id);
        if (membership?.role !== ROLES.teamOwner) {
          return unauthorized();
        }
      }
      data.teamId = null;
      data.userId = auth.user.id;
    }
  }

  try {
    const website = await updateWebsite(websiteId, data);

    return Response.json(website);
  } catch (e: any) {
    if (e.message.toLowerCase().includes('unique constraint') && e.message.includes('share_id')) {
      return badRequest({ message: 'That share ID is already taken.' });
    }

    return serverError(e);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  const { websiteId } = await params;

  if (!(await canDeleteWebsite(auth, websiteId))) {
    return unauthorized();
  }

  await deleteWebsite(websiteId);

  return ok();
}
