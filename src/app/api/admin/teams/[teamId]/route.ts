import { NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import { ROLES } from '@/lib/constants';
import { cookies } from 'next/headers';
import { deleteTeam } from '@/queries/prisma/team';

async function checkAdmin(req: Request) {
    const adminSession = (await cookies()).get('conclick_admin_session');
    const auth = await checkAuth(req);
    const isStandardAdmin = auth && auth.user.role === ROLES.admin;
    const isCookieAdmin = adminSession && adminSession.value === 'authenticated';
    return isStandardAdmin || isCookieAdmin;
}

export async function DELETE(req: Request, { params }: { params: Promise<{ teamId: string }> }) {
    if (!(await checkAdmin(req))) return new NextResponse('Unauthorized', { status: 401 });
    const { teamId } = await params;

    await deleteTeam(teamId);
    return NextResponse.json({ success: true });
}
