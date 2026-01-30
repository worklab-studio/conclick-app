import { z } from 'zod';
import { parseRequest } from '@/lib/request';
import { cookies } from 'next/headers';
import { json, unauthorized } from '@/lib/response';
import { pagingParams, searchParams } from '@/lib/schema';
import { canViewAllWebsites } from '@/permissions';
import { getWebsites } from '@/queries/prisma/website';
import { ROLES } from '@/lib/constants';

export async function GET(request: Request) {
  const schema = z.object({
    ...pagingParams,
    ...searchParams,
  });

  // Skip auth in parseRequest so we can check cookie manually
  const { auth, query, error } = await parseRequest(request, schema, { skipAuth: true });

  if (error) {
    return error();
  }

  const adminSession = (await cookies()).get('conclick_admin_session');
  const isAdminCookie = adminSession?.value === 'authenticated';

  if (!isAdminCookie) {
    if (!auth) {
      return unauthorized();
    }
    if (!(await canViewAllWebsites(auth))) {
      return unauthorized();
    }
  }

  const websites = await getWebsites(
    {
      include: {
        user: {
          where: {
            deletedAt: null,
          },
          select: {
            username: true,
            id: true,
          },
        },
        team: {
          where: {
            deletedAt: null,
          },
          include: {
            members: {
              where: {
                role: ROLES.teamOwner,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    },
    query,
  );

  return json(websites);
}
