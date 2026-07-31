import { canViewWebsite } from '@/permissions';
import { parseRequest } from '@/lib/request';
import { json, unauthorized } from '@/lib/response';
import prisma from '@/lib/prisma';

/**
 * Crawler analytics: daily hit counts per bot for the last N days (default 7),
 * grouped client-side into the answers / indexing / training / other tabs.
 */
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

  const url = new URL(request.url);
  const days = Math.min(30, Math.max(1, Number(url.searchParams.get('days')) || 7));
  const since = new Date(Date.now() - days * 86_400_000);

  const rows = await prisma.client.$queryRaw<
    { day: Date; bot_name: string; company: string; category: string; count: bigint }[]
  >`
    SELECT date_trunc('day', created_at) AS day,
           bot_name, company, category,
           count(*) AS count
    FROM crawler_hit
    WHERE website_id = ${websiteId}::uuid
      AND created_at >= ${since}
    GROUP BY 1, 2, 3, 4
    ORDER BY 1
  `;

  return json({
    days,
    rows: rows.map(r => ({
      day: r.day.toISOString().slice(0, 10),
      name: r.bot_name,
      company: r.company,
      category: r.category,
      count: Number(r.count),
    })),
  });
}
