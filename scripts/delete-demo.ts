
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const user = await prisma.user.findUnique({
        where: { username: 'conclick' },
    });
    if (user) {
        await prisma.user.delete({ where: { id: user.id } });
        console.log('Deleted user conclick');
    } else {
        console.log('User conclick not found');
    }
}

main().finally(() => { pool.end(); });
