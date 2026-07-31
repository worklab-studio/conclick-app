'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { useSpring, animated, easings } from '@react-spring/web';
import { formatLongNumber, formatShortTime, formatMinorCurrency } from '@/lib/format';
import { biggestLeak, funnelRevenueLost, type FunnelStepRow } from '@/lib/funnel-insights';
import { FunnelLeakDiagnosis } from './FunnelLeakDiagnosis';

const money = (minor: number, currency = 'USD') => formatMinorCurrency(minor, currency);

const dur = (ms: number) => formatShortTime(Math.round(ms / 1000), ['d', 'h', 'm', 's']);

// SVG viewBox space — stretched to full width (all text lives in HTML overlays
// so nothing distorts).
const W = 1000;
const H = 240;
const MIN_FRAC = 0.035; // the tail band never collapses below this

// Blue ramp across segments: deep slate → pale sky (the DataFast liquid look).
const C0 = [45, 76, 105];
const C1 = [166, 214, 245];
const rampColor = (t: number, alpha = 1) => {
  const c = C0.map((v, i) => Math.round(v + (C1[i] - v) * t));
  return `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
};

/**
 * Liquid funnel: one continuous stream flowing left → right, vertically
 * centered. Each step's column morphs the stream from its height to the next
 * step's height with an S-curve (horizontal tangents at both ends), and the
 * final step runs as a thin band to the right edge. Drop pills sit on the
 * center line at each boundary; the biggest leak is highlighted in rose.
 * Heights are spring-animated so segment/date switches morph instead of swap.
 */
export function FunnelChart({
  rows,
  currency = 'USD',
  websiteId,
  diagnosisOpen = false,
}: {
  rows: FunnelStepRow[];
  currency?: string;
  websiteId?: string;
  diagnosisOpen?: boolean;
}) {
  const [hoverIndex, setHover] = useState<number | null>(null);
  // With keepPreviousData the chart stays mounted while rows are swapped — a
  // hovered segment can disappear without ever firing mouseleave, so clamp.
  const hover = hoverIndex !== null && hoverIndex < rows.length ? hoverIndex : null;

  const n = rows.length;
  // Stream height per step as a fraction of the drawable height.
  const fracs = rows.map(r => Math.max(Math.min(r.remaining ?? 0, 1), MIN_FRAC));

  // Springs can only morph between same-length arrays — when the step count
  // changes (different funnel entirely) snap instead of interpolating.
  const prevN = useRef(n);
  const lengthChanged = prevN.current !== n;
  useLayoutEffect(() => {
    prevN.current = n;
  });
  const spring = useSpring({
    fs: fracs,
    immediate: lengthChanged,
    config: { tension: 170, friction: 26 },
  });

  // Entrance: the stream reveals left → right on mount.
  const reveal = useSpring({
    from: { p: 0 },
    to: { p: 1 },
    config: { duration: 700, easing: easings.easeOutCubic },
  });

  // Spring frames can briefly carry the previous array length around a step-
  // count change — every interpolator must fall back to the target values.
  const safeVals = (vals: number[]) => (vals.length === n ? vals : fracs);

  if (!rows.length) return null;

  const { index: leakIndex } = biggestLeak(rows);
  const lost = leakIndex > 0 ? funnelRevenueLost(rows, leakIndex) : 0;
  const hasRevenue = rows.some(r => (r.revenue || 0) > 0);
  const conversion = (rows[n - 1].remaining ?? 0) * 100;

  const colX = (i: number) => (i / n) * W;

  // One segment of the stream: column i morphs frac_i → frac_next.
  const segPath = (vals: number[], i: number) => {
    const cy = H / 2;
    const h0 = vals[i] * (H - 8);
    const h1 = (i < n - 1 ? vals[i + 1] : vals[i]) * (H - 8);
    const x0 = colX(i);
    const x1 = i < n - 1 ? colX(i + 1) : W;
    const mx = (x0 + x1) / 2;
    const t0 = cy - h0 / 2;
    const t1 = cy - h1 / 2;
    const b0 = cy + h0 / 2;
    const b1 = cy + h1 / 2;
    return (
      `M ${x0} ${t0} C ${mx} ${t0}, ${mx} ${t1}, ${x1} ${t1} ` +
      `L ${x1} ${b1} C ${mx} ${b1}, ${mx} ${b0}, ${x0} ${b0} Z`
    );
  };

  return (
    <div className="relative animate-in fade-in duration-500">
      {/* conversion headline (top-right, like a report stamp) */}
      <div className="pointer-events-none absolute right-1 top-0 z-10 text-right">
        <div className="text-base font-bold tabular-nums text-foreground">
          {conversion < 10 ? conversion.toFixed(1) : Math.round(conversion)}% conversion
        </div>
        <div className="text-[11px] text-muted-foreground">
          of {formatLongNumber(rows[0].visitors)} visitors
        </div>
      </div>

      {/* stream zone */}
      <animated.div
        className="relative"
        style={{
          height: H,
          clipPath: reveal.p.to(v => `inset(0 ${(1 - v) * 100}% 0 0)`),
        }}
      >
        {/* faint column guides */}
        {rows.map((_, i) =>
          i > 0 ? (
            <div
              key={`g${i}`}
              className="pointer-events-none absolute bottom-0 top-0 w-px bg-white/[0.05]"
              style={{ left: `${(i / n) * 100}%` }}
              aria-hidden
            />
          ) : null,
        )}

        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          {rows.map((_, i) => (
            <animated.path
              key={`s${i}`}
              d={spring.fs.to((...vals: number[]) => segPath(safeVals(vals), i))}
              fill={rampColor(n > 1 ? i / (n - 1) : 0, 0.92)}
              stroke="rgba(190,225,255,0.18)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        {/* hover hitboxes (one per column) */}
        {rows.map((_, i) => (
          <div
            key={`h${i}`}
            className="absolute bottom-0 top-0"
            style={{ left: `${(i / n) * 100}%`, width: `${100 / n}%` }}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}

        {/* drop pills on the center line + leak divider */}
        {rows.map((r, i) => {
          if (i === 0 || !((r.dropped ?? 0) > 0)) return null;
          const left = `${(i / n) * 100}%`;
          const isLeak = i === leakIndex;
          return (
            <div key={`d${i}`}>
              {isLeak ? (
                <div
                  className="pointer-events-none absolute bottom-2 top-2 w-px border-l border-dashed border-rose-400/60"
                  style={{ left }}
                  aria-hidden
                />
              ) : null}
              <div
                className={`pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums backdrop-blur-sm ${
                  isLeak
                    ? 'bg-rose-500/20 text-rose-200 ring-1 ring-inset ring-rose-500/40'
                    : 'bg-zinc-900/80 text-zinc-300 ring-1 ring-inset ring-white/10'
                }`}
                style={{ left, top: '50%' }}
              >
                −{Math.round(r.dropoff * 100)}% →
              </div>
            </div>
          );
        })}
      </animated.div>

      {/* step labels: bold count over name (left-aligned per column) */}
      <div className="mt-2 flex border-t border-[hsl(0,0%,12%)] pt-2.5 animate-in fade-in fill-mode-backwards delay-200 duration-700">
        {rows.map((r, i) => (
          <div key={`l${i}`} className="min-w-0 flex-1 space-y-0.5 pr-2">
            <div
              className={`text-sm font-bold tabular-nums ${
                i === leakIndex ? 'text-rose-300' : 'text-foreground'
              }`}
            >
              {formatLongNumber(r.visitors)} visitor{r.visitors === 1 ? '' : 's'}
            </div>
            <div className="truncate text-xs text-muted-foreground" title={r.value}>
              {r.value}
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {(r.revenue || 0) > 0 ? (
                <span className="inline-flex items-center rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                  {money(r.revenue || 0, currency)}
                </span>
              ) : null}
              {i > 0 && r.medianMs != null ? (
                <span className="text-[10px] text-muted-foreground/60">{dur(r.medianMs)}</span>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {/* biggest-leak card (summary header + diagnosis) */}
      {leakIndex > 0 ? (
        <FunnelLeakDiagnosis
          websiteId={websiteId}
          prevStep={rows[leakIndex - 1]}
          leakStep={rows[leakIndex]}
          lost={hasRevenue ? lost : 0}
          currency={currency}
          defaultOpen={diagnosisOpen}
        />
      ) : null}

      {/* hover tooltip */}
      {hover !== null ? (
        <div
          className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-[hsl(0,0%,16%)] bg-[hsl(0,0%,10%)] px-3 py-2 text-xs shadow-xl"
          style={{ left: `${((hover + 0.5) / n) * 100}%` }}
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
