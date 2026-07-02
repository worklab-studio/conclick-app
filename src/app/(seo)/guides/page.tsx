import { entriesByType, pathFor } from '@/content';
import { HubGrid, hubMetadata } from '@/components/seo/Hub';

export const revalidate = 86400;

export const metadata = hubMetadata(
  '/guides',
  'Analytics guides',
  'Practical, founder-written guides on funnels, GA4, GDPR-compliant analytics, and getting answers out of your traffic data.',
);

export default function Page() {
  const items = entriesByType('guide').map(e => ({
    href: `/${pathFor(e)}`,
    title: e.h1,
    desc: e.metaDescription,
  }));
  return (
    <HubGrid
      path="/guides"
      eyebrow="Guides"
      title="Practical analytics guides"
      intro="No fluff. How to read a funnel, escape GA4, stay GDPR-compliant, and turn traffic data into decisions."
      items={items}
    />
  );
}
