import { z } from 'zod';
import { canViewWebsite } from '@/permissions';
import { getReports } from '@/queries/prisma';
import { filterParams, pagingParams, reportTypeParam } from '@/lib/schema';
import { parseRequest } from '@/lib/request';
import { unauthorized, json } from '@/lib/response';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const schema = z.object({
    type: reportTypeParam.optional(),
    ...filterParams,
    ...pagingParams,
  });

  const { auth, query, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const { websiteId } = await params;
  const { page, pageSize, search, type } = query;

  if (!(await canViewWebsite(auth, websiteId))) {
    return unauthorized();
  }

  const data = await getReports(
    {
      where: {
        websiteId,
        ...(type && { type }),
      },
    },
    {
      page,
      pageSize,
      search,
    },
  );

  return json(data);
}
