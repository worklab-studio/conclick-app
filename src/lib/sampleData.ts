import { subDays, subHours, startOfToday, endOfToday, eachDayOfInterval, eachHourOfInterval, formatISO } from 'date-fns';

export const getSampleData = (range: string = '30d', unitParam?: string) => {
    const now = new Date();
    let points: Date[] = [];
    let unit = unitParam || 'day';

    if (unit === 'hour') {
        points = eachHourOfInterval({
            start: subHours(now, 24),
            end: now
        });
    } else {
        switch (range) {
            case 'today':
            case '24h':
                points = eachHourOfInterval({
                    start: subHours(now, 24),
                    end: now
                });
                break;
            case 'yesterday':
                points = eachHourOfInterval({
                    start: subDays(startOfToday(), 1),
                    end: subDays(endOfToday(), 1)
                });
                break;
            case '7d':
                points = eachDayOfInterval({
                    start: subDays(now, 7),
                    end: now
                });
                break;
            case '30d':
            default:
                points = eachDayOfInterval({
                    start: subDays(now, 30),
                    end: now
                });
                break;
            case '90d':
                points = eachDayOfInterval({
                    start: subDays(now, 90),
                    end: now
                });
                break;
        }
    }

    // Generate consistent Pageviews and Visitors
    const pageviewsData = points.map(date => {
        const visitors = Math.floor(Math.random() * 500) + 100;
        const pageviews = visitors + Math.floor(Math.random() * 500); // Ensure pageviews >= visitors
        return {
            x: formatISO(date),
            y: pageviews,
            visitors: visitors,
        };
    });

    const sessionsData = pageviewsData.map(item => ({
        x: item.x,
        y: item.visitors,
    }));

    const pageviewsChart = pageviewsData.map(item => ({
        x: item.x,
        y: item.y,
    }));

    // Calculate Totals
    const totalPageviews = pageviewsData.reduce((acc, curr) => acc + curr.y, 0);
    const totalVisitors = pageviewsData.reduce((acc, curr) => acc + curr.visitors, 0);
    const totalVisits = Math.floor(totalVisitors * 1.2); // Visits slightly higher than visitors
    const totalBounces = Math.floor(totalVisits * 0.4); // 40% bounce rate
    const totalTime = totalVisits * 120; // Avg 2 mins per visit

    // Revenue Data
    const revenueChart = points.map(date => ({
        t: formatISO(date),
        y: Math.floor(Math.random() * 200) + 50,
    }));
    const totalRevenue = revenueChart.reduce((acc, curr) => acc + curr.y, 0);

    return {
        pageviews: {
            pageviews: pageviewsChart,
            sessions: sessionsData,
        },
        revenue: {
            chart: revenueChart,
            total: {
                sum: totalRevenue,
                count: revenueChart.length,
                unique_count: revenueChart.length,
            },
        },
        stats: {
            pageviews: totalPageviews,
            visitors: totalVisitors,
            visits: totalVisits,
            bounces: totalBounces,
            totaltime: totalTime,
            comparison: {
                pageviews: Math.floor(totalPageviews * 0.8),
                visitors: Math.floor(totalVisitors * 0.8),
                visits: Math.floor(totalVisits * 0.8),
                bounces: Math.floor(totalBounces * 0.8),
                totaltime: Math.floor(totalTime * 0.8),
            },
        },
        active: Math.floor(Math.random() * 40) + 10, // Sample active users
        metrics: {
            country: Array.from({ length: 10 }, (_, i) => ({ x: ['US', 'GB', 'DE', 'FR', 'CA', 'IN', 'AU', 'BR', 'JP', 'KR'][i], y: Math.floor(Math.random() * 1000) + 100 })),
            region: Array.from({ length: 10 }, (_, i) => ({ x: ['California', 'New York', 'Texas', 'Florida', 'Washington', 'Ontario', 'London', 'Bavaria', 'Île-de-France', 'Maharashtra'][i], y: Math.floor(Math.random() * 500) + 50 })),
            city: Array.from({ length: 10 }, (_, i) => ({ x: ['San Francisco', 'New York', 'Austin', 'Miami', 'Seattle', 'Toronto', 'London', 'Munich', 'Paris', 'Mumbai'][i], y: Math.floor(Math.random() * 300) + 20 })),
            path: Array.from({ length: 10 }, (_, i) => ({ x: `/${['home', 'pricing', 'features', 'blog', 'contact', 'about', 'login', 'signup', 'docs', 'support'][i]}`, y: Math.floor(Math.random() * 500) + 50 })),
            entry: Array.from({ length: 10 }, (_, i) => ({ x: `/${['home', 'pricing', 'features', 'blog', 'contact'][i % 5]}`, y: Math.floor(Math.random() * 200) + 20 })),
            exit: Array.from({ length: 10 }, (_, i) => ({ x: `/${['home', 'pricing', 'features', 'blog', 'contact'][i % 5]}`, y: Math.floor(Math.random() * 200) + 20 })),
            referrer: Array.from({ length: 10 }, (_, i) => ({ x: ['google.com', 'twitter.com', 'facebook.com', 'linkedin.com', 'direct', 'bing.com', 'github.com', 'reddit.com', 't.co', 'ycombinator.com'][i], y: Math.floor(Math.random() * 500) + 50 })),
            channel: Array.from({ length: 5 }, (_, i) => ({ x: ['Organic Search', 'Social', 'Direct', 'Referral', 'Email'][i], y: Math.floor(Math.random() * 500) + 50 })),
            browser: Array.from({ length: 5 }, (_, i) => ({ x: ['Chrome', 'Safari', 'Firefox', 'Edge', 'Opera'][i], y: Math.floor(Math.random() * 1000) + 100 })),
            os: Array.from({ length: 5 }, (_, i) => ({ x: ['Windows', 'Mac OS', 'iOS', 'Android', 'Linux'][i], y: Math.floor(Math.random() * 1000) + 100 })),
            device: Array.from({ length: 3 }, (_, i) => ({ x: ['Desktop', 'Mobile', 'Tablet'][i], y: Math.floor(Math.random() * 1500) + 200 })),
        },
        weekly: Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => Math.floor(Math.random() * 50))),
    };
};

export const SAMPLE_DATA = getSampleData('30d'); // Default export for backward compatibility
