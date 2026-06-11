import type { GatewayAdapter } from './types';
import { stripeGatewayAdapter } from './stripe';
import { dodoGatewayAdapter } from './dodo';
import { lemonsqueezyGatewayAdapter } from './lemonsqueezy';
import { paddleGatewayAdapter } from './paddle';
import { polarGatewayAdapter } from './polar';

/**
 * Registry of push-side webhook adapters. Add a gateway here once its file
 * implements `GatewayAdapter`. The key doubles as the `[gateway]` webhook URL
 * segment and the `provider` stored on payment_integration.
 */
export const GATEWAY_ADAPTERS: Record<string, GatewayAdapter> = {
  stripe: stripeGatewayAdapter,
  dodo: dodoGatewayAdapter,
  lemonsqueezy: lemonsqueezyGatewayAdapter,
  paddle: paddleGatewayAdapter,
  polar: polarGatewayAdapter,
};

export function getGatewayAdapter(id: string): GatewayAdapter | null {
  return GATEWAY_ADAPTERS[id] ?? null;
}

export * from './types';
