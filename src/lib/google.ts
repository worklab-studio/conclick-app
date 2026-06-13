import crypto from 'node:crypto';
import prisma from '@/lib/prisma';
import { uuid } from '@/lib/crypto';

/**
 * Google integration — service-account model ("invite our reader").
 *
 * There is NO per-user OAuth and NO app verification. ONE service account reads
 * the customer's data: they add its email as a read-only user in their own
 * Search Console (Restricted) and GA4 (Viewer), and we query with a JWT-bearer
 * token minted from the service-account key. The customer revokes by removing
 * the viewer — we never hold a token of theirs.
 *
 * Env: GOOGLE_SERVICE_ACCOUNT_KEY — the service-account JSON key, base64-encoded
 * (or raw JSON). Needs the Search Console API, Analytics Admin API and Analytics
 * Data API enabled on its project. Powers: the SEO tab (Search Console) and the
 * one-time GA4 history import.
 */

const SA_SCOPES = [
  'https://www.googleapis.com/auth/webmasters.readonly',
  'https://www.googleapis.com/auth/analytics.readonly',
].join(' ');

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
}

let cachedKey: ServiceAccountKey | null | undefined;

/** Parse GOOGLE_SERVICE_ACCOUNT_KEY (base64 JSON or raw JSON). Parsed once. */
function getKey(): ServiceAccountKey | null {
  if (cachedKey !== undefined) return cachedKey;
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    cachedKey = null;
    return null;
  }
  try {
    const json = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    const parsed = JSON.parse(json);
    if (!parsed.client_email || !parsed.private_key) throw new Error('missing fields');
    cachedKey = { client_email: parsed.client_email, private_key: parsed.private_key };
  } catch {
    cachedKey = null;
  }
  return cachedKey;
}

export function googleConfigured(): boolean {
  return !!getKey();
}

/** The reader address customers add as a viewer in GSC + GA4. '' if unconfigured. */
export function serviceAccountEmail(): string {
  return getKey()?.client_email || '';
}

// ---------- service-account access token (JWT-bearer, cached) ----------

let tokenCache: { token: string; expiresAt: number } | null = null;

const b64url = (input: Buffer | string) => Buffer.from(input).toString('base64url');

/**
 * A valid access token for the service account. Self-signs an RS256 JWT and
 * exchanges it for a 1-hour token, cached in-memory across requests. Returns
 * null when the key is missing or Google rejects the assertion.
 */
export async function getServiceAccountToken(): Promise<string | null> {
  const key = getKey();
  if (!key) return null;

  if (tokenCache && tokenCache.expiresAt > Date.now()) return tokenCache.token;

  try {
    const now = Math.floor(Date.now() / 1000);
    const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claims = b64url(
      JSON.stringify({
        iss: key.client_email,
        scope: SA_SCOPES,
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
      }),
    );
    const signingInput = `${header}.${claims}`;
    const signature = crypto
      .createSign('RSA-SHA256')
      .update(signingInput)
      .sign(key.private_key.replace(/\\n/g, '\n'));
    const assertion = `${signingInput}.${b64url(signature)}`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token: string; expires_in: number };
    if (!data.access_token) return null;
    tokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    };
    return data.access_token;
  } catch {
    return null;
  }
}

// ---------- connection storage (a per-website property selection) ----------

export async function getConnection(websiteId: string) {
  return prisma.client.googleConnection.findUnique({ where: { websiteId } });
}

/** Whether a website has picked at least one Google property to read. */
export function isConnected(
  conn: { gscSiteUrl?: string | null; ga4PropertyId?: string | null } | null,
) {
  return !!(conn && (conn.gscSiteUrl || conn.ga4PropertyId));
}

/** Upsert the website's property selection. No tokens — auth is the SA viewer grant. */
export async function saveSelection(
  websiteId: string,
  sel: { gscSiteUrl?: string | null; ga4PropertyId?: string | null },
) {
  const data = {
    ...(sel.gscSiteUrl !== undefined ? { gscSiteUrl: sel.gscSiteUrl } : {}),
    ...(sel.ga4PropertyId !== undefined ? { ga4PropertyId: sel.ga4PropertyId } : {}),
  };
  const existing = await prisma.client.googleConnection.findUnique({ where: { websiteId } });
  if (existing) {
    return prisma.client.googleConnection.update({ where: { websiteId }, data });
  }
  return prisma.client.googleConnection.create({ data: { id: uuid(), websiteId, ...data } });
}

// ---------- domain binding (multi-tenant isolation) ----------
//
// ONE service account is shared across all customers, so its accessible-property
// list is the UNION of every customer's shared properties. To stop customer A
// from reading customer B's data, a website may only ever bind a property whose
// host matches the website's OWN domain — enforced on both listing and save.

/** Bare host: strips scheme, sc-domain:, www., path. '' for empty input. */
export function bareHost(value: string | null | undefined): string {
  return (value || '')
    .replace(/^sc-domain:/, '')
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
    .toLowerCase()
    .trim();
}

/** True when two hosts are the same site or one is a subdomain of the other. */
export function domainCovers(propertyHost: string, siteHost: string): boolean {
  if (!propertyHost || !siteHost) return false;
  return (
    propertyHost === siteHost ||
    siteHost.endsWith(`.${propertyHost}`) ||
    propertyHost.endsWith(`.${siteHost}`)
  );
}

/**
 * Web-stream hosts declared on a GA4 property (its defaultUri). GA4 property
 * summaries carry no domain, so this is the only way to bind a GA4 property to a
 * site. Viewer access is enough to read data streams. [] on any failure.
 */
export async function ga4WebStreamHosts(token: string, propertyId: string): Promise<string[]> {
  try {
    const data = await googleGet(
      token,
      `https://analyticsadmin.googleapis.com/v1beta/${propertyId}/dataStreams?pageSize=50`,
    );
    return (data.dataStreams || [])
      .map((s: any) => bareHost(s.webStreamData?.defaultUri))
      .filter(Boolean);
  } catch {
    return [];
  }
}

// ---------- API wrappers (identical regardless of token source) ----------

async function googleGet(token: string, url: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`google ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

async function googlePost(token: string, url: string, body: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`google ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

export async function gscListSites(token: string): Promise<{ siteUrl: string }[]> {
  const data = await googleGet(token, 'https://www.googleapis.com/webmasters/v3/sites');
  return (data.siteEntry || [])
    .filter((s: any) => s.permissionLevel !== 'siteUnverifiedUser')
    .map((s: any) => ({ siteUrl: s.siteUrl }));
}

export interface GscRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export async function gscQuery(
  token: string,
  siteUrl: string,
  body: {
    startDate: string;
    endDate: string;
    dimensions?: string[];
    rowLimit?: number;
  },
): Promise<GscRow[]> {
  const data = await googlePost(
    token,
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    { type: 'web', ...body },
  );
  return data.rows || [];
}

export async function ga4ListProperties(
  token: string,
): Promise<{ property: string; displayName: string }[]> {
  const out: { property: string; displayName: string }[] = [];
  let pageToken = '';
  do {
    const data = await googleGet(
      token,
      `https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200${
        pageToken ? `&pageToken=${pageToken}` : ''
      }`,
    );
    for (const account of data.accountSummaries || []) {
      for (const p of account.propertySummaries || []) {
        out.push({
          property: p.property,
          displayName: `${p.displayName} (${account.displayName})`,
        });
      }
    }
    pageToken = data.nextPageToken || '';
  } while (pageToken && out.length < 1000);
  return out;
}

export async function ga4RunReport(token: string, propertyId: string, body: unknown) {
  return googlePost(
    token,
    `https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`,
    body,
  );
}
