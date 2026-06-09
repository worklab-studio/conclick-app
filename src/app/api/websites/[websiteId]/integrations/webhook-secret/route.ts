import { z } from 'zod';
import { canUpdateWebsite } from '@/permissions';
import { parseRequest } from '@/lib/request';
import { json, unauthorized, badRequest } from '@/lib/response';
import { getActiveIntegration, saveIntegration } from '@/lib/revenue/store';

// Merge a webhook signing secret into the active integration's (encrypted)
// credentials — enables per-visitor attribution without re-entering the API key.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const schema = z.object({ webhookSecret: z.string().max(500) });
  const { auth, body, error } = await parseRequest(request, schema);
  if (error) return error();

  const { websiteId } = await params;
  if (!(await canUpdateWebsite(auth, websiteId))) return unauthorized();

  const active = await getActiveIntegration(websiteId);
  if (!active) return badRequest({ message: 'Connect a payment provider first.' });

  await saveIntegration(websiteId, active.provider, {
    ...active.credentials,
    webhookSecret: body.webhookSecret.trim(),
  });

  return json({ ok: true });
}
