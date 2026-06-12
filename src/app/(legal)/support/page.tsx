import type { Metadata } from 'next';
import { LegalH1, LegalMeta, LegalH2, LegalP, LegalUL, LegalA } from '@/components/legal';

export const metadata: Metadata = { title: 'Support' };

export default function SupportPage() {
  return (
    <>
      <LegalH1>Support</LegalH1>
      <LegalMeta>We&apos;re happy to help you get the most out of Conclick.</LegalMeta>

      <LegalH2>Email us</LegalH2>
      <LegalP>
        {`The fastest way to reach us is email: `}
        <LegalA href="mailto:support@conclick.io">support@conclick.io</LegalA>
        {`. We typically reply within one business day.`}
      </LegalP>

      <LegalH2>What to include</LegalH2>
      <LegalP>
        {`To help us resolve your issue quickly, please include your account email, the website involved (if any), what you expected to happen, what actually happened, and a screenshot if it helps.`}
      </LegalP>

      <LegalH2>Common topics</LegalH2>
      <LegalUL>
        <li>
          Connecting a payment provider for revenue attribution (website Settings → Revenue
          Integration).
        </li>
        <li>Setting up Slack, Discord or Telegram notifications (Account → Notifications).</li>
        <li>
          Connecting Google Search Console and importing Google Analytics history (website Settings
          → Google).
        </li>
        <li>Billing, plans and trials (Account → Billing).</li>
      </LegalUL>

      <LegalH2>Security</LegalH2>
      <LegalP>
        {`To report a security issue, email `}
        <LegalA href="mailto:support@conclick.io">support@conclick.io</LegalA>
        {` with "Security" in the subject line and we will prioritize it.`}
      </LegalP>
    </>
  );
}
