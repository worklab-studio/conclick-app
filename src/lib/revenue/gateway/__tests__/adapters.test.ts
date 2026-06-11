import crypto from 'node:crypto';
import { lemonsqueezyGatewayAdapter } from '../lemonsqueezy';
import { paddleGatewayAdapter } from '../paddle';
import { polarGatewayAdapter } from '../polar';
import { getGatewayAdapter } from '../index';

const headers = (h: Record<string, string>) => new Headers(h);

// ---------- Lemon Squeezy ----------

const lsBody = (eventName: string, attributes: Record<string, any>, id = '123') =>
  JSON.stringify({
    meta: { event_name: eventName, custom_data: { distinct_id: 'visitor-1' } },
    data: { type: 'orders', id, attributes },
  });

const lsSign = (body: string, secret: string) =>
  crypto.createHmac('sha256', secret).update(body).digest('hex');

describe('lemonsqueezy adapter', () => {
  const secret = 'ls-secret-123';

  it('verifies a valid X-Signature and rejects tampering', () => {
    const body = lsBody('order_created', { status: 'paid', total: 990, currency: 'USD' });
    const sig = lsSign(body, secret);
    expect(
      lemonsqueezyGatewayAdapter.verifySignature(body, headers({ 'x-signature': sig }), secret),
    ).toBe(true);
    expect(
      lemonsqueezyGatewayAdapter.verifySignature(
        body + ' ',
        headers({ 'x-signature': sig }),
        secret,
      ),
    ).toBe(false);
    expect(lemonsqueezyGatewayAdapter.verifySignature(body, headers({}), secret)).toBe(false);
  });

  it('ingests a paid order; ignores pending; cents preserved', () => {
    const paid = lemonsqueezyGatewayAdapter.parseEvent(
      lsBody('order_created', {
        status: 'paid',
        total: 9900,
        currency: 'usd',
        created_at: '2026-06-01T10:00:00Z',
      }),
    )!;
    const ev = lemonsqueezyGatewayAdapter.toRevenueEvent(paid)!;
    expect(ev.type).toBe('payment');
    expect(ev.amountMinor).toBe(9900n);
    expect(ev.currency).toBe('USD');
    expect(ev.gatewayEventId).toBe('order:123');

    const pending = lemonsqueezyGatewayAdapter.parseEvent(
      lsBody('order_created', { status: 'pending', total: 9900 }),
    )!;
    expect(lemonsqueezyGatewayAdapter.toRevenueEvent(pending)).toBeNull();
  });

  it('initial subscription invoice is SKIPPED (the paid order already counted it); renewals ingest', () => {
    // New subscription → LS fires BOTH order_created and the initial invoice.
    // Counting both would double every first charge.
    const initial = lemonsqueezyGatewayAdapter.parseEvent(
      lsBody(
        'subscription_payment_success',
        { status: 'paid', total: 900, billing_reason: 'initial' },
        '77',
      ),
    )!;
    expect(lemonsqueezyGatewayAdapter.toRevenueEvent(initial)).toBeNull();

    const renewal = lemonsqueezyGatewayAdapter.toRevenueEvent(
      lemonsqueezyGatewayAdapter.parseEvent(
        lsBody(
          'subscription_payment_success',
          { status: 'paid', total: 900, billing_reason: 'renewal' },
          '78',
        ),
      )!,
    )!;
    expect(renewal.amountMinor).toBe(900n);
    expect(renewal.gatewayEventId).toBe('subinv:78');
  });

  it('refunds are negative and read meta.custom_data identity', () => {
    const parsed = lemonsqueezyGatewayAdapter.parseEvent(
      lsBody('order_refunded', {
        status: 'refunded',
        total: 9900,
        refunded_amount: 9900,
        currency: 'USD',
        refunded_at: '2026-06-02T10:00:00Z',
      }),
    )!;
    const ev = lemonsqueezyGatewayAdapter.toRevenueEvent(parsed)!;
    expect(ev.type).toBe('refund');
    expect(ev.amountMinor).toBe(-9900n);
    // refunded_amount is cumulative → replace mode so partial-then-full converges
    expect(ev.mode).toBe('replace');
    expect(lemonsqueezyGatewayAdapter.extractIdentity(parsed.native).distinctId).toBe('visitor-1');
  });

  it('ignores unhandled events', () => {
    expect(
      lemonsqueezyGatewayAdapter.parseEvent(lsBody('subscription_created', { total: 1 })),
    ).toBeNull();
  });
});

// ---------- Paddle ----------

const paddleBody = (eventType: string, data: Record<string, any>) =>
  JSON.stringify({
    event_id: 'evt_abc',
    event_type: eventType,
    occurred_at: '2026-06-01T10:00:00Z',
    data,
  });

const paddleSig = (body: string, secret: string, ts = '1771552777') =>
  `ts=${ts};h1=${crypto.createHmac('sha256', secret).update(`${ts}:${body}`).digest('hex')}`;

describe('paddle adapter', () => {
  const secret = 'pdl_ntfset_secret';

  it('verifies ts:body HMAC and rejects a wrong secret', () => {
    const body = paddleBody('transaction.completed', { id: 'txn_1' });
    expect(
      paddleGatewayAdapter.verifySignature(
        body,
        headers({ 'paddle-signature': paddleSig(body, secret) }),
        secret,
      ),
    ).toBe(true);
    expect(
      paddleGatewayAdapter.verifySignature(
        body,
        headers({ 'paddle-signature': paddleSig(body, 'other') }),
        secret,
      ),
    ).toBe(false);
  });

  it('accepts any matching h1 during secret rotation', () => {
    const body = paddleBody('transaction.completed', { id: 'txn_1' });
    const ts = '1771552777';
    const good = crypto.createHmac('sha256', secret).update(`${ts}:${body}`).digest('hex');
    const header = `ts=${ts};h1=${'0'.repeat(64)};h1=${good}`;
    expect(
      paddleGatewayAdapter.verifySignature(body, headers({ 'paddle-signature': header }), secret),
    ).toBe(true);
  });

  it('transaction.completed: string cents → bigint, custom_data identity', () => {
    const parsed = paddleGatewayAdapter.parseEvent(
      paddleBody('transaction.completed', {
        id: 'txn_01h',
        currency_code: 'usd',
        billed_at: '2026-06-01T10:00:00Z',
        custom_data: { distinct_id: 'visitor-2' },
        details: { totals: { grand_total: '10800' } },
      }),
    )!;
    const ev = paddleGatewayAdapter.toRevenueEvent(parsed)!;
    expect(ev.amountMinor).toBe(10800n);
    expect(ev.currency).toBe('USD');
    expect(ev.gatewayEventId).toBe('txn:txn_01h');
    expect(paddleGatewayAdapter.extractIdentity(parsed.native).distinctId).toBe('visitor-2');
  });

  it('refunds count only when approved; chargebacks count on created', () => {
    const pending = paddleGatewayAdapter.parseEvent(
      paddleBody('adjustment.created', {
        id: 'adj_1',
        action: 'refund',
        status: 'pending_approval',
        totals: { total: '500' },
      }),
    )!;
    expect(paddleGatewayAdapter.toRevenueEvent(pending)).toBeNull();

    const approved = paddleGatewayAdapter.parseEvent(
      paddleBody('adjustment.updated', {
        id: 'adj_1',
        action: 'refund',
        status: 'approved',
        currency_code: 'USD',
        totals: { total: '500' },
      }),
    )!;
    const ev = paddleGatewayAdapter.toRevenueEvent(approved)!;
    expect(ev.type).toBe('refund');
    expect(ev.amountMinor).toBe(-500n);
    expect(ev.gatewayEventId).toBe('adj:adj_1');

    // Chargebacks arrive pre-approved (status=approved on created).
    const chargeback = paddleGatewayAdapter.parseEvent(
      paddleBody('adjustment.created', {
        id: 'adj_2',
        action: 'chargeback',
        status: 'approved',
        totals: { total: '900' },
      }),
    )!;
    const cb = paddleGatewayAdapter.toRevenueEvent(chargeback)!;
    expect(cb.type).toBe('dispute');
    expect(cb.amountMinor).toBe(-900n);
  });

  it('chargeback reversals come back POSITIVE — a won dispute is no longer a loss', () => {
    const reversal = paddleGatewayAdapter.parseEvent(
      paddleBody('adjustment.created', {
        id: 'adj_3',
        action: 'chargeback_reverse',
        status: 'approved',
        currency_code: 'USD',
        totals: { total: '900' },
      }),
    )!;
    const ev = paddleGatewayAdapter.toRevenueEvent(reversal)!;
    expect(ev.type).toBe('dispute');
    expect(ev.amountMinor).toBe(900n);
    expect(ev.gatewayEventId).toBe('adj:adj_3');
  });
});

// ---------- Polar ----------

const polarBody = (type: string, data: Record<string, any>) =>
  JSON.stringify({ type, timestamp: '2026-06-01T10:00:00Z', data });

const polarSign = (body: string, secret: string, id = 'msg_1', ts = '1771552777') => {
  // Polar's SDK uses the UTF-8 bytes of the merchant-chosen secret as the HMAC key.
  const sig = crypto
    .createHmac('sha256', Buffer.from(secret, 'utf-8'))
    .update(`${id}.${ts}.${body}`)
    .digest('base64');
  return headers({
    'webhook-id': id,
    'webhook-timestamp': ts,
    'webhook-signature': `v1,${sig}`,
  });
};

describe('polar adapter', () => {
  const secret = 'polar-chosen-secret';

  it('verifies standard-webhooks signatures (utf-8 secret) and rejects tampering', () => {
    const body = polarBody('order.paid', { id: 'o1' });
    expect(polarGatewayAdapter.verifySignature(body, polarSign(body, secret), secret)).toBe(true);
    expect(polarGatewayAdapter.verifySignature(body + 'x', polarSign(body, secret), secret)).toBe(
      false,
    );
  });

  it('also accepts whsec_-style base64 secrets (dodo-compatible paste)', () => {
    const raw = crypto.randomBytes(24);
    const whsec = `whsec_${raw.toString('base64')}`;
    const body = polarBody('order.paid', { id: 'o1' });
    const id = 'msg_2';
    const ts = '1771552777';
    const sig = crypto.createHmac('sha256', raw).update(`${id}.${ts}.${body}`).digest('base64');
    const h = headers({
      'webhook-id': id,
      'webhook-timestamp': ts,
      'webhook-signature': `v1,${sig}`,
    });
    expect(polarGatewayAdapter.verifySignature(body, h, whsec)).toBe(true);
  });

  it('order.paid ingests; renewals get distinct order ids; metadata identity', () => {
    const parsed = polarGatewayAdapter.parseEvent(
      polarBody('order.paid', {
        id: 'order-uuid-1',
        status: 'paid',
        total_amount: 1900,
        currency: 'usd',
        billing_reason: 'subscription_cycle',
        metadata: { distinct_id: 'visitor-3' },
        created_at: '2026-06-01T10:00:00Z',
      }),
    )!;
    const ev = polarGatewayAdapter.toRevenueEvent(parsed)!;
    expect(ev.amountMinor).toBe(1900n);
    expect(ev.gatewayEventId).toBe('order:order-uuid-1');
    expect(polarGatewayAdapter.extractIdentity(parsed.native).distinctId).toBe('visitor-3');
  });

  it('refunds count only at status=succeeded, as negative deltas', () => {
    const pending = polarGatewayAdapter.parseEvent(
      polarBody('refund.created', { id: 'r1', status: 'pending', amount: 500 }),
    )!;
    expect(polarGatewayAdapter.toRevenueEvent(pending)).toBeNull();

    const ok = polarGatewayAdapter.parseEvent(
      polarBody('refund.updated', { id: 'r1', status: 'succeeded', amount: 500, currency: 'usd' }),
    )!;
    const ev = polarGatewayAdapter.toRevenueEvent(ok)!;
    expect(ev.amountMinor).toBe(-500n);
    expect(ev.gatewayEventId).toBe('refund:r1');
  });

  it('refunds include the refunded tax so they mirror the tax-inclusive payment', () => {
    // Payment was total_amount (incl. tax); refund splits amount + tax_amount.
    const parsed = polarGatewayAdapter.parseEvent(
      polarBody('refund.created', {
        id: 'r2',
        status: 'succeeded',
        amount: 1900,
        tax_amount: 190,
        currency: 'usd',
      }),
    )!;
    expect(polarGatewayAdapter.toRevenueEvent(parsed)!.amountMinor).toBe(-2090n);
  });

  it('order.created is intentionally ignored (renewals are created pending)', () => {
    expect(polarGatewayAdapter.parseEvent(polarBody('order.created', { id: 'o1' }))).toBeNull();
  });
});

describe('registry', () => {
  it('resolves all five gateways', () => {
    for (const id of ['stripe', 'dodo', 'lemonsqueezy', 'paddle', 'polar']) {
      expect(getGatewayAdapter(id)?.id).toBe(id);
    }
    expect(getGatewayAdapter('unknown')).toBeNull();
  });
});
