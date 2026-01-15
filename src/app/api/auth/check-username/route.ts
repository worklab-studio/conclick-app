import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';

const schema = z.object({
    username: z.string().min(1),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const result = schema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        const { username } = result.data;

        // Check if username exists
        const existingUser = await prisma.client.user.findFirst({
            where: { username, deletedAt: null },
        });

        return NextResponse.json({ available: !existingUser });
    } catch (error) {
        console.error('Check username error:', error);
        return NextResponse.json(
            { error: 'Failed to check username' },
            { status: 500 }
        );
    }
}
