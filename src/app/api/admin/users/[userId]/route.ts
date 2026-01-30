import { NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { ROLES } from '@/lib/constants';
import { cookies } from 'next/headers';
import { deleteUser, getUser, updateUser } from '@/queries/prisma/user';

async function checkAdmin(req: Request) {
    const adminSession = (await cookies()).get('conclick_admin_session');
    const auth = await checkAuth(req);
    const isStandardAdmin = auth && auth.user.role === ROLES.admin;
    const isCookieAdmin = adminSession && adminSession.value === 'authenticated';
    return isStandardAdmin || isCookieAdmin;
}

export async function GET(req: Request, { params }: { params: Promise<{ userId: string }> }) {
    if (!(await checkAdmin(req))) return new NextResponse('Unauthorized', { status: 401 });
    const { userId } = await params;

    const user = await getUser(userId);
    return NextResponse.json(user);
}

export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
    if (!(await checkAdmin(req))) return new NextResponse('Unauthorized', { status: 401 });
    const { userId } = await params;
    const data = await req.json();

    const updated = await updateUser(userId, data);
    return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ userId: string }> }) {
    if (!(await checkAdmin(req))) return new NextResponse('Unauthorized', { status: 401 });
    const { userId } = await params;

    await deleteUser(userId);
    return NextResponse.json({ success: true });
}
