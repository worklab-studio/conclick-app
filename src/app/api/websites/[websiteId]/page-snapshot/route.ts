import { z } from 'zod';
import { parseRequest } from '@/lib/request';
import { json, unauthorized } from '@/lib/response';
import { canViewWebsite } from '@/permissions';
import { getWebsite } from '@/queries/prisma';
import { capturePageSnapshot } from '@/lib/page-snapshot';

// Captures a full-page screenshot of the website's OWN page (domain comes from the
// website record, never from the request) plus the measured pixel boxes of the
// clicked elements — the canvas for the Click map heatmap. Day-cached server-side;
// `refresh: true` forces a fresh capture.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const schema = z.object({
    path: z.string().max(300),
    targets: z
      .array(
        z.object({
          selector: z.string().min(1).max(400),
          text: z.string().max(160).nullish(),
        }),
      )
      .max(40)
      .default([]),
    refresh: z.boolean().optional(),
  });

  const { auth, body, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const { websiteId } = await params;

  if (!(await canViewWebsite(auth, websiteId))) {
    return unauthorized();
  }

  const website = await getWebsite(websiteId);

  if (!website?.domain) {
    return json({ ok: false, reason: 'no-public-domain' });
  }

  const snap = await capturePageSnapshot(website.domain, body.path, body.targets, {
    refresh: !!body.refresh,
  });

  return json(snap);
}
