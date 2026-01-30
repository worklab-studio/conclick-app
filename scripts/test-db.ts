
import prisma from '../src/lib/prisma';

async function main() {
    console.log('Testing DB connection via src/lib/prisma...');
    try {
        // Access the client property of the default export
        const userCount = await prisma.client.user.count();
        console.log(`Connection successful. User count: ${userCount}`);
    } catch (e) {
        console.error('Connection failed:', e);
    } finally {
        // Cannot easily disconnect the shared client, but process exit will handle it
        console.log('Done.');
    }
}

main();
