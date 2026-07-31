import { entriesByType, pathFor } from '@/content';
import { HubGrid, hubMetadata } from '@/components/seo/Hub';

export const revalidate = 86400;

export const metadata = hubMetadata(
  '/compare',
  'Compare Conclick to other analytics tools',
  'Honest, side-by-side comparisons of Conclick versus Plausible, Google Analytics, Fathom, Matomo, PostHog and more, including where each one wins.',
);

export default function Page() {
  const items = entriesByType('comparison').map(e => ({
    href: `/${pathFor(e)}`,
    title: `Conclick vs ${e.comparison?.competitor || e.slug}`,
    desc: e.metaDescription,
  }));
  return (
    <HubGrid
      path="/compare"
      eyebrow="Comparisons"
      title="Conclick vs the alternatives"
      intro="Honest head-to-head breakdowns, including where the other tool genuinely wins. Pick the one closest to what you're weighing."
      items={items}
      body={
        <div className="space-y-4 text-[15px] leading-relaxed text-zinc-400">
          <p>
            Every analytics tool measures pageviews. The question that actually matters is which one
            tells you something you can act on, which traffic converts, where people drop off, and
            which campaigns actually pay. That&apos;s the lens behind each comparison here.
          </p>
          <p>
            If you just want clean, private pageview counts, Plausible and Fathom are excellent and
            simpler than Conclick. If you need to tie traffic to revenue, connect Stripe, Paddle, or
            Polar and see which source, campaign, and funnel earned each payment, that&apos;s where
            Conclick is built to win. Heatmaps and auto-detected funnels come in the same dashboard,
            so you&apos;re not stitching three tools together. Start with the head-to-head closest
            to the tool you&apos;re considering.
          </p>
        </div>
      }
    />
  );
}
