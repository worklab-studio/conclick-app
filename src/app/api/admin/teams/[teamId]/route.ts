import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkAdmin } from '@/lib/auth';
import { deleteTeam } from '@/queries/prisma/team';

export async function DELETE(req: Request, { params }: { params: Promise<{ teamId: string }> }) {
  if (!(await checkAdmin(req))) return new NextResponse('Unauthorized', { status: 401 });
  const { teamId } = await params;

  if (!z.uuid().safeParse(teamId).success) {
    return new NextResponse('Bad Request', { status: 400 });
  }

  try {
    await deleteTeam(teamId);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e?.code === 'P2025') return new NextResponse('Not Found', { status: 404 });
    console.error('Admin team delete error:', e?.message ?? e);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
