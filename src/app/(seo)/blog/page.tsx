import { entriesByType, pathFor } from '@/content';
import { HubGrid, hubMetadata } from '@/components/seo/Hub';

export const revalidate = 86400;

export const metadata = hubMetadata(
  '/blog',
  'The Conclick blog',
  'Opinionated writing on analytics, revenue attribution, and growth for bootstrapped founders — from the team building Conclick.',
);

export default function Page() {
  const items = entriesByType('blog').map(e => ({
    href: `/${pathFor(e)}`,
    title: e.h1,
    desc: e.metaDescription,
  }));
  return (
    <HubGrid
      path="/blog"
      eyebrow="Blog"
      title="Notes on analytics that pay"
      intro="Founder-to-founder takes on what to measure, what to ignore, and how to connect your traffic to revenue."
      items={items}
    />
  );
}
