/* eslint-disable no-console */
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { v4 as uuidv4 } from 'uuid';
import { subDays, addHours, startOfDay } from 'date-fns';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(process.cwd(), '.env') });

console.log('Database URL loaded:', process.env.DATABASE_URL ? 'Yes' : 'No');

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const REFERRERS = [
  'https://google.com',
  'https://twitter.com',
  'https://linkedin.com',
  'https://facebook.com',
  'https://github.com',
  'https://indiehackers.com',
  'https://news.ycombinator.com',
  null, // Direct
];

const BROWSERS = ['Chrome', 'Firefox', 'Safari', 'Edge', 'Opera'];
const OS = ['macOS', 'Windows', 'iOS', 'Android', 'Linux'];
const DEVICES = ['desktop', 'mobile', 'tablet', 'laptop'];
const COUNTRIES = ['US', 'IN', 'GB', 'DE', 'FR', 'CA', 'AU', 'JP', 'BR'];

const getRandom = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];

async function main() {
  console.log('Starting Conclick traffic seeding (90 days)...');

  // 1. Find User 'conclick'
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ username: 'conclick' }, { email: 'conclick' }],
    },
  });

  if (!user) {
    console.error('User "conclick" not found! Please create the user first.');
    return;
  }

  console.log(`Found user: ${user.username} (${user.id})`);

  // 2. Find Websites
  let websites = await prisma.website.findMany({
    where: { userId: user.id },
  });

  if (websites.length === 0) {
    console.log('No websites found for user. Creating "Conclick Demo"...');
    const website = await prisma.website.create({
      data: {
        id: uuidv4(),
        name: 'Conclick Demo',
        domain: 'demo.conclick.com',
        userId: user.id,
      },
    });
    websites = [website];
  }

  // 3. Seed Traffic
  for (const website of websites) {
    console.log(`Seeding traffic for ${website.name} (${website.domain})...`);
    await seedTraffic(website.id);
  }

  console.log('Seeding complete!');
}

async function seedTraffic(websiteId: string) {
  const today = new Date();
  const sessions = [];
  const events = [];

  // Generate data for past 90 days
  for (let i = 0; i < 90; i++) {
    const date = subDays(today, i);

    // Traffic trend: Random but slightly more on weekdays or recent days?
    // Let's just do random 20-100 visitors per day
    const dailyVisitors = Math.floor(Math.random() * 80) + 20;

    for (let j = 0; j < dailyVisitors; j++) {
      const sessionId = uuidv4();
      const visitId = uuidv4();
      const browser = getRandom(BROWSERS);
      const country = getRandom(COUNTRIES);
      const device = getRandom(DEVICES);

      // Random time during the day (skewed towards day time?)
      const hour = Math.floor(Math.random() * 24);
      const visitTime = addHours(startOfDay(date), hour);

      // Create Session
      sessions.push({
        id: sessionId,
        websiteId,
        browser,
        os: getRandom(OS),
        device,
        screen: '1920x1080',
        language: 'en-US',
        country,
        createdAt: visitTime,
      });

      // Create Pageview Event (Home)
      events.push({
        id: uuidv4(),
        websiteId,
        sessionId,
        visitId,
        urlPath: '/',
        referrerDomain: getRandom(REFERRERS),
        pageTitle: 'Home | Conclick',
        eventType: 1, // field 1 is pageview
        createdAt: visitTime,
      });

      // 40% chance of visiting pricing
      if (Math.random() > 0.6) {
        events.push({
          id: uuidv4(),
          websiteId,
          sessionId,
          visitId,
          urlPath: '/pricing',
          referrerDomain: null,
          pageTitle: 'Pricing',
          eventType: 1,
          createdAt: addHours(visitTime, 0.05),
        });
      }

      // 20% chance of visiting features
      if (Math.random() > 0.8) {
        events.push({
          id: uuidv4(),
          websiteId,
          sessionId,
          visitId,
          urlPath: '/features',
          referrerDomain: null,
          pageTitle: 'Features',
          eventType: 1,
          createdAt: addHours(visitTime, 0.1),
        });
      }
    }
  }

  // Chunk inserts to avoid memory issues if massive
  const CHUNK_SIZE = 1000;
  for (let i = 0; i < sessions.length; i += CHUNK_SIZE) {
    await prisma.session.createMany({ data: sessions.slice(i, i + CHUNK_SIZE) });
  }
  for (let i = 0; i < events.length; i += CHUNK_SIZE) {
    await prisma.websiteEvent.createMany({ data: events.slice(i, i + CHUNK_SIZE) });
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
