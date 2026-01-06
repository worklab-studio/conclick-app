import { BillingPage } from './BillingPage';
import { Metadata } from 'next';

export default function () {
    return <BillingPage />;
}

export const metadata: Metadata = {
    title: 'Billing',
};
