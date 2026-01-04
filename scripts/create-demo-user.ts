import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { subDays, addHours, startOfDay } from 'date-fns';

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const WEBSITES = [
    { name: 'Parallel Connect', domain: 'parallelconnect.com' },
    { name: 'Conclick', domain: 'conclick.com' },
    { name: 'Alka', domain: 'alka.in' },
    { name: 'Iconstack', domain: 'iconstack.io' },
];

const REFERRERS = [
    'https://google.com',
    'https://twitter.com',
    'https://linkedin.com',
    'https://facebook.com',
    'https://github.com',
    null // Direct
];

const BROWSERS = ['Chrome', 'Firefox', 'Safari', 'Edge'];
const OS = ['macOS', 'Windows', 'iOS', 'Android'];
const DEVICES = ['desktop', 'mobile', 'tablet'];
const COUNTRIES = ['US', 'IN', 'GB', 'DE', 'FR', 'CA'];

const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function main() {
    console.log('Starting demo data seeding...');

    // 1. Create User
    const username = 'demo';
    const password = 'demo';
    const hashedPassword = await bcrypt.hash(password, 10);

    let user = await prisma.user.findUnique({
        where: { username },
    });

    if (!user) {
        user = await prisma.user.create({
            data: {
                id: uuidv4(),
                username,
                password: hashedPassword,
                role: 'user',
                displayName: 'Demo User',
            },
        });
        console.log('Created user: demo');
    } else {
        console.log('User demo already exists');
    }

    // 2. Create Websites & Traffic
    for (const site of WEBSITES) {
        let website = await prisma.website.findFirst({
            where: {
                userId: user.id,
                domain: site.domain
            }
        });

        if (!website) {
            website = await prisma.website.create({
                data: {
                    id: uuidv4(),
                    name: site.name,
                    domain: site.domain,
                    userId: user.id,
                },
            });
            console.log(`Created website: ${site.name}`);
        } else {
            console.log(`Website ${site.name} already exists`);
        }

        // 3. Generate Traffic (if emptyish)
        const eventCount = await prisma.websiteEvent.count({
            where: { websiteId: website.id }
        });

        if (eventCount < 50) {
            console.log(`Seeding traffic for ${site.name}...`);
            await seedTraffic(website.id);
        }
    }

    console.log('Done!');
}

async function seedTraffic(websiteId) {
    const today = new Date();
    const sessions = [];
    const events = [];

    // Generate data for past 30 days
    for (let i = 0; i < 30; i++) {
        const date = subDays(today, i);
        // Random visitors per day (10 to 50)
        const dailyVisitors = Math.floor(Math.random() * 40) + 10;

        for (let j = 0; j < dailyVisitors; j++) {
            const sessionId = uuidv4();
            const visitId = uuidv4();
            const browser = getRandom(BROWSERS);
            const country = getRandom(COUNTRIES);
            const device = getRandom(DEVICES);

            // Random time during the day
            const visitTime = addHours(startOfDay(date), Math.floor(Math.random() * 24));

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

            // Create Pageview Event
            events.push({
                id: uuidv4(),
                websiteId,
                sessionId,
                visitId,
                urlPath: '/',
                referrerDomain: getRandom(REFERRERS),
                pageTitle: 'Home',
                eventType: 1, // field 1 is pageview
                createdAt: visitTime,
            });

            // Maybe a second pageview
            if (Math.random() > 0.5) {
                events.push({
                    id: uuidv4(),
                    websiteId,
                    sessionId,
                    visitId,
                    urlPath: '/about',
                    referrerDomain: null, // internal nav
                    pageTitle: 'About',
                    eventType: 1,
                    createdAt: addHours(visitTime, 0.1),
                });
            }
        }
    }

    // Bulk insert (using transaction or loop if sqlite, but here postgres)
    // Prisma createMany is efficient
    await prisma.session.createMany({ data: sessions });
    await prisma.websiteEvent.createMany({ data: events });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
