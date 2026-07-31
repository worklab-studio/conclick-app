import type { Metadata } from 'next';
import { LegalH1, LegalMeta, LegalH2, LegalP, LegalUL, LegalA } from '@/components/legal';

export const metadata: Metadata = { title: 'Privacy Policy' };

export default function PrivacyPage() {
  return (
    <>
      <LegalH1>Privacy Policy</LegalH1>
      <LegalMeta>Last updated June 12, 2026</LegalMeta>

      <LegalP>
        {`Conclick ("Conclick", "we", "us") provides privacy-first website analytics and revenue attribution for businesses. This policy explains what data we process, why, and the choices you have. It covers two groups: (1) customers who hold a Conclick account, and (2) visitors to websites that use Conclick's analytics.`}
      </LegalP>

      <LegalH2>Privacy-first by design</LegalH2>
      <LegalP>
        {`Conclick is built to measure websites without invading visitors' privacy. By default we set no advertising cookies, perform no cross-site or cross-device tracking, and never sell personal data. A visitor's IP address is used only momentarily to derive a coarse location (country and region) and a per-day session identifier — it is not stored.`}
      </LegalP>

      <LegalH2>Data we process for website analytics</LegalH2>
      <LegalP>
        {`When you visit a site that uses Conclick, we process the following on the site owner's behalf (acting as a data processor): the pages viewed and referring URLs, UTM/campaign parameters, browser, operating system and device type, approximate location (country and region), custom events the site chooses to send, revenue events from the site's connected payment provider, and the coarse vertical position of clicks used to build aggregate heat maps. We do not record screen sessions, keystrokes, form contents, or precise pointer movement.`}
      </LegalP>

      <LegalH2>Data we collect to operate Conclick</LegalH2>
      <LegalP>
        {`To provide the product to account holders (acting as a data controller) we collect: your name and email address (via our authentication provider), authentication identifiers, the billing details needed to process your subscription (handled by our payment processor — we never store full card numbers), the configuration of any notification channels you connect (Slack, Discord or Telegram delivery targets, stored encrypted), and, only if you choose to connect Google, OAuth tokens granting read-only access to your Google Search Console and Google Analytics data (stored encrypted).`}
      </LegalP>

      <LegalH2>Service providers</LegalH2>
      <LegalP>{`We share data only with the providers needed to run Conclick:`}</LegalP>
      <LegalUL>
        <li>Google — optional “Sign in with Google” authentication.</li>
        <li>Dodo Payments — subscription billing and payment processing.</li>
        <li>Resend — transactional and digest email.</li>
        <li>Google — Search Console and Analytics data you authorize us to read (read-only).</li>
        <li>Slack, Discord and Telegram — delivering the notifications you configure.</li>
        <li>Fly.io — application hosting and database infrastructure.</li>
      </LegalUL>

      <LegalH2>Google user data</LegalH2>
      <LegalP>
        {`Conclick's use and transfer of information received from Google APIs adheres to the `}
        <LegalA href="https://developers.google.com/terms/api-services-user-data-policy">
          Google API Services User Data Policy
        </LegalA>
        {`, including the Limited Use requirements. We request read-only Search Console and Analytics scopes solely to display your search performance and import your historical analytics into your Conclick dashboard. We do not use this data for advertising, do not sell it, and do not transfer it except as needed to provide these features to you. You can revoke Conclick's access at any time from your `}
        <LegalA href="https://myaccount.google.com/permissions">Google Account permissions</LegalA>
        {` or by disconnecting Google in your Conclick settings.`}
      </LegalP>

      <LegalH2>Slack, Discord and Telegram</LegalH2>
      <LegalP>
        {`When you connect a messaging channel, Conclick stores only what is needed to post to it (an incoming-webhook URL, or a bot token and chat id), encrypted at rest, and uses it solely to send the digests and alerts you enable. We do not read your messages or access any other content in your workspace, server or chats. Removing a channel deletes its stored configuration.`}
      </LegalP>

      <LegalH2>Data retention</LegalH2>
      <LegalP>
        {`Analytics data is retained while the site owner keeps their Conclick website and is deleted when the website is deleted or reset. Account, billing and integration data is retained while your account is active and removed when you delete your account. Encrypted integration credentials are deleted as soon as you disconnect the integration.`}
      </LegalP>

      <LegalH2>Security</LegalH2>
      <LegalP>
        {`Sensitive credentials — payment, notification and Google tokens — are encrypted at rest. All traffic is served over TLS, and access to production systems is restricted.`}
      </LegalP>

      <LegalH2>Your choices and rights</LegalH2>
      <LegalP>
        {`You can view and update your account information in your Conclick settings, disconnect any integration at any time, and delete your account, which removes your personal data and your websites' analytics. Visitors who wish to exercise rights over data collected on a particular website should contact that website's owner, who controls it; we will assist as the processor. To make a request to us directly, email `}
        <LegalA href="mailto:support@conclick.io">support@conclick.io</LegalA>
        {`.`}
      </LegalP>

      <LegalH2>Cookies</LegalH2>
      <LegalP>
        {`The Conclick application uses a single essential cookie to keep you signed in. The Conclick analytics tracker that runs on customer websites uses no cookies.`}
      </LegalP>

      <LegalH2>Children</LegalH2>
      <LegalP>
        {`Conclick is not directed to children under 13 (or the applicable age in your jurisdiction) and we do not knowingly collect their personal data.`}
      </LegalP>

      <LegalH2>Changes</LegalH2>
      <LegalP>
        {`We may update this policy; material changes will be reflected by the "last updated" date above and, where appropriate, communicated to account holders.`}
      </LegalP>

      <LegalH2>Contact</LegalH2>
      <LegalP>
        {`Questions about this policy or your data: `}
        <LegalA href="mailto:support@conclick.io">support@conclick.io</LegalA>
        {`.`}
      </LegalP>
    </>
  );
}
