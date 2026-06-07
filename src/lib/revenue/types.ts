/**
 * Provider-agnostic revenue layer.
 *
 * Every payment gateway (Stripe, Dodo, Polar, Lemon Squeezy, Paddle, …)
 * implements `RevenueProvider`, so the dashboard, the `/revenue` endpoint and
 * the connect UI never need to know which gateway is behind a website. Adding a
 * new integration = one new file implementing this interface + registering it.
 */

export type RevenueUnit = 'hour' | 'day' | 'month';

export interface RevenueRange {
  startDate: Date;
  endDate: Date;
  unit: RevenueUnit;
}

/** A single bucket on the revenue chart. `x` is an ISO timestamp, `y` an amount in major units. */
export interface RevenuePoint {
  x: string;
  y: number;
}

export interface RevenueSummary {
  /** Total revenue in major units (e.g. dollars, not cents) over the range. */
  total: number;
  /** ISO-4217 currency code of the totals (best-effort; first/dominant currency). */
  currency: string;
  /** Time-bucketed series for the chart. */
  chart: RevenuePoint[];
}

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

/** Credentials a user supplies when connecting a gateway (always stored encrypted). */
export interface ProviderCredentials {
  apiKey: string;
  /** 'test' | 'live' — providers with separate environments (Dodo, Stripe test keys, …). */
  mode?: string;
  /** Webhook signing secret, when the provider uses webhooks. */
  webhookSecret?: string;
  [key: string]: string | undefined;
}

export interface RevenueProvider {
  /** Stable id, e.g. 'stripe' | 'dodo' | 'polar'. */
  id: string;
  /** Human label. */
  name: string;
  /** Cheap authenticated call to confirm the credentials work before saving. */
  validate(credentials: ProviderCredentials): Promise<ValidationResult>;
  /** Fetch normalized revenue for a date range. */
  fetchRevenue(credentials: ProviderCredentials, range: RevenueRange): Promise<RevenueSummary>;
}

/** Empty summary — used when a website has no connected provider. */
export const EMPTY_SUMMARY: RevenueSummary = { total: 0, currency: 'USD', chart: [] };
