'use client';

import { TrendingUp } from 'lucide-react';
import { useRevenueBySourceQuery } from '@/components/hooks';

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

// Compact "where your paying customers originally came from" — sits above the
// customer list and hides itself when there's no revenue yet.
export function RevenueBySourceInline({ websiteId }: { websiteId: string }) {
  const { data } = useRevenueBySourceQuery(websiteId);
  const rows = (Array.isArray(data) ? data : []).filter(r => r.revenue > 0).slice(0, 6);

  if (!rows.length) {
    return null;
  }

  const max = Math.max(...rows.map(r => r.revenue), 1);

  return (
    <div className="border-b border-[hsl(0,0%,12%)] p-4">
      <div className="mb-2.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
        <TrendingUp className="h-3.5 w-3.5 text-[#8b88cf]" /> Revenue by source · first touch
      </div>
      <div className="space-y-1.5">
        {rows.map(r => (
          <div key={r.source} className="flex items-center gap-3">
            <div className="w-32 shrink-0 truncate text-sm text-foreground">{r.source}</div>
            <div className="relative h-5 flex-1 overflow-hidden rounded bg-[hsl(0,0%,11%)]">
              <div
                className="absolute inset-y-0 left-0 rounded bg-[#5e5ba4]/40"
                style={{ width: `${Math.max(4, (r.revenue / max) * 100)}%` }}
              />
            </div>
            <div className="w-20 shrink-0 text-right text-sm font-semibold text-emerald-300">
              {money(r.revenue, r.currency)}
            </div>
            <div className="w-16 shrink-0 text-right text-xs text-muted-foreground">
              {r.customers} cust
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
