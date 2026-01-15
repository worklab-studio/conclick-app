import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { ROLES } from '@/lib/constants';
import { sendWelcomeEmail } from '@/lib/email';

export async function POST(req: Request) {
    try {
        const { username, email, password, displayName } = await req.json();

        if (!username || !password || !email) {
            return NextResponse.json(
                { message: 'Username, email, and password are required' },
                { status: 400 }
            );
        }

        // Check if username exists
        const existingUsername = await prisma.client.user.findUnique({
            where: { username },
        });

        if (existingUsername) {
            return NextResponse.json(
                { message: 'Username already exists' },
                { status: 400 }
            );
        }

        // Check if email exists
        const existingEmail = await prisma.client.user.findFirst({
            where: { email, deletedAt: null },
        });

        if (existingEmail) {
            return NextResponse.json(
                { message: 'Email already in use' },
                { status: 400 }
            );
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Calculate trial dates (30 days)
        const now = new Date();
        const trialEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const user = await prisma.client.user.create({
            data: {
                id: crypto.randomUUID(),
                username,
                email,
                password: hashedPassword,
                role: ROLES.user,
                displayName: displayName || username,
                subscriptionStatus: 'trial',
                trialStartedAt: now,
                trialEndsAt: trialEndsAt,
            },
        });

        // Send welcome email (non-blocking)
        sendWelcomeEmail(email, username).catch((err) => {
            console.error('Failed to send welcome email:', err);
        });

        return NextResponse.json(
            {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                },
            },
            { status: 201 }
        );
    } catch (error: unknown) {
        console.error('Registration error:', error);
        return NextResponse.json(
            { message: 'Something went wrong.' },
            { status: 500 }
        );
    }
}
