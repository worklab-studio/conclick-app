import { hubMetadata } from '@/components/seo/Hub';
import { BlogIndex } from '@/components/seo/BlogIndex';

// Static, revalidated daily. BlogIndex is deliberately built so this stays true:
// its category filter is CSS-only, so there is no searchParam to read and the
// route never opts into dynamic rendering.
export const revalidate = 86400;

// hubMetadata is still the right helper — it is generic (canonical + OG +
// Twitter) and has nothing hub-layout-specific in it. Reusing it keeps /blog's
// head identical in shape to the other six hubs.
export const metadata = hubMetadata(
  '/blog',
  'The Conclick blog',
  'Opinionated writing on analytics, revenue attribution, and growth for bootstrapped founders — from the team building Conclick.',
);

export default function Page() {
  return (
    <BlogIndex
      eyebrow="Conclick Blog"
      titleLead="Notes on analytics"
      titleSerif="that actually pay."
      intro="Founder-to-founder takes on what to measure, what to ignore, and how to connect the traffic you already have to the revenue you actually want."
    />
  );
}
