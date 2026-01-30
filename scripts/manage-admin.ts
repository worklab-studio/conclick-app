
import prisma from '../src/lib/prisma';

async function main() {
    // Access the PrismaClient instance via the wrapper's .client property
    const users = await prisma.client.user.findMany({
        orderBy: { createdAt: 'desc' },
    });

    console.log('--- USERS ---');
    users.forEach(u => console.log(`${u.username} (${u.id}) - Role: ${u.role}`));
    console.log('-------------');

    const user = users[0];
    if (!user) {
        console.log('No users found.');
        return;
    }

    if (user.role !== 'admin') {
        console.log(`Promoting ${user.username} (ID: ${user.id}) to ADMIN...`);
        await prisma.client.user.update({
            where: { id: user.id },
            data: { role: 'admin' },
        });
        console.log('Success.');
    } else {
        console.log(`User ${user.username} is already admin.`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
