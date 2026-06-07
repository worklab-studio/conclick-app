import { parseRequest } from '@/lib/request';
import { json, unauthorized, notFound } from '@/lib/response';
import prisma from '@/lib/prisma';

// DELETE — revoke a key (soft: sets revoked_at, takes effect immediately).
export async function DELETE(request: Request, { params }: { params: Promise<{ keyId: string }> }) {
  const { auth, error } = await parseRequest(request);
  if (error) return error();
  if (!auth?.user) return unauthorized();

  const { keyId } = await params;

  const result = await prisma.client.apiKey.updateMany({
    where: { id: keyId, userId: auth.user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  if (result.count === 0) return notFound({ message: 'Key not found.' });

  return json({ ok: true });
}
