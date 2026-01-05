import { NextRequest, NextResponse } from 'next/server';
import client from '@/lib/prisma';
import { getStripeClient } from '@/lib/stripe';
import { parseRequest } from '@/lib/request';
import { canViewWebsite } from '@/permissions';
import { unauthorized, serverError, badRequest } from '@/lib/response';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ websiteId: string }> },
) {
    const { auth, error } = await parseRequest(request);

    if (error) {
        return error();
    }

    const { websiteId } = await params;

    if (!(await canViewWebsite(auth, websiteId))) {
        return unauthorized();
    }

    try {
        console.log('[Revenue API] Fetching website:', websiteId);
        const website = await client.client.website.findUnique({
            where: { id: websiteId },
            include: { user: true },
        });

        console.log('[Revenue API] Found website:', website?.id, 'User:', website?.user?.username);

        if (website && website?.user?.username === 'conclick') {
            console.log('[Revenue API] Generating mock data for conclick');
            const mockData = generateMockRevenue();
            console.log('[Revenue API] Mock data total:', mockData.total);
            return NextResponse.json({
                chart: mockData.chart,
                total: mockData.total
            });
        }

        const stripe = await getStripeClient(websiteId);

        if (!stripe) {
            return badRequest({ message: 'Stripe not configured for this website.' });
        }

        // Fetch Balance Transactions (simulating a "Revenue" feed)
        // In a real app, you might aggregate this or use Stripe Reporting API
        // For now, we listed the latest charges to calculate a simple total or list
        const transactions = await stripe.balanceTransactions.list({
            limit: 100, // Fetch last 100 transactions
        });

        // Simple aggregation for demonstration
        // Group by day for the chart
        const dailyRevenue: Record<string, number> = {};

        transactions.data.forEach((txn) => {
            // created is in seconds
            const date = new Date(txn.created * 1000).toISOString().split('T')[0];

            // Amount is in cents, convert to main currency unit (e.g., dollars)
            // Note: This assumes all transactions are same currency or doesn't handle conversion
            // For a robust implementation, you'd filter by currency or convert
            if (txn.type === 'charge' || txn.type === 'payment') {
                // txn.amount is net effect on balance. For revenue, we might want 'charge' amount.
                // Let's use net amount for now (profit) or just raw amount.
                const amount = txn.amount / 100;
                dailyRevenue[date] = (dailyRevenue[date] || 0) + amount;
            }
        });

        const chartData = Object.keys(dailyRevenue).map(date => ({
            x: date,
            y: dailyRevenue[date]
        })).sort((a, b) => a.x.localeCompare(b.x));

        return NextResponse.json({
            chart: chartData,
            total: transactions.data.reduce((acc, txn) => acc + (txn.amount / 100), 0)
        });

    } catch (e: any) {
        console.error('Stripe API Error:', e);
        return serverError(e);
    }
}

function generateMockRevenue() {
    const data = [];
    let total = 0;
    const days = 90;
    const end = new Date();

    for (let i = days; i >= 0; i--) {
        const d = new Date(end);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];

        // Random amount between 100 and 1000
        const amount = Math.floor(Math.random() * 900) + 100;
        total += amount;

        data.push({ x: dateStr, y: amount });
    }

    return { chart: data, total };
}
