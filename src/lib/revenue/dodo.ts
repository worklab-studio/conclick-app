import type {
  ProviderCredentials,
  ProviderCustomer,
  ProviderProduct,
  RevenueProvider,
  RevenueRange,
  RevenueSummary,
  ValidationResult,
} from './types';

// Dodo Payments REST API. Test/live are separate hosts; the API key carries
// the environment, but we also let the caller pin a mode explicitly.
function baseUrl(mode?: string) {
  return mode === 'live' ? 'https://live.dodopayments.com' : 'https://test.dodopayments.com';
}

interface DodoPayment {
  payment_id: string;
  total_amount: number; // minor units (e.g. cents)
  currency: string;
  status: string;
  created_at: string;
  metadata?: Record<string, string>;
  customer?: { customer_id?: string; name?: string; email?: string };
}

const MAX_PAGES = 25; // safety cap → up to 2,500 payments per fetch

// All succeeded payments in range, optionally scoped to a single Dodo product
// via the API's `product_id` filter (payment objects don't expose a product, so
// scoping must happen in the query, not by filtering the result).
async function fetchPayments(
  credentials: ProviderCredentials,
  range: RevenueRange,
  productId?: string,
): Promise<DodoPayment[]> {
  const { apiKey, mode } = credentials;
  const out: DodoPayment[] = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    const params = new URLSearchParams({
      status: 'succeeded',
      page_size: '100',
      page_number: String(page),
      created_at_gte: range.startDate.toISOString(),
      created_at_lte: range.endDate.toISOString(),
    });
    if (productId) params.set('product_id', productId);

    const res = await fetch(`${baseUrl(mode)}/payments?${params.toString()}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      throw new Error(`Dodo API ${res.status}`);
    }

    const body = await res.json();
    const items: DodoPayment[] = body?.items ?? body?.data ?? [];
    out.push(...items);

    if (items.length < 100) break; // last page
  }

  return out;
}

// Payments for the integration. Multi-product accounts scope to the selected
// product ids (credentials.productIds, comma-separated): one query per product,
// merged + deduped by payment_id — so two websites sharing one Dodo key don't
// each report the whole account's revenue.
async function listPayments(
  credentials: ProviderCredentials,
  range: RevenueRange,
): Promise<DodoPayment[]> {
  const productIds = (credentials.productIds || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  if (!productIds.length) {
    return fetchPayments(credentials, range);
  }

  const seen = new Set<string>();
  const out: DodoPayment[] = [];
  for (const productId of productIds) {
    for (const p of await fetchPayments(credentials, range, productId)) {
      if (!seen.has(p.payment_id)) {
        seen.add(p.payment_id);
        out.push(p);
      }
    }
  }
  return out;
}

// Bucket an ISO timestamp into a chart key + a normalized ISO `x` (UTC).
function bucketKey(iso: string, unit: RevenueRange['unit']) {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const h = String(d.getUTCHours()).padStart(2, '0');
  if (unit === 'hour') return `${y}-${m}-${day}T${h}:00:00.000Z`;
  if (unit === 'month') return `${y}-${m}-01T00:00:00.000Z`;
  return `${y}-${m}-${day}T00:00:00.000Z`;
}

export const dodoProvider: RevenueProvider = {
  id: 'dodo',
  name: 'Dodo Payments',

  async validate(credentials: ProviderCredentials): Promise<ValidationResult> {
    try {
      const res = await fetch(`${baseUrl(credentials.mode)}/payments?page_size=1`, {
        headers: { Authorization: `Bearer ${credentials.apiKey}` },
      });
      if (res.ok) return { ok: true };
      if (res.status === 401 || res.status === 403) {
        return { ok: false, error: 'Invalid API key for the selected mode.' };
      }
      return { ok: false, error: `Dodo API returned ${res.status}.` };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Could not reach Dodo Payments.' };
    }
  },

  async fetchRevenue(
    credentials: ProviderCredentials,
    range: RevenueRange,
  ): Promise<RevenueSummary> {
    const payments = await listPayments(credentials, range);

    const buckets = new Map<string, number>();
    let total = 0;
    const currencyCount = new Map<string, number>();

    for (const p of payments) {
      const amount = (p.total_amount || 0) / 100; // minor units → major
      total += amount;
      const key = bucketKey(p.created_at, range.unit);
      buckets.set(key, (buckets.get(key) || 0) + amount);
      if (p.currency) currencyCount.set(p.currency, (currencyCount.get(p.currency) || 0) + 1);
    }

    // Dominant currency (best-effort; mixed-currency accounts get the most common).
    const currency = [...currencyCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'USD';

    const chart = [...buckets.entries()]
      .map(([x, y]) => ({ x, y: Math.round(y * 100) / 100 }))
      .sort((a, b) => new Date(a.x).getTime() - new Date(b.x).getTime());

    return { total: Math.round(total * 100) / 100, currency, chart };
  },

  // List the account's products so a user can scope a website to specific ones.
  async listProducts(credentials: ProviderCredentials): Promise<ProviderProduct[]> {
    const { apiKey, mode } = credentials;
    const out: ProviderProduct[] = [];

    for (let page = 0; page < 10; page++) {
      const params = new URLSearchParams({
        page_size: '100',
        page_number: String(page),
        archived: 'false',
      });

      const res = await fetch(`${baseUrl(mode)}/products?${params.toString()}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!res.ok) {
        throw new Error(`Dodo API ${res.status}`);
      }

      const body = await res.json();
      const items = body?.items ?? body?.data ?? [];
      for (const p of items) {
        if (p?.product_id) {
          out.push({ id: p.product_id, name: p.name || p.product_id });
        }
      }

      if (items.length < 100) break;
    }

    return out;
  },

  // Paying customers grouped from payments (product-scoped) — populates the
  // Customers tab when there's no webhook-attributed data.
  async listCustomers(
    credentials: ProviderCredentials,
    range: RevenueRange,
  ): Promise<ProviderCustomer[]> {
    const payments = await listPayments(credentials, range);
    const map = new Map<string, ProviderCustomer>();

    for (const p of payments) {
      const cust = p.customer || {};
      const id = cust.customer_id || cust.email || p.payment_id;
      const amount = p.total_amount || 0;
      const existing = map.get(id);
      if (existing) {
        existing.totalMinor += amount;
        existing.count += 1;
        if (new Date(p.created_at) > new Date(existing.lastAt)) {
          existing.lastAt = p.created_at;
        }
      } else {
        map.set(id, {
          id,
          name: cust.name || undefined,
          email: cust.email || undefined,
          totalMinor: amount,
          currency: p.currency || 'USD',
          count: 1,
          lastAt: p.created_at,
        });
      }
    }

    return [...map.values()].sort((a, b) => b.totalMinor - a.totalMinor);
  },

  // Auto-create the webhook for this URL (reusing an existing one) + fetch its
  // signing secret, so connecting needs no manual webhook setup.
  async provisionWebhook(credentials, webhookUrl) {
    const { apiKey, mode } = credentials;
    const base = baseUrl(mode);
    const authHeader = { Authorization: `Bearer ${apiKey}` };

    // Reuse an existing webhook with the same URL (avoids duplicates on reconnect).
    let id: string | undefined;
    try {
      const listRes = await fetch(`${base}/webhooks?page_size=100`, { headers: authHeader });
      if (listRes.ok) {
        const body = await listRes.json();
        const items = body?.items ?? body?.data ?? [];
        id = items.find((w: any) => w?.url === webhookUrl)?.id;
      }
    } catch {
      /* ignore — fall through to create */
    }

    if (!id) {
      const createRes = await fetch(`${base}/webhooks`, {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          description: 'Conclick, payment attribution',
          filter_types: ['payment.succeeded', 'refund.succeeded', 'dispute.accepted'],
        }),
      });
      if (!createRes.ok) {
        throw new Error(`Dodo webhook create ${createRes.status}`);
      }
      id = (await createRes.json())?.id;
    }
    if (!id) return {};

    const secretRes = await fetch(`${base}/webhooks/${id}/secret`, { headers: authHeader });
    if (!secretRes.ok) return {};
    const secretBody = await secretRes.json();
    return { webhookSecret: secretBody?.secret ? String(secretBody.secret) : undefined };
  },
};
