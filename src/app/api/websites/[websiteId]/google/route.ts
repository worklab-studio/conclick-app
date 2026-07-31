import { z } from 'zod';
import { parseRequest } from '@/lib/request';
import { json, badRequest, unauthorized } from '@/lib/response';
import { canUpdateWebsite } from '@/permissions';
import prisma from '@/lib/prisma';
import {
  bareHost,
  domainCovers,
  ga4WebStreamHosts,
  getConnection,
  getServiceAccountToken,
  googleConfigured,
  gscListSites,
  ga4ListProperties,
  isConnected,
  saveSelection,
  serviceAccountEmail,
} from '@/lib/google';

// Per-website Google connection (service-account model). ONE reader is shared
// across all customers, so its accessible-property list is the union of every
// tenant's grants. To prevent customer A from reading customer B's data, a
// website may only ever see/bind a property whose host matches its OWN domain —
// enforced here on both listing and save. Settings surface: every method needs
// website-update permission (never reachable via a public share token).

const GA4_LIST_CAP = 40; // stream lookups per list call, bounds Google calls

async function websiteHost(websiteId: string): Promise<string> {
  const website = await prisma.client.website.findUnique({
    where: { id: websiteId },
    select: { domain: true },
  });
  return bareHost(website?.domain);
}

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
  const base = {
    connected: isConnected(conn),
    configured: googleConfigured(),
    serviceEmail: serviceAccountEmail(),
    gscSiteUrl: conn?.gscSiteUrl ?? null,
    ga4PropertyId: conn?.ga4PropertyId ?? null,
  };

  if (query.lists) {
    const token = await getServiceAccountToken();
    const host = await websiteHost(websiteId);
    if (!token || !host) {
      return json({ ...base, gscSites: [], ga4Properties: [], suggested: null });
    }

    const [allSites, allProps] = await Promise.all([
      gscListSites(token).catch(() => []),
      ga4ListProperties(token).catch(() => []),
    ]);

    // Only this site's own domain — never another tenant's shared property.
    const gscSites = allSites.filter(s => domainCovers(bareHost(s.siteUrl), host));
    const matchedProps = await Promise.all(
      allProps.slice(0, GA4_LIST_CAP).map(async p => {
        const hosts = await ga4WebStreamHosts(token, p.property);
        return hosts.some(h => domainCovers(h, host)) ? p : null;
      }),
    );
    const ga4Properties = matchedProps.filter(Boolean);

    const suggested = {
      gscSiteUrl: gscSites[0]?.siteUrl ?? null,
      ga4PropertyId: (ga4Properties[0] as any)?.property ?? null,
    };

    return json({ ...base, gscSites, ga4Properties, suggested });
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

  // Re-validate every non-null selection server-side: it must be a property the
  // reader can actually see AND it must belong to this website's own domain.
  // This is the wall that stops a tenant binding another tenant's property.
  const wantsGsc = !!body.gscSiteUrl;
  const wantsGa4 = !!body.ga4PropertyId;
  if (wantsGsc || wantsGa4) {
    const token = await getServiceAccountToken();
    if (!token) return badRequest({ message: 'Google reader isn’t configured on the server yet.' });
    const host = await websiteHost(websiteId);
    if (!host) {
      return badRequest({ message: 'Set this website’s domain before connecting Google.' });
    }

    if (wantsGsc) {
      const sites = await gscListSites(token).catch(() => []);
      const ok =
        sites.some(s => s.siteUrl === body.gscSiteUrl) &&
        domainCovers(bareHost(body.gscSiteUrl), host);
      if (!ok) {
        return badRequest({
          message:
            'That Search Console property isn’t shared with the reader, or doesn’t match this site’s domain.',
        });
      }
    }

    if (wantsGa4) {
      const hosts = await ga4WebStreamHosts(token, body.ga4PropertyId as string);
      if (!hosts.some(h => domainCovers(h, host))) {
        return badRequest({
          message:
            'That GA4 property isn’t shared with the reader, or its website doesn’t match this site’s domain.',
        });
      }
    }
  }

  // Saving a (validated) selection IS connecting — upsert (the row may not exist).
  await saveSelection(websiteId, {
    gscSiteUrl: body.gscSiteUrl,
    ga4PropertyId: body.ga4PropertyId,
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
