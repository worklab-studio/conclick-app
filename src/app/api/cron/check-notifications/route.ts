import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';

export async function GET(req: Request) {
    // 1. Security Check (Optional but recommended for Cron)
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');
    if (key !== process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
        // In dev we might skip this or use a dev key
        // return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        // 2. Fetch Users Active in the last 30 days (Optimization)
        // For MVP, we'll iterate all users with active trials or websites
        const users = await prisma.client.user.findMany({
            where: { deletedAt: null },
            include: { websites: true }
        });

        const notificationsSent = [];
        const now = new Date();

        for (const user of users) {
            // --- Rule 11: Trial Expiry ---
            if (user.subscriptionStatus === 'trial' && user.trialEndsAt) {
                const daysLeft = Math.ceil((user.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                if (daysLeft === 3) {
                    // Check if we already sent this? (Ideally we need a "NotificationHistory" or check recent notifications)
                    // For MVP, we check if a notification of this type exists in last 24h
                    const exists = await prisma.client.notification.findFirst({
                        where: {
                            userId: user.id,
                            type: 'warning',
                            title: 'Trial Ending Soon',
                            createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
                        }
                    });

                    if (!exists) {
                        await createNotification(
                            user.id,
                            'warning',
                            'Trial Ending Soon',
                            'Your free trial ends in 3 days. Upgrade now to keep premium features.'
                        );
                        notificationsSent.push(`User ${user.username}: Trial Warning`);
                    }
                }
            }

            // --- Rules per Website ---
            for (const website of user.websites) {
                // --- Rule 1: Viral Spike (> 100 views in last hour) ---
                const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
                const activeViews = await prisma.client.websiteEvent.count({
                    where: {
                        websiteId: website.id,
                        createdAt: { gte: oneHourAgo }
                    }
                });

                if (activeViews > 100) {
                    // Check duplication
                    const exists = await prisma.client.notification.findFirst({
                        where: {
                            userId: user.id,
                            type: 'alert',
                            message: { contains: website.name },
                            createdAt: { gte: oneHourAgo } // Don't spam every run
                        }
                    });

                    if (!exists) {
                        await createNotification(
                            user.id,
                            'alert',
                            'Viral Alert 🚀',
                            `Your website ${website.name} is seeing high traffic! ${activeViews} views in the last hour.`
                        );
                        notificationsSent.push(`User ${user.username}: Viral Alert (${website.name})`);
                    }
                }

                // --- Rule 4: Milestones (Total Views) ---
                // Only run this sparingly (maybe check total count)
                // Optimization: We could store "lastMilestone" in DB, but for now lets check total
                const totalViews = await prisma.client.websiteEvent.count({
                    where: { websiteId: website.id }
                });

                const milestones = [100, 1000, 10000, 100000];
                for (const milestone of milestones) {
                    // If we recently crossed it (e.g. in the last hour window roughly, or strictly)
                    // To avoid duplicates without extra state, we check if notification exists for this SPECIFIC milestone
                    // Use a unique string in title/message
                    if (totalViews >= milestone && totalViews < milestone * 1.1) { // 10% buffer to stop checking old milestones
                        const title = `Milestone Reached: ${milestone} Views! 🏆`;
                        const exists = await prisma.client.notification.findFirst({
                            where: {
                                userId: user.id,
                                title: title,
                                message: { contains: website.name }
                            }
                        });

                        if (!exists) {
                            await createNotification(
                                user.id,
                                'success',
                                title,
                                `Congratulations! ${website.name} has hit ${milestone} total views.`
                            );
                            notificationsSent.push(`User ${user.username}: Milestone ${milestone}`);
                        }
                    }
                }
            }
        }

        return NextResponse.json({ success: true, sent: notificationsSent });
    } catch (error) {
        console.error('Cron Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
