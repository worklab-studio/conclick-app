'use client';

import { useState } from 'react';
import { Dialog } from '@umami/react-zen';
import { useMessages, useResultQuery } from '@/components/hooks';
import { LoadingPanel } from '@/components/common/LoadingPanel';
import { formatLongNumber } from '@/lib/format';
import { ReportEditButton } from '@/components/input/ReportEditButton';
import { FunnelEditForm } from './FunnelEditForm';

type FunnelResult = {
  type: string;
  value: string;
  visitors: number;
  previous: number;
  dropped: number;
  dropoff: number;
  remaining: number;
};

export function Funnel({ id, name, type, parameters, websiteId }: any) {
  const { formatMessage, labels } = useMessages();
  const { data, error, isLoading } = useResultQuery(type, {
    websiteId,
    ...parameters,
  });
  const rows = (data as FunnelResult[]) || [];

  return (
    <LoadingPanel data={data} isLoading={isLoading} error={error}>
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="truncate text-[15px] font-semibold text-foreground">{name}</div>
          <ReportEditButton id={id} name={name} type={type}>
            {({ close }: { close: () => void }) => (
              <Dialog
                title={formatMessage(labels.funnel)}
                variant="modal"
                style={{ minHeight: 300, minWidth: 400 }}
              >
                <FunnelEditForm id={id} websiteId={websiteId} onClose={close} />
              </Dialog>
            )}
          </ReportEditButton>
        </div>
        {rows.length > 0 ? <FunnelRibbon rows={rows} /> : null}
      </div>
    </LoadingPanel>
  );
}

// Datafast-style flowing ribbon funnel. Bands taper smoothly step→step; the % of
// the original remaining is the band thickness. Brighter violet, one subtle echo
// layer, drop-off shown between steps, visitor counts on hover.
function FunnelRibbon({ rows }: { rows: FunnelResult[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const W = 1000;
  const H = 300;
  const n = rows.length;
  const segW = W / n;
  const k = Math.min(segW * 0.3, 90);
  const maxT = H * 0.76;
  const minT = 10;
  const t = rows.map(r => Math.max(Math.min(r.remaining, 1) * maxT, minT));
  const cx = rows.map((_, i) => segW * i + segW / 2);

  const ribbon = (mult: number) => {
    const thick = t.map(v => Math.min(v * mult, H - 6));
    const yt = thick.map(v => (H - v) / 2);
    const yb = thick.map(v => (H + v) / 2);
    let d = `M 0 ${yt[0]}`;
    for (let i = 0; i < n; i++) {
      const bx = segW * (i + 1);
      d += ` L ${i === n - 1 ? W : bx - k} ${yt[i]}`;
      if (i < n - 1)
        d += ` C ${bx - k / 2} ${yt[i]} ${bx + k / 2} ${yt[i + 1]} ${bx + k} ${yt[i + 1]}`;
    }
    d += ` L ${W} ${yb[n - 1]}`;
    for (let i = n - 1; i >= 0; i--) {
      const bx = segW * i;
      d += ` L ${i === 0 ? 0 : bx + k} ${yb[i]}`;
      if (i > 0) d += ` C ${bx + k / 2} ${yb[i]} ${bx - k / 2} ${yb[i - 1]} ${bx - k} ${yb[i - 1]}`;
    }
    return d + ' Z';
  };

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        preserveAspectRatio="none"
        style={{ height: 'auto' }}
      >
        <defs>
          <linearGradient id="funnel-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#8b5cf6" />
            <stop offset="1" stopColor="#a78bfa" />
          </linearGradient>
        </defs>

        {/* one subtle echo layer */}
        <path d={ribbon(1.12)} fill="#8b5cf6" opacity={0.1} />
        <path d={ribbon(1)} fill="url(#funnel-grad)" />

        {/* drop-off between steps */}
        {rows.map((r, i) =>
          i === 0 || !(r.dropped > 0) ? null : (
            <text
              key={`d${i}`}
              x={segW * i}
              y={(H - t[i - 1]) / 2 - 9}
              textAnchor="middle"
              fontSize="12.5"
              fill="#8b8b93"
            >
              −{Math.round(r.dropoff * 100)}%
            </text>
          ),
        )}

        {/* % pill per step */}
        {rows.map((r, i) => {
          const label = `${Math.round(r.remaining * 100)}%`;
          const pw = 26 + label.length * 11;
          return (
            <g key={`p${i}`} transform={`translate(${cx[i] - pw / 2}, ${H / 2 - 17})`}>
              <rect width={pw} height="34" rx="17" fill="#101013" stroke="hsl(0 0% 22%)" />
              <text
                x={pw / 2}
                y="22"
                textAnchor="middle"
                fontSize="15"
                fontWeight="700"
                fill="#fff"
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* hover hit areas */}
        {rows.map((_, i) => (
          <rect
            key={`h${i}`}
            x={segW * i}
            y={0}
            width={segW}
            height={H}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>

      {/* step labels */}
      <div className="mt-2 flex">
        {rows.map((r, i) => (
          <div key={`l${i}`} className="min-w-0 flex-1 px-1 text-center">
            <div className="truncate text-xs font-medium text-foreground/90" title={r.value}>
              {r.value}
            </div>
          </div>
        ))}
      </div>

      {/* hover tooltip — visitor counts live here to keep the chart clean */}
      {hover !== null ? (
        <div
          className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-[hsl(0,0%,16%)] bg-[hsl(0,0%,10%)] px-3 py-2 text-xs shadow-xl"
          style={{ left: `${(cx[hover] / W) * 100}%` }}
        >
          <div className="font-semibold text-foreground">{rows[hover].value}</div>
          <div className="mt-0.5 text-muted-foreground">
            {formatLongNumber(rows[hover].visitors)} visitors ·{' '}
            {Math.round(rows[hover].remaining * 100)}%
          </div>
          {hover > 0 && rows[hover].dropped > 0 ? (
            <div className="text-red-400/80">
              −{formatLongNumber(rows[hover].dropped)} dropped (
              {Math.round(rows[hover].dropoff * 100)}%)
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
