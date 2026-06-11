/* eslint-disable no-console */
// Creates Conclick's two billing products in Dodo Payments (LIVE mode by default).
//
// Run it yourself (the API key never leaves your terminal):
//   DODO_PAYMENTS_API_KEY=sk_live_... npx tsx scripts/create-dodo-products.ts
//
// Optional env:
//   DODO_BRAND_ID=brand_...   attach to a specific brand (defaults to your primary
//                             brand — "conclick" if that's your only/primary one)
//   DODO_API_BASE=https://test.dodopayments.com   for a test-mode dry run
//
// Prints the product ids + the exact `fly secrets set` command to run next.

const API_BASE = process.env.DODO_API_BASE || 'https://live.dodopayments.com';
const API_KEY = process.env.DODO_PAYMENTS_API_KEY;
const BRAND_ID = process.env.DODO_BRAND_ID;

if (!API_KEY) {
  console.error('Set DODO_PAYMENTS_API_KEY (Dodo dashboard → Developer → API keys).');
  process.exit(1);
}

async function createProduct(body: Record<string, any>) {
  const res = await fetch(`${API_BASE}/products`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...(BRAND_ID ? { brand_id: BRAND_ID } : {}), ...body }),
  });
  if (!res.ok) {
    throw new Error(`POST /products → ${res.status}: ${(await res.text()).slice(0, 400)}`);
  }
  return res.json();
}

async function main() {
  console.log(`Creating products on ${API_BASE}${BRAND_ID ? ` (brand ${BRAND_ID})` : ''}…\n`);

  const monthly = await createProduct({
    name: 'Conclick Monthly',
    description: 'Conclick analytics — unlimited websites, revenue, funnels and click maps.',
    tax_category: 'saas',
    price: {
      type: 'recurring_price',
      currency: 'USD',
      price: 900, // $9.00 in cents
      discount: 0,
      purchasing_power_parity: false,
      payment_frequency_count: 1,
      payment_frequency_interval: 'Month',
      subscription_period_count: 1,
      subscription_period_interval: 'Month',
    },
  });
  console.log(`✓ Conclick Monthly  ($9/mo):   ${monthly.product_id}`);

  const lifetime = await createProduct({
    name: 'Conclick Lifetime',
    description: 'Conclick analytics forever — pay once, all current and future features.',
    tax_category: 'saas',
    price: {
      type: 'one_time_price',
      currency: 'USD',
      price: 9900, // $99.00 in cents
      discount: 0,
      purchasing_power_parity: false,
    },
  });
  console.log(`✓ Conclick Lifetime ($99 once): ${lifetime.product_id}\n`);

  console.log('Now set the secrets on Fly (paste your real values):\n');
  console.log(
    [
      'fly secrets set -a conclick \\',
      `  DODO_PAYMENTS_API_KEY='<your api key>' \\`,
      `  DODO_WEBHOOK_SECRET='<signing secret from the Dodo webhook you create>' \\`,
      `  DODO_MONTHLY_PRODUCT_ID='${monthly.product_id}' \\`,
      `  DODO_LIFETIME_PRODUCT_ID='${lifetime.product_id}'`,
    ].join('\n'),
  );
}

main().catch(e => {
  console.error(e.message || e);
  process.exit(1);
});
