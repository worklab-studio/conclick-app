'use client';

import type { IntentResult, IntentLevel } from '@/lib/intent-score';

// Green → red by buying likelihood.
const STYLES: Record<IntentLevel, { dot: string; text: string; bg: string; ring: string }> = {
  hot: {
    dot: 'bg-emerald-400',
    text: 'text-emerald-300',
    bg: 'bg-emerald-500/10',
    ring: 'ring-emerald-500/25',
  },
  warm: {
    dot: 'bg-yellow-300',
    text: 'text-yellow-200',
    bg: 'bg-yellow-500/10',
    ring: 'ring-yellow-500/25',
  },
  cool: {
    dot: 'bg-orange-400',
    text: 'text-orange-300',
    bg: 'bg-orange-500/10',
    ring: 'ring-orange-500/25',
  },
  cold: {
    dot: 'bg-red-400',
    text: 'text-red-300',
    bg: 'bg-red-500/10',
    ring: 'ring-red-500/25',
  },
};

/**
 * Buying-intent pill. `sm` = dot + score (table rows, live cards);
 * `md` = dot + score + label (visitor profile). Hover shows the evidence.
 */
export function IntentBadge({ result, size = 'sm' }: { result: IntentResult; size?: 'sm' | 'md' }) {
  const s = STYLES[result.level];
  const title = `Buying intent ${result.score}/100, ${result.label}${
    result.reasons.length ? `\n• ${result.reasons.join('\n• ')}` : ''
  }`;

  if (size === 'sm') {
    return (
      <span
        title={title}
        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${s.bg} ${s.text} ${s.ring}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
        {result.score}
      </span>
    );
  }

  return (
    <span
      title={title}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset ${s.bg} ${s.text} ${s.ring}`}
    >
      <span className="relative flex h-2 w-2">
        {result.level === 'hot' && (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${s.dot}`}
          />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${s.dot}`} />
      </span>
      {result.score} · {result.label}
    </span>
  );
}
