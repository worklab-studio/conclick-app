import type {
  ProviderCredentials,
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
}

const MAX_PAGES = 25; // safety cap → up to 2,500 payments per fetch

async function listPayments(
  credentials: ProviderCredentials,
  range: RevenueRange,
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
};
