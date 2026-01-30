import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

// POST /api/admin/notifications
export async function POST(req: Request) {
    // Check for hardcoded admin session
    const adminSession = (await cookies()).get('conclick_admin_session');

    if (!adminSession || adminSession.value !== 'authenticated') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const { title, message, type } = await req.json();

    if (!title || !message) {
        return new NextResponse('Missing title or message', { status: 400 });
    }

    try {
        // Fetch all users (Optimization: In a real app, use a queue or background job)
        const users = await prisma.client.user.findMany({
            where: { deletedAt: null },
            select: { id: true }
        });

        // Bulk Create Notifications
        if (users.length > 0) {
            await prisma.client.notification.createMany({
                data: users.map(user => ({
                    userId: user.id,
                    title,
                    message,
                    type: type || 'info',
                    read: false,
                }))
            });
        }

        return NextResponse.json({ success: true, count: users.length });
    } catch (error) {
        console.error('Error broadcasting notifications:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
