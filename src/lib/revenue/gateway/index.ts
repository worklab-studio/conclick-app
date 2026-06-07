import type { GatewayAdapter } from './types';
import { stripeGatewayAdapter } from './stripe';

/**
 * Registry of push-side webhook adapters. Add a gateway here once its file
 * implements `GatewayAdapter`. (Dodo, Polar, Lemon Squeezy, Razorpay follow.)
 */
export const GATEWAY_ADAPTERS: Record<string, GatewayAdapter> = {
  stripe: stripeGatewayAdapter,
};

export function getGatewayAdapter(id: string): GatewayAdapter | null {
  return GATEWAY_ADAPTERS[id] ?? null;
}

export * from './types';
