'use client';

import { useEffect, useState } from 'react';

// Sticky on-page nav with scroll-spy. Hidden when there are fewer than 3 sections.
export function TableOfContents({ items }: { items: { id: string; text: string }[] }) {
  const [active, setActive] = useState(items[0]?.id);

  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: '-80px 0px -70% 0px' },
    );
    for (const i of items) {
      const el = document.getElementById(i.id);
      if (el) obs.observe(el);
    }
    return () => obs.disconnect();
  }, [items]);

  if (items.length < 3) return null;

  return (
    // text-[13px] is the folder's dense-secondary size, used by every other rail
    // label. The left border-rule below stays a LEFT rule even though the rail
    // now sits to the right of the prose: it reads as the divider between the
    // article and its index (what Tailwind's, Stripe's and MDN's docs all do),
    // whereas mirroring to border-r/text-right gives a ragged left edge on the
    // headings that wrap — and these do wrap at ~50 characters.
    <nav aria-label="On this page" className="text-[13px]">
      {/* pl-[14px] optically aligns this label with the link text below it:
          the ul's 1px border-l + each link's -ml-px + border-l-2 + pl-3 puts
          that text exactly 14px from the ul's border-box left edge. If the
          border/padding chain below ever changes, this number changes with it. */}
      <div className="mb-3 pl-[14px] text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
        On this page
      </div>
      <ul className="space-y-1.5 border-l border-white/10">
        {items.map(i => (
          <li key={i.id}>
            <a
              href={`#${i.id}`}
              className={`-ml-px block border-l-2 py-1 pl-3 leading-snug transition-colors ${
                active === i.id ? 'border-[#6C63C9] text-white' : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {i.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
