import { NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import { getNotifications, markAllAsRead, markAsRead } from '@/lib/notifications';

export async function GET(req: Request) {
    const auth = await checkAuth(req);
    if (!auth) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const notifications = await getNotifications(auth.user.id);
    return NextResponse.json(notifications);
}

export async function POST(req: Request) {
    const auth = await checkAuth(req);
    if (!auth) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id, type } = await req.json();

    if (type === 'markAll') {
        await markAllAsRead(auth.user.id);
    } else if (id) {
        await markAsRead(id);
    }

    return NextResponse.json({ success: true });
}
