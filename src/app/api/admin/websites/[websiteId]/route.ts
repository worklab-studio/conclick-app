import { NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import { ROLES } from '@/lib/constants';
import { cookies } from 'next/headers';
import { deleteWebsite } from '@/queries/prisma/website';

async function checkAdmin(req: Request) {
    const adminSession = (await cookies()).get('conclick_admin_session');
    const auth = await checkAuth(req);
    const isStandardAdmin = auth && auth.user.role === ROLES.admin;
    const isCookieAdmin = adminSession && adminSession.value === 'authenticated';
    return isStandardAdmin || isCookieAdmin;
}

export async function DELETE(req: Request, { params }: { params: Promise<{ websiteId: string }> }) {
    if (!(await checkAdmin(req))) return new NextResponse('Unauthorized', { status: 401 });
    const { websiteId } = await params;

    await deleteWebsite(websiteId);
    return NextResponse.json({ success: true });
}
