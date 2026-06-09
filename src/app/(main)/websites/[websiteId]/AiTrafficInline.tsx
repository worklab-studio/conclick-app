'use client';

import { Sparkles, Loader2 } from 'lucide-react';
import { useAiTrafficQuery } from '@/components/hooks';
import { TabEmptyState } from '@/components/common/TabEmptyState';

const NAMES: Record<string, string> = {
  'chatgpt.com': 'ChatGPT',
  'chat.openai.com': 'ChatGPT',
  'openai.com': 'ChatGPT',
  'perplexity.ai': 'Perplexity',
  'gemini.google.com': 'Gemini',
  'bard.google.com': 'Gemini',
  'copilot.microsoft.com': 'Copilot',
  'claude.ai': 'Claude',
  'you.com': 'You.com',
  'poe.com': 'Poe',
  'phind.com': 'Phind',
};
const friendly = (d: string) => NAMES[d] || d;

function money(minor: number, currency: string) {
  const major = (minor || 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: Number.isInteger(major) ? 0 : 2,
    }).format(major);
  } catch {
    return `$${major.toFixed(0)}`;
  }
}

// "Revenue from AI search" — visitors who arrived from ChatGPT/Perplexity/etc,
// with how many paid and how much they spent. Read-side over existing data.
export function AiTrafficInline({ websiteId }: { websiteId: string }) {
  const { data, isLoading } = useAiTrafficQuery(websiteId);
  const rows = Array.isArray(data) ? data : [];

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  if (!rows.length) {
    return (
      <TabEmptyState
        icon={Sparkles}
        title="No AI traffic yet"
        description="When visitors arrive from ChatGPT, Perplexity, Gemini, Copilot or Claude, they'll show up here — with how many paid and how much revenue they drove."
      />
    );
  }

  return (
    <div className="divide-y divide-[hsl(0,0%,12%)]">
      <div className="hidden text-[11px] font-medium uppercase tracking-wide text-muted-foreground/60 md:block">
        <div className="flex items-center gap-6 px-7 py-2">
          <div className="flex-1">AI source</div>
          <div className="w-24 text-right">Visitors</div>
          <div className="w-20 text-right">Paid</div>
          <div className="w-28 text-right">Revenue</div>
        </div>
      </div>

      {rows.map(r => (
        <div key={r.source} className="flex items-center gap-6 px-7 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#5e5ba4]/15 text-[#b7b4e4]">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="truncate text-sm font-semibold text-foreground">
              {friendly(r.source)}
            </span>
          </div>
          <div className="w-24 text-right text-sm text-foreground">{r.visitors}</div>
          <div className="w-20 text-right text-sm text-muted-foreground">{r.paying || 0}</div>
          <div className="w-28 text-right">
            {r.revenue > 0 ? (
              <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-sm font-semibold text-emerald-300">
                {money(r.revenue, r.currency)}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground/50">—</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
