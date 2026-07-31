import { DollarSign, MousePointerClick, Filter } from 'lucide-react';

// The three things only Conclick brings together — shown as icon cards at the top
// of every comparison/alternative page (the "at a glance" answer).
const CARDS = [
  {
    icon: DollarSign,
    title: 'Revenue attribution',
    body: 'Ties every Stripe, Paddle, Polar, Lemon Squeezy, or Dodo payment back to the source, campaign, and funnel that earned it.',
  },
  {
    icon: MousePointerClick,
    title: 'Real heatmaps',
    body: 'Click maps, scroll depth, and rage/dead clicks on real screenshots of your actual pages.',
  },
  {
    icon: Filter,
    title: 'Auto-detected funnels',
    body: 'Surfaces your single biggest drop-off and the revenue you are losing to it, no manual setup.',
  },
];

export function AtAGlance() {
  return (
    <div className="mb-10 grid gap-4 sm:grid-cols-3">
      {CARDS.map((c, i) => (
        <div key={i} className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <c.icon className="h-5 w-5 text-[#8b88cf]" />
          <div className="mt-3 text-sm font-semibold text-white">{c.title}</div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-400">{c.body}</p>
        </div>
      ))}
    </div>
  );
}
