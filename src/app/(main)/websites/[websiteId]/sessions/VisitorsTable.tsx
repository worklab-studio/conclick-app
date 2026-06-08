'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { useFormat, useNavigation } from '@/components/hooks';
import { Avatar } from '@/components/common/Avatar';
import { TypeIcon } from '@/components/common/TypeIcon';
import { SiteIcon } from '@/app/(main)/websites/SiteIcon';
import { friendlyName } from '@/lib/friendly-name';

// pg returns bigint as string → Number() it. Amounts are minor units (cents).
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

// Shared column template so the header lines up with every row.
const GRID =
  'grid grid-cols-[1fr_auto] md:grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_110px_150px] items-center gap-4 px-4';

export function VisitorsTable({ data }: { data?: any[]; displayMode?: string }) {
  const { formatValue } = useFormat();
  const { updateParams } = useNavigation();
  const rows = Array.isArray(data) ? data : [];

  return (
    <div className="divide-y divide-[hsl(0,0%,12%)]">
      <div
        className={`${GRID} py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/60`}
      >
        <div>Visitor</div>
        <div className="hidden md:block">Source</div>
        <div className="hidden text-right md:block">Spent</div>
        <div className="text-right">Last seen</div>
      </div>

      {rows.map((row: any) => {
        const seed = row.distinctId || row.id;
        const spent = Number(row.spentMinor) || 0;
        const views = Number(row.views) || 0;
        const ref = row.referrerDomain as string | undefined;

        return (
          <Link
            key={row.id}
            href={updateParams({ session: row.id })}
            className={`${GRID} py-3 transition-colors hover:bg-[hsl(0,0%,11%)]`}
          >
            {/* Visitor */}
            <div className="flex min-w-0 items-center gap-3">
              <Avatar seed={seed} size={38} />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold capitalize text-foreground">
                  {friendlyName(seed)}
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

            {/* Source (entry referrer) */}
            <div className="hidden min-w-0 items-center gap-2 text-sm text-muted-foreground md:flex">
              {ref ? (
                <>
                  <SiteIcon domain={ref} name={ref} size={16} />
                  <span className="truncate">{ref}</span>
                </>
              ) : (
                <span className="text-muted-foreground/40">Direct</span>
              )}
            </div>

            {/* Spent */}
            <div className="hidden text-right md:block">
              {spent > 0 ? (
                <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-sm font-semibold text-emerald-300">
                  {formatMoney(spent, row.spentCurrency)}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground/40">—</span>
              )}
            </div>

            {/* Last seen */}
            <div className="text-right">
              <div className="text-xs text-muted-foreground">
                {lastSeen(row.lastAt || row.createdAt)}
              </div>
              {views > 0 && (
                <div className="text-[11px] text-muted-foreground/40">
                  {views} view{views === 1 ? '' : 's'}
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
