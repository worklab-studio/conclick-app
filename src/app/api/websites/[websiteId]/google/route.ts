import { z } from 'zod';
import { parseRequest } from '@/lib/request';
import { json, badRequest, unauthorized } from '@/lib/response';
import { canUpdateWebsite } from '@/permissions';
import prisma from '@/lib/prisma';
import {
  getAccessToken,
  getConnection,
  googleConfigured,
  gscListSites,
  ga4ListProperties,
} from '@/lib/google';

// Per-website Google connection: status (+ optional property lists for the
// pickers), select the GSC site / GA4 property, disconnect. This is a SETTINGS
// surface — every method requires the website OWNER (share-token holders must
// never see the owner's Google email or enumerate their GSC/GA4 properties).

export async function GET(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const { auth, query, error } = await parseRequest(
    request,
    z.object({ lists: z.string().optional() }),
  );
  if (error) return error();

  const { websiteId } = await params;
  if (!auth?.user || !(await canUpdateWebsite(auth, websiteId))) return unauthorized();

  const conn = await getConnection(websiteId);
  if (!conn) {
    return json({ connected: false, configured: googleConfigured() });
  }

  const base = {
    connected: true,
    configured: true,
    email: conn.email,
    gscSiteUrl: conn.gscSiteUrl,
    ga4PropertyId: conn.ga4PropertyId,
  };

  if (query.lists) {
    const token = await getAccessToken(websiteId);
    if (!token) return json({ ...base, tokenError: true });

    const [sites, properties] = await Promise.all([
      gscListSites(token).catch(() => []),
      ga4ListProperties(token).catch(() => []),
    ]);
    return json({ ...base, gscSites: sites, ga4Properties: properties });
  }

  return json(base);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const schema = z.object({
    gscSiteUrl: z.string().max(255).nullable().optional(),
    // Interpolated into the Google API URL path — lock the shape down.
    ga4PropertyId: z
      .string()
      .regex(/^properties\/\d+$/)
      .nullable()
      .optional(),
  });

  const { auth, body, error } = await parseRequest(request, schema);
  if (error) return error();

  const { websiteId } = await params;
  if (!auth?.user || !(await canUpdateWebsite(auth, websiteId))) return unauthorized();

  const conn = await getConnection(websiteId);
  if (!conn) return badRequest({ message: 'Google is not connected for this website.' });

  await prisma.client.googleConnection.update({
    where: { websiteId },
    data: {
      ...(body.gscSiteUrl !== undefined ? { gscSiteUrl: body.gscSiteUrl } : {}),
      ...(body.ga4PropertyId !== undefined ? { ga4PropertyId: body.ga4PropertyId } : {}),
    },
  });

  return json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const { auth, error } = await parseRequest(request);
  if (error) return error();

  const { websiteId } = await params;
  if (!auth?.user || !(await canUpdateWebsite(auth, websiteId))) return unauthorized();

  await prisma.client.googleConnection.deleteMany({ where: { websiteId } });
  // Imported history stays — it's the user's data; re-importing overwrites it.

  return json({ ok: true });
}
