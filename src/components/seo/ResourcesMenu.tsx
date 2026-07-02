'use client';

import { useRef, useState } from 'react';
import { ChevronDown, FileText, BookOpen, BarChart3, Wrench } from 'lucide-react';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://conclick.io';

const ITEMS = [
  { href: `${SITE}/blog`, icon: FileText, title: 'Blog', desc: 'Insights, product notes, and updates' },
  { href: `${SITE}/guides`, icon: BookOpen, title: 'Guides', desc: 'Step-by-step walkthroughs and playbooks' },
  { href: `${SITE}/compare`, icon: BarChart3, title: 'Compare', desc: 'Feature and alternative comparisons' },
  { href: `${SITE}/tools`, icon: Wrench, title: 'Tools', desc: 'Free utilities and templates' },
];

// Matches the conclick.io homepage "Resources" nav dropdown exactly. The panel is
// always rendered (CSS-toggled, not conditionally mounted) so the hub links sit in
// the server HTML and crawlers can follow them.
export function ResourcesMenu() {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = () => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(true);
  };
  const hide = () => {
    timer.current = setTimeout(() => setOpen(false), 120);
  };

  return (
    <div className="relative" onMouseEnter={show} onMouseLeave={hide}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 text-[15px] text-zinc-300 transition-colors hover:text-white"
      >
        Resources
        <ChevronDown className="h-4 w-4" />
      </button>

      <div
        className={`absolute left-0 top-[calc(100%+14px)] z-50 w-80 overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c0e] p-2 shadow-2xl shadow-black/60 transition-all duration-150 ${
          open ? 'visible translate-y-0 opacity-100' : 'pointer-events-none invisible -translate-y-1 opacity-0'
        }`}
      >
        <div className="px-3 pb-3 pt-2">
          <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Resources</div>
          <div className="mt-0.5 text-sm font-medium text-white">Explore the knowledge base</div>
        </div>
        <div className="mx-1 border-t border-white/[0.08]" />
        <div className="pt-1">
          {ITEMS.map(it => (
            <a
              key={it.title}
              href={it.href}
              className="flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-white/[0.05]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
                <it.icon className="h-[18px] w-[18px] text-zinc-300" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-white">{it.title}</span>
                <span className="block text-xs leading-snug text-zinc-500">{it.desc}</span>
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
