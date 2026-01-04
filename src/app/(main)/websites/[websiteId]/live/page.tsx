import { LiveVisitorsPage } from './LiveVisitorsPage';
import { Metadata } from 'next';

export default async function ({ params }: { params: Promise<{ websiteId: string }> }) {
    const { websiteId } = await params;

    return <LiveVisitorsPage websiteId={websiteId} />;
}

export const metadata: Metadata = {
    title: 'Live Visitors',
};
