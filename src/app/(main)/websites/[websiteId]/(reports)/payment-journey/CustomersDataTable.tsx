'use client';

import { useWebsitePaymentCustomersQuery } from '@/components/hooks';
import { DataGrid } from '@/components/common/DataGrid';
import { PaymentCustomersTable } from './PaymentCustomersTable';

// Lean paying-customers list (no controls/header) — used both on the standalone
// page and inline in the dashboard "Customers" panel tab.
export function CustomersDataTable({ websiteId }: { websiteId: string }) {
  const queryResult = useWebsitePaymentCustomersQuery(websiteId);

  return (
    <DataGrid query={queryResult} allowPaging allowSearch={false}>
      {({ data }) => <PaymentCustomersTable data={data} />}
    </DataGrid>
  );
}
