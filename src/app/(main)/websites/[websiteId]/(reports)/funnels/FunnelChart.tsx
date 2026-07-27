'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { useSpring, animated, easings } from '@react-spring/web';
import { formatLongNumber, formatShortTime, formatMinorCurrency } from '@/lib/format';
import { biggestLeak, funnelRevenueLost, type FunnelStepRow } from '@/lib/funnel-insights';
import { FunnelLeakDiagnosis } from './FunnelLeakDiagnosis';

const money = (minor: number, currency = 'USD') => formatMinorCurrency(minor, currency);

const dur = (ms: number) => formatShortTime(Math.round(ms / 1000), ['d', 'h', 'm', 's']);

const BAR_AREA = 190; // px height of the column zone

/**
 * Shared funnel visualization: stepped columns on ghost rails — each step is a
 * violet column whose height is the % of step-1 visitors remaining, with the
 * drop between steps labeled at the boundary (the biggest leak in rose, with a
 * dashed divider). Columns stay legible even at brutal drop-offs, unlike the
 * old tapering-ribbon shape, which collapsed into a thread past −90%.
 * Heights are spring-animated so segment/date switches morph instead of swap.
 * Used by saved funnels (Funnel.tsx) and the auto-detected funnel
 * (AutoFunnelInline) so they always look identical.
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
  // Column height as % of the bar area (floor keeps tiny steps visible).
  const heights = rows.map(r => Math.max(Math.min(r.remaining ?? 0, 1) * 100, 2.5));

  // Springs can only morph between same-length arrays — when the step count
  // changes (different funnel entirely) snap instead of interpolating.
  const prevN = useRef(n);
  const lengthChanged = prevN.current !== n;
  useLayoutEffect(() => {
    prevN.current = n;
  });
  const spring = useSpring({
    hs: heights,
    immediate: lengthChanged,
    config: { tension: 170, friction: 26 },
  });

  // Entrance: columns rise + fade in left → right on mount.
  const reveal = useSpring({
    from: { p: 0 },
    to: { p: 1 },
    config: { duration: 700, easing: easings.easeOutCubic },
  });

  // Spring frames can briefly carry the previous array length around a step-
  // count change — every interpolator must fall back to the target values.
  const safeVals = (vals: number[]) => (vals.length === n ? vals : heights);

  if (!rows.length) return null;

  const { index: leakIndex } = biggestLeak(rows);
  const lost = leakIndex > 0 ? funnelRevenueLost(rows, leakIndex) : 0;
  const hasRevenue = rows.some(r => (r.revenue || 0) > 0);

  return (
    <div className="relative animate-in fade-in duration-500">
      {/* Column zone */}
      <animated.div
        className="relative flex items-stretch gap-2.5"
        style={{
          height: BAR_AREA,
          clipPath: reveal.p.to(v => `inset(0 ${(1 - v) * 100}% 0 0)`),
        }}
      >
        {/* boundary drop labels + leak divider (positioned at column gaps) */}
        {rows.map((r, i) => {
          if (i === 0 || !((r.dropped ?? 0) > 0)) return null;
          const left = `${(i / n) * 100}%`;
          const isLeak = i === leakIndex;
          return (
            <div key={`d${i}`}>
              {isLeak ? (
                <div
                  className="pointer-events-none absolute bottom-0 top-6 w-px border-l border-dashed border-rose-400/60"
                  style={{ left }}
                  aria-hidden
                />
              ) : null}
              <div
                className={`pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                  isLeak
                    ? 'bg-rose-500/15 text-rose-300 ring-1 ring-inset ring-rose-500/30'
                    : 'bg-zinc-800/80 text-zinc-400'
                }`}
                style={{ left }}
              >
                −{Math.round(r.dropoff * 100)}%
              </div>
            </div>
          );
        })}

        {rows.map((r, i) => (
          <div
            key={`c${i}`}
            className="relative flex min-w-0 flex-1 flex-col justify-end"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            {/* ghost rail so every column reads against a track */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 top-7 rounded-lg bg-white/[0.025]"
              aria-hidden
            />
            {/* value + count ride on top of the column */}
            <animated.div
              className="relative z-[1] flex flex-col items-center"
              style={{
                marginBottom: 6,
              }}
            >
              <span
                className={`text-sm font-bold tabular-nums ${
                  i === leakIndex ? 'text-rose-300' : 'text-foreground'
                }`}
              >
                {Math.round((r.remaining ?? 0) * 100)}%
              </span>
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {formatLongNumber(r.visitors)} vis
              </span>
            </animated.div>
            <animated.div
              className="relative z-[1] w-full rounded-t-lg bg-gradient-to-b from-[#a78bfa] to-[#6d5bd0] shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
              style={{
                height: spring.hs.to((...vals: number[]) => {
                  const h = safeVals(vals)[i] ?? heights[i];
                  // headroom for the % label above the tallest column
                  return `${(h * (BAR_AREA - 52)) / BAR_AREA}%`;
                }),
                opacity: i === leakIndex ? 0.95 : 1,
              }}
            />
          </div>
        ))}
      </animated.div>

      {/* step labels + per-step revenue / median annotations */}
      <div className="mt-2 flex gap-2.5 border-t border-[hsl(0,0%,12%)] pt-2 animate-in fade-in fill-mode-backwards delay-200 duration-700">
        {rows.map((r, i) => (
          <div key={`l${i}`} className="min-w-0 flex-1 space-y-0.5 text-center">
            <div
              className={`truncate text-xs font-medium ${
                i === leakIndex ? 'text-rose-300' : 'text-foreground/90'
              }`}
              title={r.value}
            >
              {r.value}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-0.5">
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
