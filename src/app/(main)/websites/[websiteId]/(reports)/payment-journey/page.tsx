import { Metadata } from 'next';
import { PaymentJourneyPage } from './PaymentJourneyPage';

export default async function ({ params }: { params: Promise<{ websiteId: string }> }) {
  const { websiteId } = await params;

  return <PaymentJourneyPage websiteId={websiteId} />;
}

export const metadata: Metadata = {
  title: 'Journey for payment',
};
