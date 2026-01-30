import prisma from '@/lib/prisma';
import { v4 as uuid } from 'uuid';

export async function createNotification(
    userId: string,
    type: 'alert' | 'info' | 'success' | 'warning',
    title: string,
    message: string
) {
    return prisma.client.notification.create({
        data: {
            userId,
            type,
            title,
            message,
        },
    });
}

export async function getNotifications(userId: string) {
    return prisma.client.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
    });
}

export async function getUnreadCount(userId: string) {
    return prisma.client.notification.count({
        where: {
            userId,
            read: false,
        },
    });
}

export async function markAsRead(notificationId: string) {
    return prisma.client.notification.update({
        where: { id: notificationId },
        data: { read: true },
    });
}

export async function markAllAsRead(userId: string) {
    return prisma.client.notification.updateMany({
        where: {
            userId,
            read: false,
        },
        data: { read: true },
    });
}
