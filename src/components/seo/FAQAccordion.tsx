import { Plus, Minus } from 'lucide-react';
import type { FaqItem } from '@/content/schema';

// Native <details>/<summary> accordion — zero JS, works without hydration, and
// the full answers live in server HTML as real content (no display:none), which
// search + AI answer engines extract directly. Questions are h3 headings so each
// Q&A is a citable anchor in the document outline. FAQPage JSON-LD mirrors it.
export function FAQAccordion({ items }: { items: FaqItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((f, i) => (
        <details key={i} className="group overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
          <summary className="flex w-full cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left [&::-webkit-details-marker]:hidden">
            <h3 className="text-[16px] font-medium text-white">{f.question}</h3>
            <Plus className="h-5 w-5 shrink-0 text-zinc-400 group-open:hidden" />
            <Minus className="hidden h-5 w-5 shrink-0 text-zinc-400 group-open:block" />
          </summary>
          <div className="px-5 pb-4 text-[15px] leading-relaxed text-zinc-400">{f.answer}</div>
        </details>
      ))}
    </div>
  );
}
