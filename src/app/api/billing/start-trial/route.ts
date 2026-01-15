import { NextRequest, NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import { startTrial } from '@/lib/billing';

export async function POST(request: NextRequest) {
    try {
        const auth = await checkAuth(request);

        if (!auth?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const result = await startTrial(auth.user.id);

        if (!result.success) {
            return NextResponse.json({ error: result.message }, { status: 400 });
        }

        return NextResponse.json({ success: true, trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) });

    } catch (error) {
        console.error('Start Trial Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
