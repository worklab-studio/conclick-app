import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';
import { ROLES } from '@/lib/constants';
import bcrypt from 'bcryptjs';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/websites';

    if (code) {
        const supabase = await createClient();
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
            // No console.error here, as per the instruction to remove debug logs.
        }

        if (!error && data?.user) {
            const { user } = data;

            // Check if user exists in our database
            try {
                // 1. Check ID Match
                const existingUser = await prisma.client.user.findUnique({
                    where: { id: user.id },
                });

                if (existingUser) {
                    // Already linked, do nothing.
                } else {
                    // 2. Check Email Match (Legacy User)
                    const email = user.email!;
                    const existingEmailUser = await prisma.client.user.findFirst({
                        where: {
                            email: email,
                            deletedAt: null // Only active users
                        },
                    });

                    if (existingEmailUser) {
                        // Update the Legacy User's ID to matching Supabase ID
                        await prisma.client.user.update({
                            where: { id: existingEmailUser.id },
                            data: {
                                id: user.id,
                                updatedAt: new Date(),
                            }
                        });
                    } else {
                        // 3. Create New User
                        const username = user.user_metadata?.full_name || email.split('@')[0];
                        const displayName = user.user_metadata?.full_name || username;

                        // Generate a random password hash for OAuth users
                        const randomPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);
                        const hashedPassword = await bcrypt.hash(randomPassword, 10);

                        const now = new Date();
                        const trialEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

                        try {
                            await prisma.client.user.create({
                                data: {
                                    id: user.id, // SAME UUID as Supabase
                                    username: email, // Use email as unique username fallback
                                    email: email,
                                    password: hashedPassword,
                                    role: ROLES.user,
                                    displayName: displayName,
                                    subscriptionStatus: 'trial', // Default to trial
                                    trialStartedAt: now,
                                    trialEndsAt: trialEndsAt,
                                },
                            });
                        } catch (createError: any) {
                            if (createError.code === 'P2002') {
                                const suffix = Math.floor(Math.random() * 10000);
                                const uniqueUsername = `${email.split('@')[0]}-${suffix}`;

                                await prisma.client.user.create({
                                    data: {
                                        id: user.id,
                                        username: uniqueUsername,
                                        email: email,
                                        password: hashedPassword,
                                        role: ROLES.user,
                                        displayName: displayName,
                                        subscriptionStatus: 'trial',
                                        trialStartedAt: now,
                                        trialEndsAt: trialEndsAt,
                                    },
                                });
                            } else {
                                throw createError;
                            }
                        }
                    }
                }
            } catch (dbError) {
                console.error('[Auth Callback] DB Error:', dbError);
            }

            return NextResponse.redirect(`${origin}${next}`);
        }
    }

    // Return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
