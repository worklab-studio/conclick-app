
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
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
    const username = 'conclick';
    const password = 'conclick';
    const websiteName = 'Conclick Demo';
    const websiteDomain = 'demo.conclick.com';
    const DEMO_ID = '1be0acac-4fc3-4dc1-a4d2-02e6a2aae843';

    console.log(`Starting demo setup for user: ${username}`);

    // 1. Create User
    let user = await prisma.user.findUnique({
        where: { username },
    });

    if (!user) {
        const hashedPassword = await bcrypt.hash(password, 10);
        user = await prisma.user.create({
            data: {
                id: uuidv4(),
                username,
                password: hashedPassword,
                role: 'user',
            },
        });
        console.log('Created user:', user.id);
    } else {
        console.log('User already exists:', user.id);
    }

    // 2. Create/Get Website - Handle ID conflicts
    let website = await prisma.website.findUnique({
        where: { id: DEMO_ID },
    });

    if (website) {
        console.log('Website found by ID:', website.id);
        // Ensure it belongs to the correct user
        if (website.userId !== user.id) {
            console.log('Website belongs to different user. Reassigning...');
            website = await prisma.website.update({
                where: { id: DEMO_ID },
                data: { userId: user.id },
            });
        }
        // Ensure name and domain match
        await prisma.website.update({
            where: { id: DEMO_ID },
            data: { name: websiteName, domain: websiteDomain },
        });
    } else {
        console.log('Website not found by ID. Creating...');
        website = await prisma.website.create({
            data: {
                id: DEMO_ID,
                name: websiteName,
                domain: websiteDomain,
                userId: user.id,
            },
        });
    }

    console.log('Website verified:', website.id);

    // 3. Generate Traffic Data
    console.log('Generating traffic data...');

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);

    const sessions = [];
    const websiteEvents = [];

    const random = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
    const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

    const browsers = ['Chrome', 'Safari', 'Firefox', 'Edge'];
    const osList = ['iOS', 'Mac OS', 'Android', 'Windows'];
    const devices = ['mobile', 'desktop', 'tablet'];
    const countries = ['US', 'GB', 'DE', 'FR', 'IN', 'CA', 'AU'];
    const referrers = ['google.com', 'twitter.com', 'linkedin.com', 'direct'];
    const paths = ['/', '/pricing', '/features', '/about', '/blog', '/contact'];

    let totalViews = 0;

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        const dailyVisitors = isWeekend ? randomInt(50, 200) : randomInt(200, 600);

        // Add extra "live" visitors for today (last hour)
        const isToday = d.toDateString() === new Date().toDateString();
        if (isToday) {
            // Add some recent visitors (last 30 mins)
            const liveVisitors = randomInt(20, 60);
            for (let k = 0; k < liveVisitors; k++) {
                const sessionId = uuidv4();
                const now = new Date();
                // Random time in last 30 mins
                const eventTime = new Date(now.getTime() - randomInt(0, 30 * 60 * 1000));

                sessions.push({
                    id: sessionId,
                    websiteId: website.id,
                    browser: random(browsers),
                    os: random(osList),
                    device: random(devices),
                    screen: '1920x1080',
                    language: 'en-US',
                    country: random(countries),
                    createdAt: eventTime,
                });

                const views = randomInt(1, 3);
                let time = new Date(eventTime);
                for (let j = 0; j < views; j++) {
                    websiteEvents.push({
                        id: uuidv4(),
                        websiteId: website.id,
                        sessionId,
                        visitId: uuidv4(),
                        urlPath: random(paths),
                        referrerDomain: random(referrers) === 'direct' ? null : random(referrers),
                        pageTitle: 'Demo Page',
                        eventType: 1,
                        createdAt: time,
                        hostname: websiteDomain,
                    });
                    time.setSeconds(time.getSeconds() + randomInt(10, 60));
                }
            }

            // Add VERY RECENT visitors (last 5 mins) for Globe visibility
            const veryRecent = randomInt(80, 150);
            for (let k = 0; k < veryRecent; k++) {
                const sessionId = uuidv4();
                const now = new Date();
                // Random time in last 5 mins
                const eventTime = new Date(now.getTime() - randomInt(0, 5 * 60 * 1000));

                sessions.push({
                    id: sessionId,
                    websiteId: website.id,
                    browser: random(browsers),
                    os: random(osList),
                    device: random(devices),
                    screen: '1920x1080',
                    language: 'en-US',
                    country: random(countries),
                    createdAt: eventTime,
                });

                const views = randomInt(1, 3);
                let time = new Date(eventTime);
                for (let j = 0; j < views; j++) {
                    websiteEvents.push({
                        id: uuidv4(),
                        websiteId: website.id,
                        sessionId,
                        visitId: uuidv4(),
                        urlPath: random(paths),
                        referrerDomain: random(referrers) === 'direct' ? null : random(referrers),
                        pageTitle: 'Demo Page',
                        eventType: 1,
                        createdAt: time,
                        hostname: websiteDomain,
                    });
                    time.setSeconds(time.getSeconds() + randomInt(10, 60));
                }
            }
        }

        // Normal padding for history
        for (let i = 0; i < dailyVisitors; i++) {
            const sessionId = uuidv4();
            const visitId = uuidv4();

            const hour = randomInt(0, 23);
            const minute = randomInt(0, 59);
            const createdAt = new Date(d);
            createdAt.setHours(hour, minute, 0, 0);

            if (createdAt > new Date()) continue;

            const browser = random(browsers);
            const os = random(osList);
            const device = random(devices);
            const country = random(countries);

            const session = {
                id: sessionId,
                websiteId: website.id,
                browser,
                os,
                device,
                screen: '1920x1080',
                language: 'en-US',
                country,
                createdAt,
            };
            sessions.push(session);

            const views = randomInt(1, 5);
            let eventTime = new Date(createdAt);

            for (let j = 0; j < views; j++) {
                const urlPath = random(paths);
                const referrer = random(referrers);

                websiteEvents.push({
                    id: uuidv4(),
                    websiteId: website.id,
                    sessionId,
                    visitId,
                    urlPath,
                    referrerDomain: referrer === 'direct' ? null : referrer,
                    pageTitle: 'Demo Page',
                    eventType: 1,
                    createdAt: new Date(eventTime),
                    hostname: websiteDomain,
                });

                eventTime.setSeconds(eventTime.getSeconds() + randomInt(10, 120));
                totalViews++;
            }
        }
    }

    // Insert in batches
    const batchSize = 1000;

    console.log(`Inserting ${sessions.length} sessions...`);
    for (let i = 0; i < sessions.length; i += batchSize) {
        await prisma.session.createMany({
            data: sessions.slice(i, i + batchSize) as any,
            skipDuplicates: true,
        });
    }

    console.log(`Inserting ${websiteEvents.length} pageviews...`);
    for (let i = 0; i < websiteEvents.length; i += batchSize) {
        await prisma.websiteEvent.createMany({
            data: websiteEvents.slice(i, i + batchSize) as any,
            skipDuplicates: true,
        });
    }

    console.log('Data generation complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
