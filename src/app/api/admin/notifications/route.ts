import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';

const schema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(500),
  type: z.enum(['alert', 'info', 'success', 'warning']).optional(),
});

// POST /api/admin/notifications — broadcast a notification to all active users.
export async function POST(req: Request) {
  if (!(await checkAdmin(req))) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new NextResponse('Invalid JSON', { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 });
  }

  const { title, message, type } = parsed.data;

  try {
    const users = await prisma.client.user.findMany({
      where: { deletedAt: null },
      select: { id: true },
    });

    if (users.length > 0) {
      await prisma.client.notification.createMany({
        data: users.map(user => ({
          userId: user.id,
          title,
          message,
          type: type || 'info',
          read: false,
        })),
      });
    }

    return NextResponse.json({ success: true, count: users.length });
  } catch (error: any) {
    console.error('Error broadcasting notifications:', error?.message ?? error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
