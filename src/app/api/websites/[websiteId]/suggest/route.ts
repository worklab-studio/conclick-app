import { parseRequest } from '@/lib/request';
import { json, unauthorized } from '@/lib/response';
import { canViewWebsite } from '@/permissions';
import { getWebsite } from '@/queries/prisma';
import { getValues } from '@/queries/sql';
import { analyzeSite } from '@/lib/site-analyzer';

// Reads the website's homepage and proposes goals + funnels from its real
// CTAs/links/forms (heuristic, no LLM), then CROSS-CHECKS each proposal against
// what the site actually fires — so we never suggest a goal/funnel whose events
// never happen (which would just render empty). Ranks survivors by real frequency.
export async function POST(
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

  if (!website?.domain) {
    return json({
      goals: [],
      funnels: [],
      meta: {
        url: '',
        links: 0,
        buttons: 0,
        forms: 0,
        note: 'Set a domain for this website first.',
      },
    });
  }

  const result = await analyzeSite(website.domain);

  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    const filters = { startDate, endDate } as any;
    const [eventVals, pathVals] = await Promise.all([
      getValues(websiteId, 'event_name', filters).catch(() => []),
      getValues(websiteId, 'url_path', filters).catch(() => []),
    ]);
    const eventCount = new Map((eventVals as any[]).map(v => [v.value, Number(v.count) || 0]));
    const pathCount = new Map((pathVals as any[]).map(v => [v.value, Number(v.count) || 0]));

    // Only validate once the site has captured data to validate against.
    if (eventCount.size || pathCount.size) {
      const countFor = (type: string, value: string): number =>
        (type === 'event' ? eventCount.get(value) : pathCount.get(value)) ?? 0;

      const goals = (result.goals || [])
        .map((g: any) => ({ ...g, count: countFor(g.type, g.value) }))
        .filter((g: any) => g.count > 0)
        .sort((a: any, b: any) => b.count - a.count);

      const funnels = (result.funnels || [])
        .filter((f: any) => f.steps.every((s: any) => countFor(s.type, s.value) > 0))
        .map((f: any) => ({
          ...f,
          count: Math.min(...f.steps.map((s: any) => countFor(s.type, s.value))),
        }))
        .sort((a: any, b: any) => b.count - a.count);

      return json({ ...result, goals, funnels, validated: true });
    }
  } catch {
    // Cross-check is best-effort — fall through to the raw proposals.
  }

  return json(result);
}
