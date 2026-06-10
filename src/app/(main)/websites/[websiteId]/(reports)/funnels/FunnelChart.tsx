'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { formatLongNumber, formatShortTime } from '@/lib/format';
import { biggestLeak, funnelRevenueLost, type FunnelStepRow } from '@/lib/funnel-insights';
import { FunnelLeakDiagnosis } from './FunnelLeakDiagnosis';

function money(minor: number, currency = 'USD') {
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

const dur = (ms: number) => formatShortTime(Math.round(ms / 1000), ['d', 'h', 'm', 's']);

// Shared funnel visualization: a flowing violet ribbon (thickness = % remaining),
// per-step conversion / revenue / median-time annotations, and the biggest leak
// highlighted in amber with an estimated "$ left on the table" callout. Used by both
// saved funnels (Funnel.tsx) and the auto-detected funnel (AutoFunnelInline) so they
// always look identical.
export function FunnelChart({
  rows,
  currency = 'USD',
  websiteId,
}: {
  rows: FunnelStepRow[];
  currency?: string;
  websiteId?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);

  if (!rows.length) return null;

  const { index: leakIndex } = biggestLeak(rows);
  const lost = leakIndex > 0 ? funnelRevenueLost(rows, leakIndex) : 0;
  const hasRevenue = rows.some(r => (r.revenue || 0) > 0);

  const W = 1000;
  const H = 300;
  const n = rows.length;
  const segW = W / n;
  const k = Math.min(segW * 0.3, 90);
  const maxT = H * 0.76;
  const minT = 10;
  const t = rows.map(r => Math.max(Math.min(r.remaining ?? 0, 1) * maxT, minT));
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

        <path d={ribbon(1.12)} fill="#8b5cf6" opacity={0.1} />
        <path d={ribbon(1)} fill="url(#funnel-grad)" />

        {/* amber marker at the biggest-leak boundary */}
        {leakIndex > 0 ? (
          <line
            x1={segW * leakIndex}
            y1={6}
            x2={segW * leakIndex}
            y2={H - 6}
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="5 5"
            opacity={0.7}
          />
        ) : null}

        {/* drop-off between steps (the leak one is amber) */}
        {rows.map((r, i) =>
          i === 0 || !((r.dropped ?? 0) > 0) ? null : (
            <text
              key={`d${i}`}
              x={segW * i}
              y={(H - t[i - 1]) / 2 - 9}
              textAnchor="middle"
              fontSize="12.5"
              fontWeight={i === leakIndex ? 700 : 400}
              fill={i === leakIndex ? '#f59e0b' : '#8b8b93'}
            >
              −{Math.round(r.dropoff * 100)}%
            </text>
          ),
        )}

        {/* % pill per step */}
        {rows.map((r, i) => {
          const label = `${Math.round((r.remaining ?? 0) * 100)}%`;
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

      {/* step labels + per-step revenue / median annotations */}
      <div className="mt-2 flex">
        {rows.map((r, i) => (
          <div key={`l${i}`} className="min-w-0 flex-1 space-y-1 px-1 text-center">
            <div
              className={`truncate text-xs font-medium ${
                i === leakIndex ? 'text-amber-300' : 'text-foreground/90'
              }`}
              title={r.value}
            >
              {r.value}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {formatLongNumber(r.visitors)} vis
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1">
              {(r.revenue || 0) > 0 ? (
                <span className="inline-flex items-center rounded bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                  {money(r.revenue || 0, currency)}
                </span>
              ) : null}
              {i > 0 && r.medianMs != null ? (
                <span className="text-[11px] text-muted-foreground/60">{dur(r.medianMs)}</span>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {/* biggest-leak callout */}
      {leakIndex > 0 ? (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.07] px-3 py-2 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div className="text-amber-200/90">
            Biggest leak: <span className="font-semibold">{rows[leakIndex - 1].value}</span> →{' '}
            <span className="font-semibold">{rows[leakIndex].value}</span> ·{' '}
            <span className="font-semibold">
              {Math.round((rows[leakIndex].dropoff || 0) * 100)}% drop
            </span>
            {hasRevenue && lost > 0 ? (
              <>
                {' '}
                · ≈<span className="font-semibold">{money(lost, currency)}</span> left on the table
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {websiteId && leakIndex > 0 ? (
        <FunnelLeakDiagnosis
          websiteId={websiteId}
          prevStep={rows[leakIndex - 1]}
          leakStep={rows[leakIndex]}
        />
      ) : null}

      {/* hover tooltip */}
      {hover !== null ? (
        <div
          className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-[hsl(0,0%,16%)] bg-[hsl(0,0%,10%)] px-3 py-2 text-xs shadow-xl"
          style={{ left: `${(cx[hover] / W) * 100}%` }}
        >
          <div className="font-semibold text-foreground">{rows[hover].value}</div>
          <div className="mt-0.5 text-muted-foreground">
            {formatLongNumber(rows[hover].visitors)} visitors ·{' '}
            {Math.round((rows[hover].remaining ?? 0) * 100)}%
          </div>
          {(rows[hover].revenue || 0) > 0 ? (
            <div className="text-emerald-300/90">
              {money(rows[hover].revenue || 0, currency)} revenue
            </div>
          ) : null}
          {hover > 0 && rows[hover].medianMs != null ? (
            <div className="text-muted-foreground/70">
              median {dur(rows[hover].medianMs as number)} from start
            </div>
          ) : null}
          {hover > 0 && (rows[hover].dropped ?? 0) > 0 ? (
            <div className="text-red-400/80">
              −{formatLongNumber(rows[hover].dropped ?? 0)} dropped (
              {Math.round((rows[hover].dropoff || 0) * 100)}%)
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
