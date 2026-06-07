'use client';

import { WebsiteControls } from '@/app/(main)/websites/[websiteId]/WebsiteControls';
import { SessionModal } from '@/app/(main)/websites/[websiteId]/sessions/SessionModal';
import { CustomersDataTable } from './CustomersDataTable';

export function PaymentJourneyPage({ websiteId }: { websiteId: string }) {
  return (
    <div className="mx-auto w-full space-y-4 px-3 py-6 md:px-6" style={{ maxWidth: '1320px' }}>
      <WebsiteControls websiteId={websiteId} />
      <div>
        <h2 className="text-lg font-semibold text-foreground">Journey for payment</h2>
        <p className="text-sm text-muted-foreground">
          Customers who completed a payment — what they spent and how long they took to convert.
          Based on attributed payments (visitors identified at checkout).
        </p>
      </div>
      <CustomersDataTable websiteId={websiteId} />
      <SessionModal websiteId={websiteId} />
    </div>
  );
}
