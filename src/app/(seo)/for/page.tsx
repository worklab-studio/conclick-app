import { entriesByType, pathFor } from '@/content';
import { HubGrid, hubMetadata } from '@/components/seo/Hub';

export const revalidate = 86400;

export const metadata = hubMetadata(
  '/for',
  'Conclick for your kind of business',
  'How Conclick fits SaaS, ecommerce, agencies, indie hackers, and creators — the metrics that matter for each and how to track what actually pays.',
);

export default function Page() {
  const items = entriesByType('useCase').map(e => ({
    href: `/${pathFor(e)}`,
    title: e.h1,
    desc: e.tldr,
  }));
  return (
    <HubGrid
      path="/for"
      eyebrow="Use cases"
      title="Built for how you actually work"
      intro="The metrics that matter depend on what you're building. Here's how Conclick fits your kind of business."
      items={items}
    />
  );
}
