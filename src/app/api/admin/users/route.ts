import { z } from 'zod';
import { parseRequest } from '@/lib/request';
import { cookies } from 'next/headers';
import { json, unauthorized } from '@/lib/response';
import { pagingParams, searchParams } from '@/lib/schema';
import { canViewUsers } from '@/permissions';
import { getUsers } from '@/queries/prisma/user';

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
    if (!(await canViewUsers(auth))) {
      return unauthorized();
    }
  }

  const users = await getUsers(
    {
      include: {
        _count: {
          select: {
            websites: {
              where: { deletedAt: null },
            },
          },
        },
      },
      omit: {
        password: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    },
    query,
  );

  return json(users);
}
