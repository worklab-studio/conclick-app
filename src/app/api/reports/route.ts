import { z } from 'zod';
import { uuid } from '@/lib/crypto';
import { pagingParams, reportSchema, reportTypeParam } from '@/lib/schema';
import { parseRequest } from '@/lib/request';
import { canViewWebsite, canUpdateWebsite } from '@/permissions';
import { unauthorized, json } from '@/lib/response';
import { getReports, createReport } from '@/queries/prisma';
import { reportKey } from '@/lib/report-identity';

// Find an existing goal/funnel with the same canonical parameters, if any.
async function findDuplicateReport(websiteId: string, type: string, parameters: any) {
  const key = reportKey(type, parameters);
  if (!key) return null;
  const existing = await getReports(
    { where: { websiteId, type, website: { deletedAt: null } } },
    { pageSize: -1 }, // scan all goal/funnel reports (a site can have >200)
  );
  return (
    ((existing as any)?.data as any[])?.find(r => reportKey(r.type, r.parameters) === key) || null
  );
}

export async function GET(request: Request) {
  const schema = z.object({
    websiteId: z.uuid(),
    type: reportTypeParam.optional(),
    ...pagingParams,
  });

  const { auth, query, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const { page, search, pageSize, websiteId, type } = query;
  const filters = {
    page,
    pageSize,
    search,
  };

  if (!(await canViewWebsite(auth, websiteId))) {
    return unauthorized();
  }

  const data = await getReports(
    {
      where: {
        websiteId,
        type,
        website: {
          deletedAt: null,
        },
      },
    },
    filters,
  );

  return json(data);
}

export async function POST(request: Request) {
  const { auth, body, error } = await parseRequest(request, reportSchema);

  if (error) {
    return error();
  }

  const { websiteId, type, name, description, parameters } = body;

  if (!(await canUpdateWebsite(auth, websiteId))) {
    return unauthorized();
  }

  // Idempotent for goals/funnels: saving an identical one returns the existing
  // report instead of creating a duplicate (fixes the builder, "Add all", and
  // "Save as funnel" all at once).
  const duplicate = await findDuplicateReport(websiteId, type, parameters);
  if (duplicate) {
    return json(duplicate);
  }

  try {
    const result = await createReport({
      id: uuid(),
      userId: auth.user.id,
      websiteId,
      type,
      name,
      description: description || '',
      parameters,
    });
    return json(result);
  } catch (e: any) {
    // Unique-index race (two parallel creates): return the winner.
    if (e?.code === 'P2002') {
      const winner = await findDuplicateReport(websiteId, type, parameters);
      if (winner) return json(winner);
    }
    throw e;
  }
}
