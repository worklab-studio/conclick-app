import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(req: Request) {
    try {
        const { url, websiteId } = await req.json();

        if (!url || !websiteId) {
            return NextResponse.json({ success: false, message: 'Missing parameters' }, { status: 400 });
        }

        // Ensure URL has protocol
        const targetUrl = url.startsWith('http') ? url : `https://${url}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(targetUrl, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Conclick-Verifier/1.0',
            },
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            return NextResponse.json({ success: false, message: 'Failed to fetch website' });
        }

        const html = await response.text();

        // Simple string check for the website ID in the HTML
        // The script tag usually looks like: data-website-id="UUID"
        const hasId = html.includes(websiteId);

        return NextResponse.json({ success: hasId });

    } catch (error: any) {
        console.error('Verification error:', error);
        return NextResponse.json({ success: false, message: error.message || 'Verification failed' });
    }
}
