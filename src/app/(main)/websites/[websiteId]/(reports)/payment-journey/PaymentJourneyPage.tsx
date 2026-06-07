'use client';

import { useWebsitePaymentCustomersQuery } from '@/components/hooks';
import { DataGrid } from '@/components/common/DataGrid';
import { WebsiteControls } from '@/app/(main)/websites/[websiteId]/WebsiteControls';
import { SessionModal } from '@/app/(main)/websites/[websiteId]/sessions/SessionModal';
import { PaymentCustomersTable } from './PaymentCustomersTable';

export function PaymentJourneyPage({ websiteId }: { websiteId: string }) {
  const queryResult = useWebsitePaymentCustomersQuery(websiteId);

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
      <DataGrid query={queryResult} allowPaging allowSearch={false}>
        {({ data }) => <PaymentCustomersTable data={data} />}
      </DataGrid>
      <SessionModal websiteId={websiteId} />
    </div>
  );
}
