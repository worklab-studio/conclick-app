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
    <nav aria-label="On this page" className="text-sm">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">On this page</div>
      <ul className="space-y-1.5 border-l border-white/10">
        {items.map(i => (
          <li key={i.id}>
            <a
              href={`#${i.id}`}
              className={`-ml-px block border-l-2 py-0.5 pl-3 leading-snug transition-colors ${
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
