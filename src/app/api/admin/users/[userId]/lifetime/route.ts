import { NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { ROLES } from '@/lib/constants';

// POST /api/admin/users/[userId]/lifetime
import { cookies } from 'next/headers';

// POST /api/admin/users/[userId]/lifetime
export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
    // Check for hardcoded admin session
    const adminSession = (await cookies()).get('conclick_admin_session');

    // Also allow standard admin auth
    const auth = await checkAuth(req);
    const isStandardAdmin = auth && auth.user.role === ROLES.admin;
    const isCookieAdmin = adminSession && adminSession.value === 'authenticated';

    if (!isStandardAdmin && !isCookieAdmin) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const { userId } = await params;

    try {
        const updatedUser = await prisma.client.user.update({
            where: { id: userId },
            data: {
                subscriptionStatus: 'active',
                subscriptionPlan: 'lifetime',
                trialEndsAt: null, // Remove trial
                endsAt: null, // No expiration for lifetime
            },
        });

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error('Error granting lifetime access:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
