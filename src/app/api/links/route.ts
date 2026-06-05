import { z } from 'zod';
import { canCreateTeamWebsite, canCreateWebsite } from '@/permissions';
import { json, unauthorized } from '@/lib/response';
import { uuid } from '@/lib/crypto';
import { getQueryFilters, parseRequest } from '@/lib/request';
import { pagingParams, searchParams } from '@/lib/schema';
import { createLink, getUserLinks } from '@/queries/prisma';

export async function GET(request: Request) {
  const schema = z.object({
    ...pagingParams,
    ...searchParams,
  });

  const { auth, query, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const filters = await getQueryFilters(query);

  const links = await getUserLinks(auth.user.id, filters);

  return json(links);
}

export async function POST(request: Request) {
  const schema = z.object({
    name: z.string().max(100),
    url: z.string().max(500),
    slug: z.string().max(100),
    // teamId must be a real UUID, not an arbitrary string.
    teamId: z.uuid().nullable().optional(),
    // NOTE: `id` is intentionally NOT accepted — the server always generates it.
    // Letting the caller pick the primary key allows existence-probing other
    // tenants' links (collision error vs success) and squatting known UUIDs.
  });

  const { auth, body, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const { name, url, slug, teamId } = body;

  const allowed = teamId
    ? await canCreateTeamWebsite(auth, teamId)
    : await canCreateWebsite(auth);

  if (!allowed) {
    return unauthorized();
  }

  const data: any = {
    id: uuid(),
    name,
    url,
    slug,
    teamId,
  };

  if (!teamId) {
    data.userId = auth.user.id;
  }

  const result = await createLink(data);

  return json(result);
}
