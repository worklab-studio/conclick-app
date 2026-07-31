import { entriesByType, pathFor } from '@/content';
import { HubGrid, hubMetadata } from '@/components/seo/Hub';

export const revalidate = 86400;

export const metadata = hubMetadata(
  '/alternatives',
  'Analytics tool alternatives',
  'Roundups of the best alternatives to Google Analytics, Plausible, Fathom, Hotjar and more, what each is good at, and where Conclick fits.',
);

export default function Page() {
  const items = entriesByType('alternative').map(e => ({
    href: `/${pathFor(e)}`,
    title: `Best ${e.comparison?.competitor || e.slug} alternatives`,
    desc: e.metaDescription,
  }));
  return (
    <HubGrid
      path="/alternatives"
      eyebrow="Alternatives"
      title="The best analytics alternatives"
      intro="Switching off your current tool? These roundups cover the real options for each, ranked by what actually matters."
      items={items}
    />
  );
}
