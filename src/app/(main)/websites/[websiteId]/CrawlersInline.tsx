'use client';

import { useMemo, useState } from 'react';
import { Bot, Loader2, Sparkles, Search, BrainCircuit, Boxes } from 'lucide-react';
import { useApi } from '@/components/hooks';

interface CrawlerRow {
  day: string;
  name: string;
  company: string;
  category: string;
  count: number;
}

const TABS = [
  { key: 'answers', label: 'AI answers', icon: Sparkles },
  { key: 'indexing', label: 'Indexing', icon: Search },
  { key: 'training', label: 'Training', icon: BrainCircuit },
  { key: 'other', label: 'Other', icon: Boxes },
] as const;

// preview/seo/other roll up into the "Other" tab.
const tabOf = (category: string) =>
  category === 'answers' || category === 'indexing' || category === 'training' ? category : 'other';

const PALETTE = [
  '#8ab4f8',
  '#f59e0b',
  '#34d399',
  '#f472b6',
  '#a78bfa',
  '#fb923c',
  '#22d3ee',
  '#94a3b8',
];
const colorFor = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
};

const fmtDay = (iso: string) =>
  new Date(iso + 'T00:00:00Z').toLocaleDateString('en', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

/** Catmull-Rom → cubic bezier smooth path through the day points. */
function smoothPath(pts: Array<[number, number]>): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

/**
 * Crawler analytics (DataFast-style): bot traffic isn't only blocked — it's
 * classified into AI answers / search indexing / model training and charted,
 * while staying 100% excluded from human visitor metrics.
 */
export function CrawlersInline({ websiteId }: { websiteId: string }) {
  const { get, useQuery } = useApi();
  const { data, isLoading } = useQuery<{ days: number; rows: CrawlerRow[] }>({
    queryKey: ['crawlers', websiteId],
    queryFn: () => get(`/websites/${websiteId}/crawlers`, { days: 7 }),
    staleTime: 60_000,
  });

  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('answers');

  const model = useMemo(() => {
    const rows = data?.rows || [];
    const days = data?.days || 7;
    // last N day keys, oldest → newest
    const dayKeys: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      dayKeys.push(new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10));
    }
    const tabs: Record<
      string,
      { total: number; bots: Map<string, { company: string; total: number; series: number[] }> }
    > = {
      answers: { total: 0, bots: new Map() },
      indexing: { total: 0, bots: new Map() },
      training: { total: 0, bots: new Map() },
      other: { total: 0, bots: new Map() },
    };
    for (const r of rows) {
      const t = tabs[tabOf(r.category)];
      t.total += r.count;
      let bot = t.bots.get(r.name);
      if (!bot) {
        bot = { company: r.company, total: 0, series: new Array(dayKeys.length).fill(0) };
        t.bots.set(r.name, bot);
      }
      bot.total += r.count;
      const di = dayKeys.indexOf(r.day);
      if (di >= 0) bot.series[di] += r.count;
    }
    return { dayKeys, tabs };
  }, [data]);

  const active = model.tabs[tab];
  const ranked = useMemo(
    () => [...active.bots.entries()].sort((a, b) => b[1].total - a[1].total),
    [active],
  );
  const charted = ranked.slice(0, 6);
  const maxY = Math.max(1, ...charted.flatMap(([, b]) => b.series));

  const W = 640;
  const H = 190;
  const PADL = 30;
  const PADB = 22;
  const x = (i: number) => PADL + (i * (W - PADL - 8)) / Math.max(1, model.dayKeys.length - 1);
  const y = (v: number) => 8 + (1 - v / maxY) * (H - PADB - 16);

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const nothingYet = TABS.every(t => model.tabs[t.key].total === 0);

  return (
    <div className="rounded-2xl border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,7%)] p-4">
      {/* header: tabs + badge */}
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map(t => {
          const Icon = t.icon;
          const total = model.tabs[t.key].total;
          const activeTab = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab
                  ? 'border-zinc-600 bg-zinc-800/80 text-white'
                  : 'border-zinc-800 bg-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
              <span className={activeTab ? 'text-zinc-300' : 'text-zinc-500'}>{total}</span>
            </button>
          );
        })}
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-dashed border-zinc-700 px-3 py-1.5 text-xs text-zinc-400">
          <Bot className="h-3.5 w-3.5" /> Crawlers · last 7 days
        </span>
      </div>

      {nothingYet ? (
        <div className="flex h-44 flex-col items-center justify-center gap-1.5 text-center">
          <p className="text-sm font-medium text-zinc-300">No crawler visits recorded yet</p>
          <p className="max-w-md text-xs text-zinc-500">
            When ChatGPT, Googlebot, GPTBot and friends visit your site, they&apos;ll show up here,
            classified by why they came, and always kept out of your visitor metrics.
          </p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-4 lg:flex-row">
          {/* chart */}
          <div className="min-w-0 flex-1">
            {charted.length === 0 ? (
              <div className="flex h-44 items-center justify-center text-xs text-zinc-500">
                No {TABS.find(t => t.key === tab)?.label.toLowerCase()} crawler visits in the last 7
                days.
              </div>
            ) : (
              <svg
                viewBox={`0 0 ${W} ${H}`}
                className="h-48 w-full"
                preserveAspectRatio="none"
                role="img"
                aria-label="Crawler visits per day"
              >
                {[0.25, 0.5, 0.75, 1].map(f => (
                  <g key={f}>
                    <line
                      x1={PADL}
                      x2={W - 8}
                      y1={y(maxY * f)}
                      y2={y(maxY * f)}
                      stroke="rgba(255,255,255,0.07)"
                      strokeDasharray="3 5"
                    />
                    <text
                      x={PADL - 6}
                      y={y(maxY * f) + 3}
                      textAnchor="end"
                      fontSize="9"
                      fill="rgba(255,255,255,0.35)"
                    >
                      {Math.round(maxY * f)}
                    </text>
                  </g>
                ))}
                {charted.map(([name, bot]) => (
                  <path
                    key={name}
                    d={smoothPath(bot.series.map((v, i) => [x(i), y(v)]))}
                    fill="none"
                    stroke={colorFor(name)}
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
                {model.dayKeys.map((d, i) =>
                  i % Math.ceil(model.dayKeys.length / 7) === 0 ? (
                    <text
                      key={d}
                      x={x(i)}
                      y={H - 6}
                      textAnchor="middle"
                      fontSize="9"
                      fill="rgba(255,255,255,0.35)"
                    >
                      {fmtDay(d)}
                    </text>
                  ) : null,
                )}
              </svg>
            )}
          </div>

          {/* ranked list */}
          <div className="w-full shrink-0 rounded-xl border border-zinc-800/70 bg-zinc-950/50 p-2 lg:w-[260px]">
            {ranked.length === 0 ? (
              <div className="p-4 text-center text-xs text-zinc-500">Nothing here yet</div>
            ) : (
              ranked.slice(0, 8).map(([name, bot], i) => (
                <div
                  key={name}
                  className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 ${
                    i === 0 ? 'bg-zinc-800/50' : ''
                  }`}
                >
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-black/80"
                    style={{ background: colorFor(name) }}
                  >
                    {(bot.company || name).slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium text-zinc-200">{name}</div>
                    {bot.company && bot.company !== name ? (
                      <div className="truncate text-[10px] text-zinc-500">{bot.company}</div>
                    ) : null}
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-zinc-200">
                    {bot.total}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <p className="mt-3 text-[11px] text-zinc-600">
        Crawler visits are detected from bot fetches of your pages and tracking script, and are
        always excluded from your visitor metrics.
      </p>
    </div>
  );
}
