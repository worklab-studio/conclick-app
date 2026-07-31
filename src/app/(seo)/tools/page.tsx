import { entriesByType, pathFor } from '@/content';
import { HubGrid, hubMetadata } from '@/components/seo/Hub';

export const revalidate = 86400;

export const metadata = hubMetadata(
  '/tools',
  'Free analytics & marketing tools',
  'Free, no-signup tools from Conclick, UTM builder and more. Built for founders who want clean campaign tracking without the busywork.',
);

export default function Page() {
  const items = entriesByType('tool').map(e => ({
    href: `/${pathFor(e)}`,
    title: e.h1.replace(/.*$/, ''),
    desc: e.metaDescription,
  }));
  return (
    <HubGrid
      path="/tools"
      eyebrow="Free tools"
      title="Free tools for founders"
      intro="Simple, free, no-signup utilities. Use them as much as you like, no account required."
      items={items}
    />
  );
}
