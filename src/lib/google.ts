import crypto from 'node:crypto';
import prisma from '@/lib/prisma';
import { decrypt, encrypt, secret, uuid } from '@/lib/crypto';

/**
 * Google integration (one consent, two products): Search Console (SEO tab) and
 * GA4 (one-time history import). Web-server OAuth with offline access; the
 * refresh token is stored encrypted per website. Tokens auto-refresh on read.
 *
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (OAuth client of type "Web
 * application" with redirect URI `${APP_URL}/api/google/callback`).
 */

export const GOOGLE_SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/webmasters.readonly',
  'https://www.googleapis.com/auth/analytics.readonly',
].join(' ');

export function getGoogleConfig() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://app.conclick.io',
  };
}

export function googleConfigured(): boolean {
  const { clientId, clientSecret } = getGoogleConfig();
  return !!clientId && !!clientSecret;
}

export const redirectUri = () => `${getGoogleConfig().appUrl}/api/google/callback`;

// ---------- CSRF state (HMAC-signed, user-bound, time-boxed) ----------

export function signState(websiteId: string, userId: string): string {
  const ts = Date.now().toString(36);
  const sig = crypto
    .createHmac('sha256', secret())
    .update(`google:${websiteId}:${userId}:${ts}`)
    .digest('base64url');
  return `${websiteId}.${userId}.${ts}.${sig}`;
}

/**
 * Returns the websiteId only when the signature checks out, the window hasn't
 * lapsed, AND the state was minted for `expectedUserId` — so a state token from
 * one session can't bind a Google account on another user's behalf.
 */
export function verifyState(state: string, expectedUserId: string): string | null {
  const [websiteId, userId, ts, sig] = (state || '').split('.');
  if (!websiteId || !userId || !ts || !sig) return null;
  if (userId !== expectedUserId) return null;
  const expected = crypto
    .createHmac('sha256', secret())
    .update(`google:${websiteId}:${userId}:${ts}`)
    .digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  // 15-minute window — long enough for the consent dance.
  if (Date.now() - parseInt(ts, 36) > 15 * 60_000) return null;
  return websiteId;
}

// ---------- OAuth ----------

export function buildAuthUrl(state: string): string {
  const { clientId } = getGoogleConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: GOOGLE_SCOPES,
    access_type: 'offline',
    prompt: 'consent', // always re-issue a refresh token on reconnect
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

async function tokenRequest(body: Record<string, string>) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    throw new Error(`google token ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return res.json() as Promise<{
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    scope?: string;
  }>;
}

export async function exchangeCode(code: string) {
  const { clientId, clientSecret } = getGoogleConfig();
  return tokenRequest({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri(),
    grant_type: 'authorization_code',
  });
}

async function refreshAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = getGoogleConfig();
  return tokenRequest({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
  });
}

// ---------- connection storage ----------

export async function saveConnection(
  websiteId: string,
  tokens: { access_token: string; expires_in: number; refresh_token?: string },
  email?: string | null,
) {
  const existing = await prisma.client.googleConnection.findUnique({ where: { websiteId } });
  const refreshToken = tokens.refresh_token
    ? encrypt(tokens.refresh_token, secret())
    : existing?.refreshToken;

  if (!refreshToken) throw new Error('Google did not return a refresh token');

  const data = {
    refreshToken,
    accessToken: encrypt(tokens.access_token, secret()),
    tokenExpires: new Date(Date.now() + (tokens.expires_in - 60) * 1000),
    ...(email ? { email } : {}),
  };

  if (existing) {
    return prisma.client.googleConnection.update({ where: { websiteId }, data });
  }
  return prisma.client.googleConnection.create({
    data: { id: uuid(), websiteId, ...data },
  });
}

export async function getConnection(websiteId: string) {
  return prisma.client.googleConnection.findUnique({ where: { websiteId } });
}

/** Valid access token for a connection — refreshes + persists when expired. */
export async function getAccessToken(websiteId: string): Promise<string | null> {
  const conn = await getConnection(websiteId);
  if (!conn) return null;

  try {
    if (conn.accessToken && conn.tokenExpires && conn.tokenExpires > new Date()) {
      return decrypt(conn.accessToken, secret());
    }
    const refreshed = await refreshAccessToken(decrypt(conn.refreshToken, secret()));
    await prisma.client.googleConnection.update({
      where: { websiteId },
      data: {
        accessToken: encrypt(refreshed.access_token, secret()),
        tokenExpires: new Date(Date.now() + (refreshed.expires_in - 60) * 1000),
      },
    });
    return refreshed.access_token;
  } catch {
    return null;
  }
}

// ---------- API wrappers ----------

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
