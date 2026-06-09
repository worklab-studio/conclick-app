'use client';

import { CreditCard } from 'lucide-react';
import { useWebsitePaymentCustomersQuery } from '@/components/hooks';
import { DataGrid } from '@/components/common/DataGrid';
import { TabEmptyState } from '@/components/common/TabEmptyState';
import { PaymentCustomersTable } from './PaymentCustomersTable';

// Lean paying-customers list (no controls/header) — used both on the standalone
// page and inline in the dashboard "Customers" panel tab.
export function CustomersDataTable({ websiteId }: { websiteId: string }) {
  const queryResult = useWebsitePaymentCustomersQuery(websiteId);

  return (
    <DataGrid
      query={queryResult}
      allowPaging
      allowSearch={false}
      renderEmpty={() => (
        <TabEmptyState
          icon={CreditCard}
          title="No customers yet"
          description="Customers show up here once you connect a payment provider (Stripe or Dodo) and a payment is attributed to a visitor."
        />
      )}
    >
      {({ data }) => <PaymentCustomersTable data={data} />}
    </DataGrid>
  );
}
