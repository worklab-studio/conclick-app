/* eslint-disable no-console */
import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const username = 'conclick';

  console.log(`Searching for user: ${username}...`);
  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user) {
    console.log(`❌ User '${username}' not found. Please create the user first.`);
    return;
  }

  console.log(`Found user: ${user.username} (${user.id})`);
  console.log('Updating to Lifetime plan...');

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionStatus: 'active',
      subscriptionPlan: 'lifetime',
      subscriptionEndsAt: null,
      customerId: 'manual_admin_update',
    },
  });

  console.log(`✅ User '${username}' successfully updated to Lifetime plan!`);
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
