
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { ROLES } from '@/lib/constants';

export async function POST(req: Request) {
    try {
        const { username, password, displayName } = await req.json();

        if (!username || !password) {
            return NextResponse.json(
                { message: 'Username and password are required' },
                { status: 400 }
            );
        }

        const existingUser = await prisma.client.user.findUnique({
            where: {
                username,
            },
        });

        if (existingUser) {
            return NextResponse.json(
                { message: 'User already exists' },
                { status: 400 }
            );
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.client.user.create({
            data: {
                id: crypto.randomUUID(),
                username,
                password: hashedPassword,
                role: ROLES.user,
                displayName: displayName || '',
            },
        });

        return NextResponse.json(
            {
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                },
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Registration error:', error);
        return NextResponse.json(
            { message: 'Something went wrong.' },
            { status: 500 }
        );
    }
}
