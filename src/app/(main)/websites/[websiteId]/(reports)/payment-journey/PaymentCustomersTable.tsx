'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { useFormat, useNavigation } from '@/components/hooks';
import { Avatar } from '@/components/common/Avatar';
import { TypeIcon } from '@/components/common/TypeIcon';
import { friendlyName } from '@/lib/friendly-name';

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

// first touch -> first payment, in human terms ("3 minutes", "13 days").
function humanizeDuration(secsRaw: any) {
  const secs = Number(secsRaw);
  if (!secs || secs < 0 || isNaN(secs)) return '—';
  const units: [string, number][] = [
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [name, size] of units) {
    if (secs >= size) {
      const n = Math.round(secs / size);
      return `${n} ${name}${n === 1 ? '' : 's'}`;
    }
  }
  return '< 1 min';
}

function formatCompletedAt(value: any) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return format(d, "MMM d 'at' h:mm a");
}

// Full-width rows, content centered to match the Visitors list.
const INNER = 'mx-auto flex w-full max-w-[1080px] items-center gap-4 px-7';

export function PaymentCustomersTable({ data }: { data?: any[]; displayMode?: string }) {
  const { formatValue } = useFormat();
  const { updateParams } = useNavigation();
  const rows = Array.isArray(data) ? data : [];

  return (
    <div className="divide-y divide-[hsl(0,0%,12%)]">
      {/* header */}
      <div className="hidden text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70 md:block">
        <div className={`${INNER} py-2`}>
          <div className="flex-1">Customer</div>
          <div className="w-24 text-right">Spent</div>
          <div className="w-28 text-right">Time to pay</div>
          <div className="w-32 text-right">Completed</div>
        </div>
      </div>

      {rows.map((row: any) => {
        const seed = row.distinctId || row.id;
        return (
          <Link
            key={row.id}
            href={updateParams({ session: row.id })}
            className="block transition-colors hover:bg-[hsl(0,0%,11%)]"
          >
            <div className={`${INNER} py-3`}>
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar seed={seed} size={36} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold capitalize text-foreground">
                      {friendlyName(seed)}
                    </span>
                    <span className="shrink-0 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-400 ring-1 ring-inset ring-amber-500/20">
                      Customer
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
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
              </div>

              {/* Spent */}
              <div className="w-24 shrink-0 text-right">
                <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-sm font-semibold text-emerald-300">
                  {formatMoney(row.spentMinor, row.spentCurrency)}
                </span>
              </div>

              {/* Time to complete */}
              <div className="hidden w-28 shrink-0 text-right text-xs text-muted-foreground sm:block">
                {humanizeDuration(row.secondsToComplete)}
              </div>

              {/* Completed at */}
              <div className="hidden w-32 shrink-0 text-right text-xs text-muted-foreground md:block">
                {formatCompletedAt(row.completedAt)}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
