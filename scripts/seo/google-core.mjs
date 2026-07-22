// ---------------------------------------------------------------------------
// google-core — Search Console access for the CLI, with no app imports.
//
// `src/lib/google.ts` already does all of this, but line 2 is
// `import prisma from '@/lib/prisma'` at module scope. That single import is
// the only thing preventing reuse from a script: importing the module opens a
// Prisma client against the production DATABASE_URL, which the content routines
// must never touch. So the credential + query layer is re-implemented here,
// standing on nothing but node builtins.
//
// Keep the two in sync when the auth model changes. They are deliberately
// duplicated, not shared, because the sharing direction would be
// script -> app and that is what drags prisma back in.
//
// CREDENTIAL RESOLUTION, in order:
//   1. GOOGLE_SERVICE_ACCOUNT_KEY      base64 JSON or raw JSON (how Fly has it)
//   2. GOOGLE_SERVICE_ACCOUNT_KEY_FILE path to the JSON key file
//   3. ~/.conclick/google-sa.json      the local default
//
// The routines run on a laptop under launchd, where Fly's secret is not
// present and cannot be read back out (`fly secrets` is write-only). So for
// local use, drop the service-account JSON at ~/.conclick/google-sa.json.
// ---------------------------------------------------------------------------

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SCOPES = [
  'https://www.googleapis.com/auth/webmasters.readonly',
  'https://www.googleapis.com/auth/analytics.readonly',
].join(' ');

const DEFAULT_KEY_FILE = path.join(os.homedir(), '.conclick', 'google-sa.json');

let cachedKey;

/** The parsed service-account key, or null when nothing is configured. */
export function loadKey() {
  if (cachedKey !== undefined) return cachedKey;

  let raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '';

  if (!raw) {
    const file = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE || DEFAULT_KEY_FILE;
    if (fs.existsSync(file)) raw = fs.readFileSync(file, 'utf8');
  }

  if (!raw.trim()) {
    cachedKey = null;
    return null;
  }

  try {
    // Accept both shapes. Fly stores it base64-encoded; a key file is raw JSON.
    const json = raw.trim().startsWith('{')
      ? raw
      : Buffer.from(raw, 'base64').toString('utf8');
    const parsed = JSON.parse(json);
    cachedKey = parsed.client_email && parsed.private_key ? parsed : null;
  } catch {
    cachedKey = null;
  }
  return cachedKey;
}

export function googleConfigured() {
  return !!loadKey();
}

export function serviceAccountEmail() {
  return loadKey()?.client_email || '';
}

/**
 * Where the key came from. Printed in run reports so a missing-credential
 * failure names the file it looked for instead of saying "not configured".
 */
export function keySource() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) return 'env GOOGLE_SERVICE_ACCOUNT_KEY';
  const file = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE || DEFAULT_KEY_FILE;
  return fs.existsSync(file) ? `file ${file}` : `nothing (looked in ${file})`;
}

const b64url = input => Buffer.from(input).toString('base64url');

let tokenCache = null;

/**
 * A service-account access token, self-signed then exchanged. Cached for the
 * process lifetime. Throws with the reason rather than returning null: a CLI
 * that silently produces no data is exactly the invisible failure the engine
 * keeps getting bitten by.
 */
export async function getToken() {
  const key = loadKey();
  if (!key) {
    throw new Error(
      `no service-account key — found ${keySource()}.\n` +
        `Fix: save the service-account JSON to ${DEFAULT_KEY_FILE}, or set ` +
        `GOOGLE_SERVICE_ACCOUNT_KEY_FILE to wherever it lives.`,
    );
  }

  if (tokenCache && tokenCache.expiresAt > Date.now()) return tokenCache.token;

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(
    JSON.stringify({
      iss: key.client_email,
      scope: SCOPES,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  );
  const signingInput = `${header}.${claims}`;
  const signature = crypto
    .createSign('RSA-SHA256')
    .update(signingInput)
    // A key pasted through a shell or a .env carries literal \n rather than
    // newlines, and openssl rejects that with an unhelpful decode error.
    .sign(key.private_key.replace(/\\n/g, '\n'));

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${signingInput}.${b64url(signature)}`,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(`token exchange failed ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }

  const data = await res.json();
  if (!data.access_token) throw new Error('token exchange returned no access_token');

  tokenCache = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return data.access_token;
}

async function googleGet(token, url) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`google ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

async function googlePost(token, url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`google ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

/** Properties this service account can actually read. */
export async function listSites(token) {
  const data = await googleGet(token, 'https://www.googleapis.com/webmasters/v3/sites');
  return (data.siteEntry || [])
    .filter(s => s.permissionLevel !== 'siteUnverifiedUser')
    .map(s => ({ siteUrl: s.siteUrl, permissionLevel: s.permissionLevel }));
}

/**
 * One Search Analytics query. `ctr` and `position` come back as a fraction and
 * an absolute rank respectively — 0.02 is 2%, NOT 2. Getting that wrong turns
 * a CTR floor into a filter that matches everything.
 */
export async function searchAnalytics(token, siteUrl, body) {
  const data = await googlePost(
    token,
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    { type: 'web', ...body },
  );
  return data.rows || [];
}

/**
 * Whether Google has a given URL in its index, via the URL Inspection API.
 * Rate limited to 2000/day and 600/minute per property, so callers should
 * sample rather than sweep the whole sitemap on every run.
 */
export async function inspectUrl(token, siteUrl, inspectionUrl) {
  const data = await googlePost(
    token,
    'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect',
    { inspectionUrl, siteUrl, languageCode: 'en-US' },
  );
  const result = data.inspectionResult?.indexStatusResult || {};
  return {
    url: inspectionUrl,
    verdict: result.verdict || 'UNKNOWN', // PASS | PARTIAL | FAIL | NEUTRAL
    coverageState: result.coverageState || '',
    lastCrawlTime: result.lastCrawlTime || null,
    indexed: result.coverageState === 'Submitted and indexed' || result.verdict === 'PASS',
  };
}

/** YYYY-MM-DD, n days ago. GSC data lags ~2 days, so callers offset the end. */
export function daysAgo(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}
