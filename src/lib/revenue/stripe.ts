import Stripe from 'stripe';
import type {
  ProviderCredentials,
  RevenueProvider,
  RevenueRange,
  RevenueSummary,
  ValidationResult,
} from './types';

function client(apiKey: string) {
  // Omit apiVersion → the SDK uses its own pinned version (avoids a brittle
  // version string and the associated type mismatch on SDK upgrades).
  return new Stripe(apiKey, { typescript: true });
}

function bucketKey(date: Date, unit: RevenueRange['unit']) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const h = String(date.getUTCHours()).padStart(2, '0');
  if (unit === 'hour') return `${y}-${m}-${day}T${h}:00:00.000Z`;
  if (unit === 'month') return `${y}-${m}-01T00:00:00.000Z`;
  return `${y}-${m}-${day}T00:00:00.000Z`;
}

export const stripeProvider: RevenueProvider = {
  id: 'stripe',
  name: 'Stripe',

  async validate(credentials: ProviderCredentials): Promise<ValidationResult> {
    try {
      await client(credentials.apiKey).balance.retrieve();
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Invalid Stripe secret key.' };
    }
  },

  async fetchRevenue(
    credentials: ProviderCredentials,
    range: RevenueRange,
  ): Promise<RevenueSummary> {
    const stripe = client(credentials.apiKey);
    const buckets = new Map<string, number>();
    let total = 0;
    let currency = 'USD';

    const params: Stripe.BalanceTransactionListParams = {
      type: 'charge',
      created: {
        gte: Math.floor(range.startDate.getTime() / 1000),
        lte: Math.floor(range.endDate.getTime() / 1000),
      },
      limit: 100,
    };

    for await (const txn of stripe.balanceTransactions.list(params)) {
      const amount = (txn.amount || 0) / 100;
      total += amount;
      if (txn.currency) currency = txn.currency.toUpperCase();
      const key = bucketKey(new Date(txn.created * 1000), range.unit);
      buckets.set(key, (buckets.get(key) || 0) + amount);
    }

    const chart = [...buckets.entries()]
      .map(([x, y]) => ({ x, y: Math.round(y * 100) / 100 }))
      .sort((a, b) => new Date(a.x).getTime() - new Date(b.x).getTime());

    return { total: Math.round(total * 100) / 100, currency, chart };
  },

  // Auto-create the webhook so attribution is turnkey (parity with Dodo) — no
  // manual secret paste. Stripe only reveals an endpoint's signing secret at
  // creation, so a prior endpoint for this exact URL is unrecoverable: delete
  // and recreate to guarantee we hold a working secret (and avoid duplicate
  // deliveries on reconnect).
  async provisionWebhook(credentials: ProviderCredentials, webhookUrl: string) {
    const stripe = client(credentials.apiKey);
    const enabled_events = [
      'checkout.session.completed',
      'payment_intent.succeeded',
      'charge.refunded',
      'charge.dispute.created',
    ] as Stripe.WebhookEndpointCreateParams.EnabledEvent[];

    try {
      for await (const ep of stripe.webhookEndpoints.list({ limit: 100 })) {
        if (ep.url === webhookUrl) {
          await stripe.webhookEndpoints.del(ep.id).catch(() => undefined);
        }
      }
    } catch {
      /* listing failed — fall through and create a fresh endpoint */
    }

    const endpoint = await stripe.webhookEndpoints.create({
      url: webhookUrl,
      enabled_events,
      description: 'Conclick, revenue tracking + attribution',
    });
    return { webhookSecret: endpoint.secret || undefined };
  },
};
