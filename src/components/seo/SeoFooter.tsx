import { Logo } from '@/components/logo';
import { siteUrl } from '@/lib/seo';
import { SectionEyebrow } from './SectionEyebrow';
import { HeroWebsiteInput } from './HeroWebsiteInput';

// Mirrors the conclick.io Framer homepage footer exactly — same five columns
// (Quick Links / Pages / Resources / Social / Legal), same copyright line — so
// the SEO pages read as the same site. Resources carries every content hub
// (Framer's four + our other three) so internal authority reaches all clusters.
export function SeoFooter() {
  const site = siteUrl();

  const cols: { title: string; links: { href: string; label: string }[] }[] = [
    {
      title: 'Quick Links',
      links: [
        { href: `${site}/#advantages`, label: 'Advantages' },
        { href: `${site}/#features`, label: 'Features' },
        { href: `${site}/#benefits`, label: 'Benefits' },
        { href: `${site}/#reviews`, label: 'Reviews' },
        { href: `${site}/#faq`, label: 'FAQ' },
      ],
    },
    {
      title: 'Pages',
      links: [
        { href: `${site}/`, label: 'Home' },
        { href: `${site}/pricing`, label: 'Pricing' },
        { href: `${site}/contact`, label: 'Contact' },
        { href: `${site}/about`, label: 'About' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { href: '/blogs', label: 'Blogs' },
        { href: '/guides', label: 'Guide' },
        { href: '/compare', label: 'Compare' },
        { href: '/tools', label: 'Tools' },
        { href: '/alternatives', label: 'Alternatives' },
        { href: '/glossary', label: 'Glossary' },
        { href: '/for', label: 'Use cases' },
      ],
    },
    {
      title: 'Social',
      links: [
        { href: 'https://www.linkedin.com/in/deepak-yadav-40a202140/', label: 'Linkedin' },
        { href: 'https://x.com/thedeepflux', label: 'Twitter' },
      ],
    },
    {
      title: 'Legal',
      links: [
        // Full paths, not /privacy and /terms — those 404. Wrong here is worse
        // than elsewhere: it is the footer, so it repeats on every page, and
        // these pages make GDPR claims that the policy link is meant to back.
        { href: `${site}/privacy-policy`, label: 'Privacy policy' },
        { href: `${site}/terms-of-service`, label: 'Terms of service' },
      ],
    },
  ];

  return (
    <footer className="mt-20">
      {/* Conversion band (pre-footer section) */}
      <section className="relative overflow-hidden border-t border-white/[0.07] px-6 py-20 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-56 w-[44rem] -translate-x-1/2 rounded-full bg-[#6C63C9]/20 blur-[110px]"
        />
        <div className="relative">
          <SectionEyebrow label="Get started" />
          {/* styled as a heading but kept out of the document outline (template chrome) */}
          <p className="mx-auto mt-5 max-w-xl text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] text-white sm:text-[38px]">
            See which traffic actually makes you money
          </p>
          <p className="mx-auto mt-4 max-w-md text-sm text-zinc-400">
            Analytics, heatmaps, funnels, and revenue in one privacy-first dashboard. Free for 14
            days, no card.
          </p>
          <div className="mt-8">
            <HeroWebsiteInput />
          </div>
        </div>
      </section>

      {/* Footer, same structure as the Framer homepage footer */}
      <div className="border-t border-white/[0.07] px-8 py-14">
        <div className="flex flex-col gap-12 md:flex-row md:justify-between">
          <a href={site} className="flex h-fit items-center gap-2" aria-label="Conclick home">
            <Logo className="h-6 w-auto text-white" />
            <span className="text-[19px] font-bold tracking-tight text-white">Conclick</span>
          </a>
          <div className="grid grid-cols-2 gap-x-12 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
            {cols.map(c => (
              <div key={c.title}>
                <div className="mb-4 text-[15px] font-semibold text-white">{c.title}</div>
                <ul className="space-y-3">
                  {c.links.map((l, i) => (
                    <li key={i}>
                      <a
                        href={l.href}
                        className="text-sm text-zinc-400 transition-colors hover:text-white"
                      >
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 border-t border-white/[0.07] pt-6 text-sm text-zinc-500">
          Copyright © {new Date().getUTCFullYear()} Conclick. All rights reserved
        </div>
      </div>
    </footer>
  );
}
