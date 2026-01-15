import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { canUpdateUser, canViewUser } from '@/permissions';
import { parseRequest } from '@/lib/request';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
        return NextResponse.json({ error: 'Username required' }, { status: 400 });
    }

    try {
        const { auth } = await parseRequest(request);
        if (!auth?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const existingUser = await prisma.client.user.findUnique({
            where: { username },
            select: { id: true }
        });

        // If user exists and it's NOT the current user (case insensitive check usually handled by DB collation, but assuming unique constraint)
        // Actually we just check if it exists. The frontend should handle "if it's my own username".
        // But helpful to know:

        return NextResponse.json({ available: !existingUser || existingUser.id === auth.user.id });

    } catch (error) {
        console.error('Username check error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
