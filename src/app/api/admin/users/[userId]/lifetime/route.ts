import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';

// POST /api/admin/users/[userId]/lifetime
export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  if (!(await checkAdmin(req))) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { userId } = await params;

  if (!z.uuid().safeParse(userId).success) {
    return new NextResponse('Bad Request', { status: 400 });
  }

  try {
    // updateMany + deletedAt guard so a soft-deleted user can't be resurrected
    // into lifetime status, and a bad id returns 404 instead of throwing.
    const result = await prisma.client.user.updateMany({
      where: { id: userId, deletedAt: null },
      data: {
        subscriptionStatus: 'active',
        subscriptionPlan: 'lifetime',
        trialEndsAt: null,
        endsAt: null,
      },
    });

    if (result.count === 0) {
      return new NextResponse('Not Found', { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error granting lifetime access:', error?.message ?? error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
