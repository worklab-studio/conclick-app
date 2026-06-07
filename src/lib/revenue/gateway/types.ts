/**
 * Push-side revenue layer: gateway webhooks → ONE normalized event shape.
 *
 * Deliberately separate from the pull-side `RevenueProvider` (which fetches
 * aggregate totals). Every gateway (Stripe, Dodo, Polar, Lemon Squeezy,
 * Razorpay) implements `GatewayAdapter`; the rest of the system only ever sees
 * `NormalizedRevenueEvent`, never a gateway-specific payload. Each adapter does
 * four things and nothing else: verify signature → parse → extract identity →
 * normalize.
 */

export type RevenueEventType = 'payment' | 'refund' | 'dispute';

/** The single internal shape every gateway normalizes into. */
export interface NormalizedRevenueEvent {
  /** Deterministic visitor id stamped into the gateway's metadata at checkout. */
  distinctId: string | null;
  /**
   * Conclick session id, only when the integration passed it directly. Usually
   * null and recomputed from `distinctId` at ingest time.
   */
  sessionId: string | null;
  gateway: string;
  /** Gateway's own id for this money movement — the idempotency key (with `gateway`). */
  gatewayEventId: string;
  type: RevenueEventType;
  /** Original minor units (cents, paise…). Refunds/disputes are NEGATIVE. */
  amountMinor: bigint;
  currency: string;
  occurredAt: Date;
  /** The raw native event, stored verbatim for audit/debugging. */
  rawPayload: unknown;
}

/** The money/type/time fields an adapter produces (identity is merged in separately). */
export type RevenueEventCore = Omit<NormalizedRevenueEvent, 'distinctId' | 'sessionId'>;

/** A verified + parsed native event handed between adapter steps. */
export interface ParsedGatewayEvent {
  /** Native event kind, e.g. 'charge.refunded' (for branching/logging). */
  kind: string;
  /** The native event object (gateway-specific). */
  native: any;
}

export interface GatewayAdapter {
  /** Stable id, e.g. 'stripe' | 'dodo'. */
  id: string;
  /**
   * Verify the webhook signature using THIS gateway's scheme, against the raw
   * request body bytes. Returns false (never throws) on mismatch.
   */
  verifySignature(rawBody: string, headers: Headers, secret: string): boolean | Promise<boolean>;
  /**
   * Parse a verified payload. Returns null for event kinds we intentionally
   * ignore (the route then 200s without inserting, so the gateway stops retrying).
   */
  parseEvent(rawBody: string): ParsedGatewayEvent | null;
  /** Pull distinct_id / session_id out of THIS gateway's metadata field. */
  extractIdentity(native: any): { distinctId: string | null; sessionId: string | null };
  /** Map a parsed native event to the normalized money fields (units, sign, type). */
  toRevenueEvent(parsed: ParsedGatewayEvent): RevenueEventCore | null;
}

/** Read our two identity keys out of any gateway `metadata`-shaped object. */
export function identityFromMetadata(metadata?: Record<string, any> | null): {
  distinctId: string | null;
  sessionId: string | null;
} {
  const m = metadata || {};
  const distinctId = m.distinct_id ?? m.distinctId ?? null;
  const sessionId = m.session_id ?? m.sessionId ?? null;
  return {
    distinctId: distinctId != null ? String(distinctId) : null,
    sessionId: sessionId != null ? String(sessionId) : null,
  };
}
