'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { useFormat, useNavigation } from '@/components/hooks';
import { Avatar } from '@/components/common/Avatar';
import { TypeIcon } from '@/components/common/TypeIcon';
import { friendlyName } from '@/lib/friendly-name';
import { cn } from '@/lib/utils';

// Amounts arrive in minor units (cents). pg returns bigint as string, so Number() it.
function formatMoney(minorRaw: any, currency?: string) {
  const major = (Number(minorRaw) || 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: Number.isInteger(major) ? 0 : 2,
    }).format(major);
  } catch {
    return `${major.toFixed(2)} ${currency || ''}`.trim();
  }
}

function lastSeen(value: any) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return formatDistanceToNow(d, { addSuffix: true });
}

// A small datafast-style strip of dots representing visit count.
function VisitDots({ visits }: { visits: number }) {
  const max = 8;
  const n = Math.min(Math.max(visits, 0), max);
  return (
    <div className="flex items-center gap-1" title={`${visits} visit${visits === 1 ? '' : 's'}`}>
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className={cn('h-1.5 w-1.5 rounded-full', i < n ? 'bg-[#5e5ba4]' : 'bg-[hsl(0,0%,18%)]')}
        />
      ))}
    </div>
  );
}

export function VisitorsTable({ data }: { data?: any[]; displayMode?: string }) {
  const { formatValue } = useFormat();
  const { updateParams } = useNavigation();
  const rows = Array.isArray(data) ? data : [];

  return (
    <div className="divide-y divide-[hsl(0,0%,12%)] overflow-hidden rounded-xl border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,8%)]">
      {rows.map((row: any) => {
        const seed = row.distinctId || row.id;
        const visits = Number(row.visits) || 0;
        const views = Number(row.views) || 0;
        const spent = Number(row.spentMinor) || 0;

        return (
          <Link
            key={row.id}
            href={updateParams({ session: row.id })}
            className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-[hsl(0,0%,11%)]"
          >
            <Avatar seed={seed} size={40} />

            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold capitalize text-foreground">
                {friendlyName(seed)}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {row.country && (
                  <TypeIcon type="country" value={row.country}>
                    <span>{formatValue(row.country, 'country')}</span>
                  </TypeIcon>
                )}
                {row.device && (
                  <TypeIcon type="device" value={row.device}>
                    <span>{formatValue(row.device, 'device')}</span>
                  </TypeIcon>
                )}
                {row.os && (
                  <TypeIcon type="os" value={row.os}>
                    <span>{formatValue(row.os, 'os')}</span>
                  </TypeIcon>
                )}
                {row.browser && (
                  <TypeIcon type="browser" value={row.browser}>
                    <span>{formatValue(row.browser, 'browser')}</span>
                  </TypeIcon>
                )}
              </div>
            </div>

            {/* Visit activity */}
            <div className="hidden flex-col items-end gap-1 sm:flex">
              <VisitDots visits={visits} />
              <span className="text-xs text-muted-foreground">
                {visits} visit{visits === 1 ? '' : 's'} · {views} views
              </span>
            </div>

            {/* Spent — lights up once a payment is attributed to this visitor */}
            <div className="w-24 shrink-0 text-right">
              {spent > 0 ? (
                <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-sm font-semibold text-emerald-300">
                  {formatMoney(spent, row.spentCurrency)}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground/40">—</span>
              )}
            </div>

            {/* Last seen */}
            <div className="hidden w-28 shrink-0 text-right text-xs text-muted-foreground md:block">
              {lastSeen(row.lastAt || row.createdAt)}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
