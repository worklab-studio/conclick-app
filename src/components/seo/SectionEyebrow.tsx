import type { ComponentType } from 'react';

// The small rounded-full badge the homepage uses above section headings
// (e.g. the "FAQ" pill). Centered by default within a text-center section.
export function SectionEyebrow({
  icon: Icon,
  label,
}: {
  icon?: ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-zinc-300">
      {Icon && <Icon className="h-3.5 w-3.5 text-[#8b88cf]" />}
      {label}
    </span>
  );
}
