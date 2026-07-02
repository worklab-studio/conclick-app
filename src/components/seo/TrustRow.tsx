import { Zap, CreditCard, ShieldCheck, Plug } from 'lucide-react';

// Compact trust/stats strip under the hero input.
const ITEMS = [
  { icon: Zap, label: '~2-min setup' },
  { icon: CreditCard, label: '14-day trial, no card' },
  { icon: ShieldCheck, label: 'Cookieless · GDPR-friendly' },
  { icon: Plug, label: '5 payment integrations' },
];

export function TrustRow() {
  return (
    <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-zinc-400">
      {ITEMS.map((it, i) => (
        <span key={i} className="inline-flex items-center gap-1.5">
          <it.icon className="h-3.5 w-3.5 text-[#8b88cf]" />
          {it.label}
        </span>
      ))}
    </div>
  );
}
