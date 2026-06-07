import type { RevenueProvider } from './types';
import { dodoProvider } from './dodo';
import { stripeProvider } from './stripe';

/**
 * Registry of revenue providers. Register a new gateway here once its file
 * implements `RevenueProvider` and it becomes selectable in the connect UI.
 */
export const REVENUE_PROVIDERS: Record<string, RevenueProvider> = {
  stripe: stripeProvider,
  dodo: dodoProvider,
};

export function getRevenueProvider(id: string): RevenueProvider | null {
  return REVENUE_PROVIDERS[id] ?? null;
}

export * from './types';
