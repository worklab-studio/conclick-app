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
    } else if (id && typeof id === 'string') {
        // Pass the caller's userId so markAsRead can scope the update — otherwise
        // any authenticated user could mark every other user's notifications read
        // by enumerating ids.
        await markAsRead(id, auth.user.id);
    }

    return NextResponse.json({ success: true });
}
