import { parseRequest } from '@/lib/request';
import { json, unauthorized } from '@/lib/response';
import { canViewWebsite } from '@/permissions';
import { getWebsite } from '@/queries/prisma';
import { analyzeSite } from '@/lib/site-analyzer';

// Reads the website's homepage and proposes goals + funnels from its real
// CTAs/links/forms (heuristic, no LLM). The client creates the chosen ones via
// the normal /reports endpoint.
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

  return json(result);
}
