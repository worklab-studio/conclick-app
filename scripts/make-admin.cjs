
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const user = await prisma.user.findFirst({
            orderBy: { createdAt: 'desc' },
        });

        if (!user) {
            console.log('No users found.');
            return;
        }

        console.log(`Found user: ${user.username} (${user.id})`);

        const updated = await prisma.user.update({
            where: { id: user.id },
            data: { role: 'admin' },
        });

        console.log(`User ${updated.username} promoted to ADMIN.`);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
