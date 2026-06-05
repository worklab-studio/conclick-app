import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkAdmin } from '@/lib/auth';
import { deleteWebsite } from '@/queries/prisma/website';

export async function DELETE(req: Request, { params }: { params: Promise<{ websiteId: string }> }) {
  if (!(await checkAdmin(req))) return new NextResponse('Unauthorized', { status: 401 });
  const { websiteId } = await params;

  if (!z.uuid().safeParse(websiteId).success) {
    return new NextResponse('Bad Request', { status: 400 });
  }

  try {
    await deleteWebsite(websiteId);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e?.code === 'P2025') return new NextResponse('Not Found', { status: 404 });
    console.error('Admin website delete error:', e?.message ?? e);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
