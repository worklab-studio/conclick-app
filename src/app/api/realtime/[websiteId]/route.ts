import { REALTIME_RANGE } from '@/lib/constants';
import { getQueryFilters, parseRequest } from '@/lib/request';
import { json, unauthorized } from '@/lib/response';
import { canViewWebsite } from '@/permissions';
import { getRealtimeData } from '@/queries/sql';
import { botBlocksLastHour } from '@/lib/botBlocks';
import { filterParams } from '@/lib/schema';
import { startOfMinute, subMinutes } from 'date-fns';
import { z } from 'zod';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  // Validate query params against the same filter schema as the other read
  // routes — otherwise an arbitrary `segment` or `cohort` value flows into
  // getQueryFilters and triggers a TypeError 500 when the lookup returns null.
  const schema = z.object(filterParams);

  const { auth, query, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const { websiteId } = await params;

  if (!(await canViewWebsite(auth, websiteId))) {
    return unauthorized();
  }

  const filters = await getQueryFilters(
    {
      ...query,
      startAt: subMinutes(startOfMinute(new Date()), REALTIME_RANGE).getTime(),
      endAt: Date.now(),
    },
    websiteId,
  );

  const data = await getRealtimeData(websiteId, filters);

  // Trust badge: how many bot sends were dropped at ingest this hour.
  return json({ ...data, botsBlocked: botBlocksLastHour(websiteId) });
}
