'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Globe } from 'lucide-react';
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

// Per-visitor activity graph: 8 dots, filled = visits.
function VisitDots({ visits }: { visits: number }) {
  const on = Math.min(Math.max(visits, 0), 8);
  return (
    <div className="flex gap-1">
      {Array.from({ length: 8 }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 w-1.5 rounded-full ${i < on ? 'bg-[#5e5ba4]' : 'bg-[hsl(0,0%,20%)]'}`}
        />
      ))}
    </div>
  );
}

const ROW = 'flex items-center gap-6 px-7';

export function VisitorsTable({ data }: { data?: any[]; displayMode?: string }) {
  const { formatValue } = useFormat();
  const { updateParams, pathname } = useNavigation();
  const isShare = pathname?.includes('/share/');
  const rows = Array.isArray(data) ? data : [];

  return (
    <div className="divide-y divide-[hsl(0,0%,12%)]">
      {/* Header */}
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/60">
        <div className={`${ROW} py-2`}>
          <div className="flex-1">Visitor</div>
          <div className="hidden items-center gap-7 md:flex">
            <div className="w-[150px]">Source</div>
            <div className="w-[70px] text-right">Spent</div>
            <div className="w-[96px]">Activity</div>
            <div className="w-[120px] text-right">Last seen</div>
          </div>
        </div>
      </div>

      {rows.map((row: any) => {
        const seed = row.distinctId || row.id;
        const spent = Number(row.spentMinor) || 0;
        const views = Number(row.views) || 0;
        const visits = Number(row.visits) || 0;
        const ref = row.referrerDomain as string | undefined;

        // Read-only on the public share: rows aren't clickable (no profile modal).
        const Wrapper: any = isShare ? 'div' : Link;
        const wrapperProps: any = isShare
          ? {}
          : {
              href: updateParams({ session: row.id }),
              className: 'block transition-colors hover:bg-[hsl(0,0%,11%)]',
            };

        return (
          <Wrapper key={row.id} {...wrapperProps}>
            <div className={`${ROW} py-3`}>
              {/* Visitor */}
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar seed={seed} size={36} />
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

              {/* Metrics (desktop) */}
              <div className="hidden items-center gap-7 md:flex">
                {/* Source */}
                <div className="flex w-[150px] min-w-0 items-center gap-2 text-sm text-muted-foreground">
                  {ref ? (
                    <>
                      <SiteIcon domain={ref} name={ref} size={16} />
                      <span className="truncate">{ref}</span>
                    </>
                  ) : (
                    <span className="flex items-center gap-1.5 text-muted-foreground/40">
                      <Globe className="h-3.5 w-3.5" />
                      Direct
                    </span>
                  )}
                </div>
                {/* Spent */}
                <div className="w-[70px] text-right">
                  {spent > 0 ? (
                    <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-sm font-semibold text-emerald-300">
                      {formatMoney(spent, row.spentCurrency)}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground/50">$0</span>
                  )}
                </div>
                {/* Activity */}
                <div className="w-[96px]">
                  <VisitDots visits={visits} />
                  <div className="mt-1.5 text-[11px] text-muted-foreground/40">
                    {visits} visit{visits === 1 ? '' : 's'}
                  </div>
                </div>
                {/* Last seen */}
                <div className="w-[120px] text-right">
                  <div className="text-xs text-muted-foreground">
                    {lastSeen(row.lastAt || row.createdAt)}
                  </div>
                  {views > 0 && (
                    <div className="text-[11px] text-muted-foreground/40">
                      {views} view{views === 1 ? '' : 's'}
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile: last seen only */}
              <div className="text-right md:hidden">
                <div className="text-xs text-muted-foreground">
                  {lastSeen(row.lastAt || row.createdAt)}
                </div>
              </div>
            </div>
          </Wrapper>
        );
      })}
    </div>
  );
}
