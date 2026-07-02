import { entriesByType, pathFor } from '@/content';
import { HubGrid, hubMetadata } from '@/components/seo/Hub';

export const revalidate = 86400;

export const metadata = hubMetadata(
  '/glossary',
  'Web analytics glossary',
  'Plain-English definitions of the web analytics and growth terms that actually matter — attribution, funnels, UTM, cookieless analytics and more.',
);

export default function Page() {
  const items = entriesByType('glossary').map(e => ({
    href: `/${pathFor(e)}`,
    title: e.h1,
    desc: e.tldr,
  }));
  return (
    <HubGrid
      path="/glossary"
      eyebrow="Glossary"
      title="The analytics terms that matter"
      intro="Clear, no-jargon definitions of the metrics and concepts behind privacy-first analytics and revenue attribution."
      items={items}
    />
  );
}
