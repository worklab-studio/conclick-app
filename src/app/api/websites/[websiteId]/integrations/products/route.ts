import { z } from 'zod';
import { canUpdateWebsite } from '@/permissions';
import { parseRequest } from '@/lib/request';
import { json, unauthorized, badRequest } from '@/lib/response';
import { getRevenueProvider } from '@/lib/revenue';
import type { ProviderCredentials } from '@/lib/revenue';

// List a provider's products for the connect flow, so the user can scope this
// website's revenue to specific products. Validates the key live first.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const schema = z.object({
    provider: z.string().max(50),
    credentials: z.record(z.string(), z.string()),
  });

  const { auth, body, error } = await parseRequest(request, schema);
  if (error) return error();

  const { websiteId } = await params;
  if (!(await canUpdateWebsite(auth, websiteId))) return unauthorized();

  const provider = getRevenueProvider(body.provider);
  if (!provider) return badRequest({ message: 'Unknown payment provider.' });
  if (!provider.listProducts) return json({ products: [] });

  try {
    const validation = await provider.validate(body.credentials as ProviderCredentials);
    if (!validation.ok) {
      return badRequest({ message: validation.error || 'Could not validate those credentials.' });
    }
    const products = await provider.listProducts(body.credentials as ProviderCredentials);
    return json({ products });
  } catch (e: any) {
    return badRequest({ message: e?.message || 'Could not list products.' });
  }
}
