#!/usr/bin/env node
/**
 * Conclick MCP server.
 *
 * Lets Cursor, Claude Code, Codex, or any MCP client control Conclick from a
 * prompt: query visitors, inspect revenue, manage websites, connect payment
 * providers. It is a thin, typed wrapper over the Conclick REST API,
 * authenticated with a Conclick API key.
 *
 * Config (env):
 *   CONCLICK_API_KEY   required — create one in Conclick → Account → API Keys
 *   CONCLICK_API_URL   optional — defaults to https://app.conclick.io
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const BASE = (process.env.CONCLICK_API_URL || 'https://app.conclick.io').replace(/\/+$/, '');
const KEY = process.env.CONCLICK_API_KEY;

if (!KEY) {
  console.error(
    'CONCLICK_API_KEY is not set. Create a key in Conclick → Account → API Keys, then set it in your MCP server env.',
  );
  process.exit(1);
}

async function api(path, { method = 'GET', query, body } = {}) {
  const url = new URL(`${BASE}/api${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${KEY}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg =
      (data && data.error && (data.error.message || data.error)) || data || `HTTP ${res.status}`;
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
  return data;
}

// Build a rolling date-range query (startAt/endAt in ms + a sensible unit).
function range(days = 7) {
  const endAt = Date.now();
  const startAt = endAt - days * 86_400_000;
  const unit = days <= 2 ? 'hour' : days <= 90 ? 'day' : 'month';
  return { startAt, endAt, unit };
}

const ok = data => ({
  content: [
    { type: 'text', text: typeof data === 'string' ? data : JSON.stringify(data, null, 2) },
  ],
});
const fail = e => ({ content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true });

const server = new McpServer({ name: 'conclick', version: '0.1.0' });

server.tool(
  'list_websites',
  'List the websites in your Conclick account (id, name, domain).',
  async () => {
    try {
      return ok(await api('/websites'));
    } catch (e) {
      return fail(e);
    }
  },
);

server.tool(
  'get_stats',
  'Summary analytics for a website over the last N days: visitors, pageviews, bounce rate and average visit time, with previous-period comparison.',
  {
    websiteId: z.string().describe('Website id (from list_websites).'),
    days: z
      .number()
      .int()
      .positive()
      .max(365)
      .optional()
      .describe('Lookback window in days (default 7).'),
  },
  async ({ websiteId, days }) => {
    try {
      return ok(await api(`/websites/${websiteId}/stats`, { query: range(days || 7) }));
    } catch (e) {
      return fail(e);
    }
  },
);

server.tool(
  'get_top',
  'Top-N breakdown for a website — e.g. top pages, referrers, browsers, countries.',
  {
    websiteId: z.string(),
    type: z
      .enum([
        'path',
        'entry',
        'exit',
        'referrer',
        'channel',
        'browser',
        'os',
        'device',
        'country',
        'region',
        'city',
        'language',
      ])
      .describe('Which breakdown to fetch.'),
    days: z.number().int().positive().max(365).optional(),
    limit: z.number().int().positive().max(100).optional().describe('Max rows (default 10).'),
  },
  async ({ websiteId, type, days, limit }) => {
    try {
      return ok(
        await api(`/websites/${websiteId}/metrics`, {
          query: { type, ...range(days || 7), limit: limit || 10 },
        }),
      );
    } catch (e) {
      return fail(e);
    }
  },
);

server.tool(
  'get_revenue',
  'Revenue for a website over the last N days (requires a connected payment provider).',
  {
    websiteId: z.string(),
    days: z
      .number()
      .int()
      .positive()
      .max(365)
      .optional()
      .describe('Lookback window in days (default 30).'),
  },
  async ({ websiteId, days }) => {
    try {
      return ok(await api(`/websites/${websiteId}/revenue`, { query: range(days || 30) }));
    } catch (e) {
      return fail(e);
    }
  },
);

server.tool(
  'add_website',
  'Create a new website to track in Conclick.',
  {
    name: z.string().describe('Display name.'),
    domain: z.string().describe('Domain, e.g. example.com.'),
  },
  async ({ name, domain }) => {
    try {
      return ok(await api('/websites', { method: 'POST', body: { name, domain } }));
    } catch (e) {
      return fail(e);
    }
  },
);

server.tool(
  'connect_payment_provider',
  'Connect a payment provider (e.g. dodo, stripe) to a website so revenue flows into Conclick. The key is validated live, then stored encrypted.',
  {
    websiteId: z.string(),
    provider: z.enum(['dodo', 'stripe']).describe('Payment provider.'),
    apiKey: z.string().describe("The provider's API / secret key."),
    mode: z
      .enum(['test', 'live'])
      .optional()
      .describe('Environment, for providers that have one (Dodo).'),
  },
  async ({ websiteId, provider, apiKey, mode }) => {
    try {
      const credentials = { apiKey };
      if (mode) credentials.mode = mode;
      return ok(
        await api(`/websites/${websiteId}/integrations`, {
          method: 'POST',
          body: { provider, credentials },
        }),
      );
    } catch (e) {
      return fail(e);
    }
  },
);

server.tool(
  'get_realtime',
  'Current active visitors on a website right now (the live count, last few minutes).',
  { websiteId: z.string() },
  async ({ websiteId }) => {
    try {
      return ok(await api(`/websites/${websiteId}/active`));
    } catch (e) {
      return fail(e);
    }
  },
);

server.tool(
  'get_pageviews',
  'Time-bucketed pageviews + visitors series for a website over the last N days (for trends and charts).',
  {
    websiteId: z.string(),
    days: z
      .number()
      .int()
      .positive()
      .max(365)
      .optional()
      .describe('Lookback window in days (default 7).'),
  },
  async ({ websiteId, days }) => {
    try {
      return ok(await api(`/websites/${websiteId}/pageviews`, { query: range(days || 7) }));
    } catch (e) {
      return fail(e);
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('Conclick MCP server running (stdio).');
