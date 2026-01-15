
import { PrismaClient } from './src/generated/prisma';
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findFirst();
    console.log('User:', JSON.stringify(user, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
