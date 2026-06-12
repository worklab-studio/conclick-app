import type { Metadata } from 'next';
import { LegalH1, LegalMeta, LegalH2, LegalP, LegalA } from '@/components/legal';

export const metadata: Metadata = { title: 'Terms of Service' };

export default function TermsPage() {
  return (
    <>
      <LegalH1>Terms of Service</LegalH1>
      <LegalMeta>Last updated June 12, 2026</LegalMeta>

      <LegalP>
        {`These Terms govern your use of Conclick ("Conclick", "we", "us"). By creating an account or using the service, you agree to them. If you use Conclick on behalf of an organization, you accept these Terms for that organization.`}
      </LegalP>

      <LegalH2>The service</LegalH2>
      <LegalP>
        {`Conclick provides website analytics, revenue attribution, and related features. We may add, change or remove features over time.`}
      </LegalP>

      <LegalH2>Your account</LegalH2>
      <LegalP>
        {`You are responsible for the activity under your account and for keeping your credentials secure. You must provide accurate information and be old enough to form a binding contract.`}
      </LegalP>

      <LegalH2>Free trial and billing</LegalH2>
      <LegalP>
        {`New accounts include a 14-day free trial that requires no credit card. After the trial, continued use requires a paid plan: $9 per month, or $99 one-time for lifetime access. Subscriptions are billed through our payment processor, Dodo Payments. Monthly plans renew automatically until cancelled; you can cancel anytime and keep access until the end of the paid period. Except where required by law, payments are non-refundable.`}
      </LegalP>

      <LegalH2>Acceptable use</LegalH2>
      <LegalP>
        {`You agree not to misuse Conclick — including by collecting data unlawfully, infringing others' rights, attempting to breach security or access other customers' data, reselling the service without permission, or sending unlawful content through connected channels. You are responsible for having a lawful basis and appropriate notices or consent for the analytics you collect on your websites.`}
      </LegalP>

      <LegalH2>Your data</LegalH2>
      <LegalP>
        {`You own the analytics and content you collect through Conclick. You grant us the limited rights needed to host and process it in order to provide the service. Our handling of personal data is described in our `}
        <LegalA href="/privacy">Privacy Policy</LegalA>
        {`.`}
      </LegalP>

      <LegalH2>Third-party integrations</LegalH2>
      <LegalP>
        {`Conclick connects to third-party services (payment providers, Google, Slack, Discord, Telegram) at your direction. Your use of those services is governed by their own terms, and we are not responsible for them.`}
      </LegalP>

      <LegalH2>Disclaimers</LegalH2>
      <LegalP>
        {`Conclick is provided "as is" without warranties of any kind. We do not guarantee that the service will be uninterrupted or error-free, or that analytics figures are perfectly accurate.`}
      </LegalP>

      <LegalH2>Limitation of liability</LegalH2>
      <LegalP>
        {`To the maximum extent permitted by law, Conclick will not be liable for indirect, incidental or consequential damages, and our total liability for any claim is limited to the amount you paid us in the twelve months before the claim.`}
      </LegalP>

      <LegalH2>Termination</LegalH2>
      <LegalP>
        {`You may stop using Conclick and delete your account at any time. We may suspend or terminate accounts that violate these Terms.`}
      </LegalP>

      <LegalH2>Changes</LegalH2>
      <LegalP>
        {`We may update these Terms; material changes will be reflected by the date above.`}
      </LegalP>

      <LegalH2>Contact</LegalH2>
      <LegalP>
        {`Questions about these Terms: `}
        <LegalA href="mailto:support@conclick.io">support@conclick.io</LegalA>
        {`.`}
      </LegalP>
    </>
  );
}
