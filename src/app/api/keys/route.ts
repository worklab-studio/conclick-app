import { z } from 'zod';
import { parseRequest } from '@/lib/request';
import { json, unauthorized } from '@/lib/response';
import prisma from '@/lib/prisma';
import { generateApiKey } from '@/lib/apikey';

// GET — list the caller's active keys (never returns the key or its hash).
export async function GET(request: Request) {
  const { auth, error } = await parseRequest(request);
  if (error) return error();
  if (!auth?.user) return unauthorized();

  const keys = await prisma.client.apiKey.findMany({
    where: { userId: auth.user.id, revokedAt: null },
    select: {
      id: true,
      name: true,
      prefix: true,
      scope: true,
      lastUsedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return json({ keys });
}

// POST — create a key. The plaintext key is returned exactly once.
export async function POST(request: Request) {
  const schema = z.object({
    name: z.string().min(1).max(100),
    scope: z.enum(['all', 'read']).optional(),
  });

  const { auth, body, error } = await parseRequest(request, schema);
  if (error) return error();
  if (!auth?.user) return unauthorized();

  const { key, hash, prefix } = generateApiKey();

  const row = await prisma.client.apiKey.create({
    data: {
      userId: auth.user.id,
      name: body.name,
      keyHash: hash,
      prefix,
      scope: body.scope || 'all',
    },
    select: { id: true, name: true, prefix: true, scope: true, createdAt: true },
  });

  return json({ ...row, key });
}
