'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Globe, MousePointerClick, Sparkles, TrendingDown } from 'lucide-react';

/**
 * First screen for a brand new personal account.
 *
 * The previous version described four features in prose. That is the wrong
 * register for this product: the whole argument is visual, so the panel now
 * plays a small looping preview of the real surfaces instead of writing about
 * them. It is the only thing on this page that proves anything before install.
 */

const SCENE_MS = 4200;

function GlobeScene() {
  // Latitudes are flattened ellipses clipped to the sphere, which reads as
  // curvature at this size without the cost of a real projection.
  const lats = [-60, -30, 0, 30, 60].map(dy => ({ dy, rx: Math.sqrt(92 * 92 - dy * dy) }));
  const pins = [
    { x: 168, y: 92, delay: '0s' },
    { x: 232, y: 132, delay: '0.7s' },
    { x: 196, y: 168, delay: '1.4s' },
  ];

  return (
    <svg viewBox="0 0 400 240" className="h-full w-full">
      <defs>
        <radialGradient id="cc-globe" cx="34%" cy="28%" r="78%">
          <stop offset="0%" stopColor="#32315e" />
          <stop offset="100%" stopColor="#101021" />
        </radialGradient>
        <clipPath id="cc-globe-clip">
          <circle cx="200" cy="120" r="92" />
        </clipPath>
      </defs>

      <circle cx="200" cy="120" r="104" fill="#5e5ba4" opacity="0.07" />
      <circle cx="200" cy="120" r="92" fill="url(#cc-globe)" />

      <g clipPath="url(#cc-globe-clip)" stroke="#b9b5f0" strokeOpacity="0.16" fill="none">
        {lats.map(({ dy, rx }) => (
          <ellipse key={dy} cx="200" cy={120 + dy} rx={rx} ry={rx * 0.17} />
        ))}
        {[26, 56, 86].map(rx => (
          <ellipse key={rx} cx="200" cy="120" rx={rx} ry="92" />
        ))}
        <line x1="200" y1="28" x2="200" y2="212" />
      </g>

      <circle cx="200" cy="120" r="92" fill="none" stroke="#b9b5f0" strokeOpacity="0.28" />

      {pins.map(({ x, y, delay }) => (
        <g key={`${x}-${y}`}>
          <circle
            cx={x}
            cy={y}
            r="4"
            fill="#b9b5f0"
            className="cc-ping"
            style={{ animationDelay: delay }}
          />
          <circle cx={x} cy={y} r="2.6" fill="#fff" />
        </g>
      ))}

      <g className="cc-fade-up">
        <rect
          x="238"
          y="150"
          width="132"
          height="40"
          rx="8"
          fill="#17172b"
          stroke="#5e5ba4"
          strokeOpacity="0.4"
        />
        <circle cx="254" cy="170" r="6" fill="#5e5ba4" />
        <rect x="268" y="161" width="62" height="6" rx="3" fill="#cdcbe8" opacity="0.85" />
        <rect x="268" y="173" width="86" height="5" rx="2.5" fill="#8f8cae" opacity="0.7" />
      </g>
    </svg>
  );
}

function FunnelScene() {
  const steps = [
    { w: 320, label: 84 },
    { w: 236, label: 62 },
    { w: 96, label: 25 },
    { w: 68, label: 18 },
  ];

  return (
    <svg viewBox="0 0 400 240" className="h-full w-full">
      <defs>
        <linearGradient id="cc-fun" x1="0" x2="1">
          <stop offset="0%" stopColor="#6b68bd" />
          <stop offset="100%" stopColor="#4a4884" />
        </linearGradient>
      </defs>

      {steps.map((s, i) => (
        <g key={i}>
          <rect
            x="40"
            y={30 + i * 50}
            width="320"
            height="30"
            rx="6"
            fill="#ffffff"
            opacity="0.04"
          />
          <rect
            x="40"
            y={30 + i * 50}
            width={s.w}
            height="30"
            rx="6"
            fill="url(#cc-fun)"
            className="cc-grow"
            style={{ animationDelay: `${i * 140}ms`, transformOrigin: '40px 0' }}
          />
          <text x="52" y={50 + i * 50} fill="#e6e5f5" fontSize="11.5" fontWeight="600">
            {s.label}%
          </text>
        </g>
      ))}

      <g className="cc-fade-up" style={{ animationDelay: '700ms' }}>
        <rect
          x="150"
          y="126"
          width="104"
          height="26"
          rx="6"
          fill="#3a1f2b"
          stroke="#c2607a"
          strokeOpacity="0.5"
        />
        <text x="202" y="143" fill="#f0a8ba" fontSize="11" fontWeight="600" textAnchor="middle">
          61% lost here
        </text>
      </g>
    </svg>
  );
}

function ClickMapScene() {
  const blobs = [
    { x: 300, y: 176, r: 46, o: 0.95 },
    { x: 132, y: 96, r: 34, o: 0.5 },
    { x: 250, y: 60, r: 26, o: 0.32 },
  ];

  return (
    <svg viewBox="0 0 400 240" className="h-full w-full">
      <defs>
        <radialGradient id="cc-heat">
          <stop offset="0%" stopColor="#ff8a5c" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#c2607a" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#5e5ba4" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect x="40" y="24" width="320" height="192" rx="10" fill="#ffffff" opacity="0.035" />
      <rect x="40" y="24" width="320" height="26" rx="10" fill="#ffffff" opacity="0.05" />
      <circle cx="56" cy="37" r="3.4" fill="#6d6b8a" />
      <circle cx="68" cy="37" r="3.4" fill="#6d6b8a" />
      <rect x="60" y="72" width="150" height="12" rx="4" fill="#8f8cae" opacity="0.55" />
      <rect x="60" y="92" width="210" height="8" rx="4" fill="#6d6b8a" opacity="0.45" />
      <rect x="60" y="108" width="176" height="8" rx="4" fill="#6d6b8a" opacity="0.45" />
      <rect x="60" y="140" width="120" height="52" rx="6" fill="#ffffff" opacity="0.04" />
      <rect x="252" y="160" width="96" height="32" rx="7" fill="#5e5ba4" opacity="0.85" />
      <rect x="268" y="173" width="64" height="6" rx="3" fill="#e6e5f5" opacity="0.9" />

      {blobs.map(({ x, y, r, o }, i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={r}
          fill="url(#cc-heat)"
          opacity={o}
          className="cc-pulse"
          style={{ animationDelay: `${i * 500}ms` }}
        />
      ))}
    </svg>
  );
}

function CrawlerScene() {
  const rows = [
    { name: 'ChatGPT', tag: 'Answers', tone: '#7ecfa8', hits: '412' },
    { name: 'Claude', tag: 'Answers', tone: '#7ecfa8', hits: '268' },
    { name: 'Googlebot', tag: 'Indexing', tone: '#8fb6f0', hits: '1,904' },
    { name: 'GPTBot', tag: 'Training', tone: '#d6a86a', hits: '77' },
  ];

  return (
    <svg viewBox="0 0 400 240" className="h-full w-full">
      {rows.map((r, i) => (
        <g key={r.name} className="cc-fade-up" style={{ animationDelay: `${i * 130}ms` }}>
          <rect
            x="40"
            y={30 + i * 48}
            width="320"
            height="38"
            rx="8"
            fill="#ffffff"
            opacity="0.035"
          />
          <circle cx="62" cy={49 + i * 48} r="7" fill={r.tone} opacity="0.28" />
          <circle cx="62" cy={49 + i * 48} r="3" fill={r.tone} />
          <text x="80" y={53 + i * 48} fill="#e6e5f5" fontSize="12" fontWeight="600">
            {r.name}
          </text>
          <rect
            x="196"
            y={40 + i * 48}
            width="62"
            height="18"
            rx="9"
            fill={r.tone}
            opacity="0.16"
          />
          <text
            x="227"
            y={53 + i * 48}
            fill={r.tone}
            fontSize="10"
            fontWeight="600"
            textAnchor="middle"
          >
            {r.tag}
          </text>
          <text x="348" y={53 + i * 48} fill="#8f8cae" fontSize="11.5" textAnchor="end">
            {r.hits}
          </text>
        </g>
      ))}
    </svg>
  );
}

const SCENES = [
  {
    icon: Globe,
    title: 'Live visitors on a globe',
    body: 'Watch people land on your site in real time, with where they came from.',
    render: GlobeScene,
  },
  {
    icon: TrendingDown,
    title: 'Funnels that name the leak',
    body: 'See the exact step losing you money, not just that something dropped.',
    render: FunnelScene,
  },
  {
    icon: MousePointerClick,
    title: 'Click maps on your real pages',
    body: 'Every click recorded automatically, with no tagging work from you.',
    render: ClickMapScene,
  },
  {
    icon: Sparkles,
    title: 'AI answers and crawlers',
    body: 'Know when ChatGPT and Google cite you, kept separate from real people.',
    render: CrawlerScene,
  },
];

export function OnboardingEmptyState() {
  const router = useRouter();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => setActive(i => (i + 1) % SCENES.length), SCENE_MS);
    return () => clearInterval(timer);
  }, [paused]);

  const Scene = SCENES[active].render;
  const ActiveIcon = SCENES[active].icon;

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-white/[0.07] bg-[hsl(0,0%,6.5%)]">
      <style>{`
        @keyframes cc-ping { 0%,100% { r:4; opacity:.9 } 50% { r:9; opacity:.15 } }
        @keyframes cc-fade-up { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }
        @keyframes cc-grow { from { transform:scaleX(.2) } to { transform:scaleX(1) } }
        @keyframes cc-pulse { 0%,100% { transform:scale(1); opacity:.85 } 50% { transform:scale(1.08); opacity:1 } }
        .cc-ping { animation: cc-ping 2.4s ease-in-out infinite }
        .cc-fade-up { animation: cc-fade-up .5s ease-out both }
        .cc-grow { animation: cc-grow .55s cubic-bezier(.2,.8,.3,1) both }
        .cc-pulse { animation: cc-pulse 3s ease-in-out infinite; transform-origin: center }
        @media (prefers-reduced-motion: reduce) {
          .cc-ping, .cc-fade-up, .cc-grow, .cc-pulse { animation: none !important }
        }
      `}</style>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        {/* pitch + CTA */}
        <div className="relative overflow-hidden p-8 sm:p-10 lg:flex lg:flex-col lg:justify-center">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(620px 280px at 10% 0%, rgba(94,91,164,0.18), transparent 66%)',
            }}
          />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#5e5ba4]/30 bg-[#5e5ba4]/15 px-2.5 py-1 text-[11px] font-medium text-[#c7c5ec]">
              <Sparkles className="h-3 w-3" /> Takes about two minutes
            </span>

            <h2 className="mt-4 text-[28px] font-bold leading-tight tracking-tight text-white sm:text-[32px]">
              Let us read your site
              <br />
              and set itself up.
            </h2>
            <p className="mt-3 max-w-[420px] text-[15px] leading-relaxed text-zinc-400">
              Type your domain and Conclick finds the buttons and pages worth measuring, detects
              what you are built on, and maps your first funnel. Nothing to install to see it.
            </p>

            <button
              type="button"
              onClick={() => router.push('/websites?setup=1', { scroll: false })}
              className="mt-7 inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60"
            >
              Analyze my website <ArrowRight className="h-4 w-4" />
            </button>

            <p className="mt-3 text-[11.5px] text-zinc-600">
              We only read publicly available pages, exactly like a visitor would.
            </p>
          </div>
        </div>

        {/* live preview of what they are getting */}
        <div
          className="border-t border-white/[0.06] bg-white/[0.015] p-6 sm:p-8 lg:border-l lg:border-t-0"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-[hsl(0,0%,4.5%)]">
            <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-3 py-2">
              <span className="h-2 w-2 rounded-full bg-white/10" />
              <span className="h-2 w-2 rounded-full bg-white/10" />
              <span className="h-2 w-2 rounded-full bg-white/10" />
              <span className="ml-2 text-[10.5px] text-zinc-600">yoursite.com</span>
            </div>
            {/* Matches the scenes' 400x240 viewBox. A fixed pixel height let
                the artwork letterbox itself inside a much wider frame, which
                read as a small drawing lost in a big empty box. */}
            <div key={active} className="cc-fade-up aspect-[5/3] w-full p-2">
              <Scene />
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#5e5ba4]/15 text-[#b9b5f0] ring-1 ring-inset ring-[#5e5ba4]/25">
              <ActiveIcon className="h-4 w-4" />
            </span>
            <div>
              <div className="text-[13.5px] font-semibold text-zinc-100">
                {SCENES[active].title}
              </div>
              <div className="mt-0.5 min-h-[34px] text-[12.5px] leading-relaxed text-zinc-500">
                {SCENES[active].body}
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2" role="tablist" aria-label="Preview">
            {SCENES.map((s, i) => (
              <button
                key={s.title}
                type="button"
                role="tab"
                aria-selected={i === active}
                aria-label={s.title}
                onClick={() => setActive(i)}
                className="group flex-1 py-2 focus-visible:outline-none"
              >
                <span
                  className={`block h-[3px] rounded-full transition-colors ${
                    i === active ? 'bg-[#8f8bd8]' : 'bg-white/10 group-hover:bg-white/20'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
