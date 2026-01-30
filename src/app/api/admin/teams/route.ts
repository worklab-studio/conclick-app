import { z } from 'zod';
import { parseRequest } from '@/lib/request';
import { cookies } from 'next/headers';
import { json, unauthorized } from '@/lib/response';
import { pagingParams, searchParams } from '@/lib/schema';
import { canViewAllTeams } from '@/permissions';
import { getTeams } from '@/queries/prisma/team';

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
    if (!(await canViewAllTeams(auth))) {
      return unauthorized();
    }
  }

  const teams = await getTeams(
    {
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
        _count: {
          select: {
            websites: {
              where: { deletedAt: null },
            },
            members: {
              where: {
                user: { deletedAt: null },
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

  return json(teams);
}
