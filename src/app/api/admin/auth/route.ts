import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
    const { username, password } = await req.json();

    // Hardcoded check as requested by USER
    if (username === 'admin' && password === 'Conclick') {
        // Set a secure HTTP-only cookie
        (await cookies()).set('conclick_admin_session', 'authenticated', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: 60 * 60 * 24 // 1 day
        });

        return NextResponse.json({ success: true });
    }

    return new NextResponse('Unauthorized', { status: 401 });
}
