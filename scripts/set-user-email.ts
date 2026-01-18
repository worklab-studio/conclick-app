/* eslint-disable no-console */
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL not found');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const username = process.argv[2];
  const email = process.argv[3];

  if (!username || !email) {
    console.error('Usage: npx tsx scripts/set-user-email.ts <username> <email>');
    process.exit(1);
  }

  const user = await prisma.user.findFirst({ where: { username } });

  if (!user) {
    console.error(`User "${username}" not found`);
    process.exit(1);
  }

  console.log(`Current email for "${username}":`, user.email || '(not set)');

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { email },
  });

  console.log(`Updated email to: ${updated.email}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
