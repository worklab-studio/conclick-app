'use client';

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Mail,
  Radio,
  ShieldAlert,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import { useApi } from '@/components/hooks';
import { GUIDES, guideForPlatform, snippetFor, type InstallGuide } from '@/lib/install-guides';
import type { DetectedTech } from '@/lib/tech-detect';

type Step = 'domain' | 'analysis' | 'install' | 'done';
type AnalyzeState = 'rich' | 'thin' | 'unreachable' | 'invalid';

interface Analysis {
  state: AnalyzeState;
  domain: string;
  goals: { name?: string; type?: string; value?: string }[];
  funnels: { name?: string; steps?: any[] }[];
  tech: DetectedTech | null;
  brand: { title: string | null; description: string | null; image: string | null } | null;
}

interface Seo {
  domainRank: number | null;
  backlinks: number | null;
  referringDomains: number | null;
  isEarlyStage: boolean;
}

const nf = new Intl.NumberFormat('en');

// Inside the modal the dialog already provides the surface, so the step
// containers stay transparent and only structural cards keep a border.
const card = 'rounded-xl border border-white/[0.07] bg-white/[0.02]';
const primaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 disabled:opacity-50';
const ghostBtn =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-700 hover:bg-zinc-900 disabled:opacity-50';

/* ------------------------------ step chrome ------------------------------ */

function StepRail({ step }: { step: Step }) {
  const items = [
    { key: 'domain', label: 'Your website' },
    { key: 'analysis', label: 'What we found' },
    { key: 'install', label: 'Start tracking' },
  ];
  const activeIndex = items.findIndex(i => i.key === (step === 'done' ? 'install' : step));

  // Only the current step is spelled out. Showing all three labels forced the
  // rail wider than the narrow steps of the wizard, and every label wrapped.
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {items.map((item, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        return (
          <div key={item.key} className="flex items-center gap-1.5">
            <span
              className={`flex items-center gap-1.5 rounded-full text-[11px] font-medium transition-all ${
                active
                  ? 'bg-white px-2.5 py-1 text-zinc-900'
                  : done
                    ? 'h-5 w-5 justify-center bg-emerald-500/20 text-emerald-300'
                    : 'h-5 w-5 justify-center bg-white/[0.06] text-zinc-500'
              }`}
            >
              {done ? (
                <Check className="h-3 w-3" />
              ) : (
                <span className="text-[10px] font-bold">{i + 1}</span>
              )}
              {active ? <span className="whitespace-nowrap">{item.label}</span> : null}
            </span>
            {i < items.length - 1 ? <span className="h-px w-3 bg-white/10" /> : null}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------ brand visual ----------------------------- */

/** Their own site, shown back to them. OG image when the site has one, else a
 *  favicon plate. Never a spinner and never a broken image. */
function BrandVisual({ analysis }: { analysis: Analysis }) {
  const [imgFailed, setImgFailed] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const { domain, brand, tech } = analysis;
  const showImage = !!brand?.image && !imgFailed;

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-[hsl(0,0%,4%)]">
      {/* browser chrome so it reads as "your site" */}
      <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-zinc-700" />
        <span className="h-2 w-2 rounded-full bg-zinc-700" />
        <span className="h-2 w-2 rounded-full bg-zinc-700" />
        <span className="ml-2 truncate rounded bg-white/[0.05] px-2 py-0.5 text-[10px] text-zinc-500">
          {domain}
        </span>
      </div>

      {showImage ? (
        // Sits on a lit backdrop: plenty of OG images are near-black, and a
        // black image on a black panel reads as a broken box. The skeleton
        // holds the space until it decodes so nothing ever flashes empty.
        <div className="relative aspect-[1200/630] w-full bg-[radial-gradient(600px_240px_at_50%_0%,rgba(94,91,164,0.18),transparent_72%)]">
          {!imgLoaded ? (
            <div className="absolute inset-0 animate-pulse bg-white/[0.04]" aria-hidden />
          ) : null}
          <img
            src={brand!.image as string}
            alt={`${domain} homepage preview`}
            onError={() => setImgFailed(true)}
            onLoad={() => setImgLoaded(true)}
            className={`h-full w-full object-cover transition-opacity duration-500 ${
              imgLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </div>
      ) : (
        <div className="flex aspect-[1200/630] w-full flex-col items-center justify-center gap-3 bg-[radial-gradient(600px_240px_at_50%_0%,rgba(94,91,164,0.16),transparent_70%)]">
          <img
            src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`}
            alt=""
            className="h-12 w-12 rounded-xl border border-white/10 bg-black/40 p-2"
          />
          <div className="px-6 text-center">
            <div className="truncate text-sm font-semibold text-white">
              {brand?.title || domain}
            </div>
            {tech?.platformLabel ? (
              <div className="mt-0.5 text-[11px] text-zinc-500">{tech.platformLabel}</div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------- step 1 --------------------------------- */

function DomainStep({
  value,
  onChange,
  onSubmit,
  busy,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  busy: boolean;
  error: string | null;
}) {
  return (
    <div className="w-full">
      <h1 className="text-[20px] font-bold tracking-tight text-white">What are we tracking?</h1>
      <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-400">
        Type your domain. Conclick reads the site and sets itself up, with nothing to install yet.
      </p>

      <form
        onSubmit={e => {
          e.preventDefault();
          onSubmit();
        }}
        className="mt-6"
      >
        <label htmlFor="site-domain" className="mb-1.5 block text-xs font-medium text-zinc-400">
          Website address
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-600">
              https://
            </span>
            <input
              id="site-domain"
              name="site-domain"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 py-2.5 pl-[68px] pr-3.5 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/20"
              placeholder="yoursite.com"
              value={value}
              onChange={e => onChange(e.target.value)}
              autoComplete="url"
              enterKeyHint="go"
              autoFocus
              spellCheck={false}
            />
          </div>
          <button
            type="submit"
            disabled={busy || !value.trim()}
            className={`${primaryBtn} sm:w-auto sm:px-5`}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {busy ? 'Reading your site' : 'Analyze'}
          </button>
        </div>
        {error ? <p className="mt-2 text-xs text-rose-400">{error}</p> : null}
      </form>

      <div className="mt-5 flex items-start gap-2.5 rounded-lg bg-white/[0.03] px-3.5 py-2.5 text-[11.5px] leading-relaxed text-zinc-500">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8b88cf]" />
        We read your homepage like a visitor would, find the buttons and pages worth measuring, and
        map your first funnel.
      </div>
    </div>
  );
}

/* -------------------------------- step 2 --------------------------------- */

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-white/[0.05] py-2 last:border-b-0">
      <span className="text-[11.5px] text-zinc-500">{label}</span>
      <span className="text-[14px] font-bold tabular-nums text-white">{value}</span>
    </div>
  );
}

function AnalysisStep({
  analysis,
  seo,
  seoLoading,
  onContinue,
  onBack,
  busy,
}: {
  analysis: Analysis;
  seo: Seo | null;
  seoLoading: boolean;
  onContinue: () => void;
  onBack: () => void;
  busy: boolean;
}) {
  const { state, domain, goals, funnels, tech } = analysis;

  // The domain is the emphasis, so it gets its own line rather than wrapping
  // mid-phrase at whatever width the panel happens to be.
  const headline =
    state === 'unreachable'
      ? 'We could not read this site from here'
      : state === 'rich'
        ? 'Here is what we will track'
        : 'Conclick is ready for this site';

  const sub =
    state === 'unreachable'
      ? 'That is normal for sites behind a firewall, bot protection, or a login. Tracking still works perfectly once the snippet is in.'
      : state === 'rich'
        ? 'We read your pages and picked the things worth measuring. You can change any of it later.'
        : 'Your site renders its content in the browser, so there was not much to read from the outside. Conclick still captures everything automatically once installed.';

  // Always-true baseline. This is what keeps the thin and unreachable states
  // looking deliberate instead of empty.
  const baseline = [
    'Every pageview, referrer and campaign',
    'Every click, automatically, with no tagging',
    'Live visitors on a globe as they browse',
    'AI crawlers split from real people',
  ];

  return (
    <div className={`${card} w-full overflow-hidden`}>
      <div className="grid gap-0 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
        {/* left: their site + stack + seo */}
        <div className="border-b border-white/[0.06] p-6 md:border-b-0 md:border-r">
          <BrandVisual analysis={analysis} />

          {tech ? (
            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#5e5ba4]/30 bg-[#5e5ba4]/15 px-2.5 py-1 text-[11px] font-medium text-[#c7c5ec]">
                {tech.platformLabel}
              </span>
              {tech.stack.slice(0, 2).map(s => (
                <span
                  key={s}
                  className="rounded-full border border-white/[0.07] bg-white/[0.04] px-2.5 py-1 text-[11px] text-zinc-400"
                >
                  {s}
                </span>
              ))}
              {tech.analytics.slice(0, 2).map(a => (
                <span
                  key={a}
                  className="rounded-full border border-white/[0.07] bg-white/[0.04] px-2.5 py-1 text-[11px] text-zinc-400"
                >
                  {a}
                </span>
              ))}
            </div>
          ) : null}

          {seoLoading && !seo ? (
            <div className="mt-4">
              <div className="mb-2 h-3 w-24 animate-pulse rounded bg-white/[0.06]" />
              <div className="h-[104px] animate-pulse rounded-lg bg-white/[0.04]" />
            </div>
          ) : null}

          {seo ? (
            <div className="mt-4 animate-in fade-in duration-500">
              <div className="mb-2 text-[11px] uppercase tracking-wide text-zinc-600">
                {seo.isEarlyStage ? 'Your starting point' : 'Search profile'}
              </div>
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-0.5">
                {seo.domainRank !== null ? (
                  <StatRow label="Domain rank" value={nf.format(seo.domainRank)} />
                ) : null}
                {seo.referringDomains !== null ? (
                  <StatRow label="Referring domains" value={nf.format(seo.referringDomains)} />
                ) : null}
                {seo.backlinks !== null ? (
                  <StatRow label="Backlinks" value={nf.format(seo.backlinks)} />
                ) : null}
              </div>
              {seo.isEarlyStage ? (
                <p className="mt-2 text-[11px] leading-relaxed text-zinc-600">
                  Early days, which is the best time to start measuring. Conclick tracks this
                  alongside your traffic so you can see it move.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* right: what we will track */}
        <div className="p-6">
          <h1 className="text-[19px] font-bold leading-snug tracking-tight text-white">
            {headline}
          </h1>
          <div className="mt-1 truncate text-[13px] font-medium text-[#b9b5f0]">{domain}</div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-zinc-400">{sub}</p>

          {state === 'rich' && goals.length > 0 ? (
            <div className="mt-5">
              <div className="mb-2 text-[11px] uppercase tracking-wide text-zinc-600">
                Goals we found on your site
              </div>
              <ul className="space-y-1.5">
                {goals.slice(0, 5).map((g, i) => (
                  <li
                    key={`${g.name || g.value}-${i}`}
                    className="flex items-start gap-2 rounded-lg bg-white/[0.03] px-3 py-2 text-[12.5px] text-zinc-200"
                  >
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    <span className="truncate">{g.name || g.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {state === 'rich' && funnels.length > 0 ? (
            <div className="mt-4">
              <div className="mb-2 text-[11px] uppercase tracking-wide text-zinc-600">
                Funnel we will build for you
              </div>
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
                <div className="text-[12.5px] font-medium text-zinc-100">{funnels[0].name}</div>
                <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-zinc-500">
                  {(funnels[0].steps || []).slice(0, 4).map((s: any, i: number) => (
                    <span key={i} className="flex items-center gap-1">
                      {i > 0 ? <ArrowRight className="h-3 w-3 text-zinc-700" /> : null}
                      <span className="truncate">{s?.name || s?.value || `Step ${i + 1}`}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {state !== 'rich' ? (
            <div className="mt-5">
              <div className="mb-2 text-[11px] uppercase tracking-wide text-zinc-600">
                Tracked automatically, no setup
              </div>
              <ul className="space-y-1.5">
                {baseline.map(b => (
                  <li
                    key={b}
                    className="flex items-start gap-2 rounded-lg bg-white/[0.03] px-3 py-2 text-[12.5px] text-zinc-200"
                  >
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {tech?.hasConclick ? (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5 text-[12px] text-emerald-200">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              The Conclick snippet is already on this site, so tracking starts the moment you
              continue.
            </div>
          ) : null}

          <div className="mt-6 flex items-center gap-2">
            <button type="button" onClick={onContinue} disabled={busy} className={primaryBtn}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Start tracking {domain}
            </button>
            <button
              type="button"
              onClick={onBack}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              Use a different site
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- step 3 --------------------------------- */

function InstallStep({
  websiteId,
  domain,
  tech,
  appUrl,
  live,
  onSkip,
  onDone,
}: {
  websiteId: string;
  domain: string;
  tech: DetectedTech | null;
  appUrl: string;
  live: boolean;
  onSkip: () => void;
  onDone: () => void;
}) {
  const { post } = useApi();
  const [guide, setGuide] = useState<InstallGuide>(() => guideForPlatform(tech?.platform));

  // Put the detected platform first. It was appearing wherever the static list
  // happened to place it, which on Astro meant the one tab that matters was
  // stranded on a second row below eleven that do not.
  const guides = useMemo(() => {
    const detected = guideForPlatform(tech?.platform);
    return [detected, ...GUIDES.filter(g => g.id !== detected.id)];
  }, [tech?.platform]);
  const [copied, setCopied] = useState(false);
  const [sendState, setSendState] = useState<'idle' | 'open' | 'sending' | 'sent' | 'error'>(
    'idle',
  );
  const [devEmail, setDevEmail] = useState('');

  const snippet = useMemo(() => snippetFor(websiteId, appUrl), [websiteId, appUrl]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked; the code is selectable on screen */
    }
  };

  const sendToDeveloper = async () => {
    setSendState('sending');
    try {
      await post('/onboarding/send-snippet', { email: devEmail, websiteId, domain });
      setSendState('sent');
    } catch {
      setSendState('error');
    }
  };

  if (live) {
    return (
      <div className="w-full py-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
          <Check className="h-6 w-6" />
        </div>
        <h1 className="text-[22px] font-bold tracking-tight text-white">
          It is working. Your first visit just landed.
        </h1>
        <p className="mx-auto mt-2 max-w-[380px] text-sm leading-relaxed text-zinc-400">
          {domain} is now being tracked. Every click, referrer and conversion from here on is yours
          to see.
        </p>
        <button type="button" onClick={onDone} className={`${primaryBtn} mt-6`}>
          Open my dashboard <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold tracking-tight text-white">
            Add one line to your site
          </h1>
          <p className="mt-1 text-[12.5px] text-zinc-400">
            {tech?.platformLabel && tech.platform !== 'custom'
              ? `We detected ${tech.platformLabel}, so these are the exact steps for it.`
              : 'Paste this in the head of your site, once, on every page.'}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-200">
          <Radio className="h-3 w-3 animate-pulse" />
          Listening for your first visit
        </span>
      </div>

      {/* platform tabs */}
      <div className="mt-4 flex flex-wrap gap-1">
        {guides.map(g => (
          <button
            key={g.id}
            type="button"
            onClick={() => setGuide(g)}
            className={`rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
              guide.id === g.id
                ? 'border-zinc-600 bg-zinc-800 text-white'
                : 'border-zinc-800 bg-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {g.label}
            {g.id === guideForPlatform(tech?.platform).id && tech?.platform !== 'custom' ? (
              <span className="ml-1 text-[9px] uppercase tracking-wide opacity-60">detected</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* snippet */}
      <div className="mt-4 overflow-hidden rounded-xl border border-white/[0.07] bg-[hsl(0,0%,4%)]">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-3.5 py-2">
          <span className="text-[11px] uppercase tracking-wide text-zinc-600">Your snippet</span>
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-zinc-300 transition-colors hover:bg-white/[0.06]"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        {/* Wraps rather than scrolls: a snippet clipped at the right edge looks
            broken and hides the part people need to check. */}
        <pre className="whitespace-pre-wrap break-all px-3.5 py-3 text-[11.5px] leading-relaxed text-indigo-200">
          <code>{snippet}</code>
        </pre>
      </div>

      {/* steps */}
      <ol className="mt-4 space-y-2">
        {guide.steps.map((s, i) => (
          <li key={i} className="flex gap-2.5 text-[12.5px] leading-relaxed text-zinc-300">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-[10px] font-bold text-zinc-400">
              {i + 1}
            </span>
            {s}
          </li>
        ))}
      </ol>

      {guide.caveat ? (
        <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.07] px-3 py-2 text-[11.5px] text-amber-200/90">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {guide.caveat}
        </p>
      ) : null}

      {guide.docsUrl ? (
        <a
          href={guide.docsUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1.5 text-[11.5px] text-indigo-300 hover:text-indigo-200"
        >
          {guide.label} documentation <ExternalLink className="h-3 w-3" />
        </a>
      ) : null}

      {/* escape hatches */}
      <div className="mt-6 border-t border-white/[0.06] pt-5">
        {sendState === 'sent' ? (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2.5 text-[12.5px] text-emerald-200">
            <Check className="h-4 w-4 shrink-0" />
            Sent. We emailed the snippet and the {guide.label} steps. This page keeps listening, so
            you will see it the moment they install it.
          </div>
        ) : sendState === 'open' || sendState === 'sending' || sendState === 'error' ? (
          <form
            onSubmit={e => {
              e.preventDefault();
              sendToDeveloper();
            }}
            className="flex flex-wrap items-end gap-2"
          >
            <div className="min-w-[220px] flex-1">
              <label htmlFor="dev-email" className="mb-1.5 block text-xs font-medium text-zinc-400">
                Who should install it?
              </label>
              <input
                id="dev-email"
                name="dev-email"
                type="email"
                required
                autoFocus
                value={devEmail}
                onChange={e => setDevEmail(e.target.value)}
                placeholder="developer@company.com"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3.5 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <button type="submit" disabled={sendState === 'sending'} className={primaryBtn}>
              {sendState === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Send instructions
            </button>
            {sendState === 'error' ? (
              <p className="w-full text-xs text-rose-400">
                That did not send. Please check the address and try again.
              </p>
            ) : null}
          </form>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setSendState('open')} className={ghostBtn}>
              <Mail className="h-4 w-4" /> Send this to my developer
            </button>
            <button
              type="button"
              onClick={onSkip}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              I will do this later, show me around
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* --------------------------------- flow ---------------------------------- */

export function OnboardingFlow({
  appUrl,
  initialDomain,
  onFinished,
  onStepChange,
}: {
  appUrl: string;
  /** Prefill, e.g. the ?site= handed over by the marketing site. */
  initialDomain?: string;
  /** Called when the user lands in the product; the modal host closes on this. */
  onFinished?: (websiteId: string | null) => void;
  /** Lets the host size the panel to the step: one field needs far less room
   *  than the two column analysis. */
  onStepChange?: (step: Step) => void;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const { post, get } = useApi();

  const [step, setStep] = useState<Step>('domain');
  const [domain, setDomain] = useState(initialDomain || params.get('site') || '');
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [websiteId, setWebsiteId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [seo, setSeo] = useState<Seo | null>(null);
  const [seoLoading, setSeoLoading] = useState(false);

  useEffect(() => {
    onStepChange?.(step);
  }, [step, onStepChange]);

  const analyze = async () => {
    const value = domain.trim();
    if (!value) return;
    setBusy(true);
    setError(null);
    try {
      const res: Analysis = await post('/onboarding/analyze', { domain: value });
      if (res.state === 'invalid') {
        setError('That does not look like a website address. Try something like yoursite.com');
        setBusy(false);
        return;
      }
      setAnalysis(res);
      setDomain(res.domain);
      setStep('analysis');

      // Enrichment arrives on its own schedule and simply fills in when ready.
      setSeo(null);
      setSeoLoading(true);
      get(`/onboarding/seo?domain=${encodeURIComponent(res.domain)}`)
        .then((r: any) => setSeo(r?.seo || null))
        .catch(() => setSeo(null))
        .finally(() => setSeoLoading(false));
    } catch {
      setError('We could not analyze that right now. You can continue and add it anyway.');
    } finally {
      setBusy(false);
    }
  };

  const createWebsite = async () => {
    if (!analysis) return;
    setBusy(true);
    try {
      const site: any = await post('/websites', {
        name: analysis.brand?.title?.slice(0, 100) || analysis.domain,
        domain: analysis.domain,
      });
      if (site?.id) {
        setWebsiteId(site.id);
        setStep('install');
      } else {
        throw new Error('no id');
      }
    } catch {
      setError('We could not create that website. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  // Poll for the first real event once we are on the install step.
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (step !== 'install' || !websiteId || live) return;
    const check = async () => {
      try {
        const res: any = await get(`/realtime/${websiteId}`);
        if ((res?.events?.length || 0) > 0 || (res?.visitors?.length || 0) > 0) {
          setLive(true);
        }
      } catch {
        /* keep listening */
      }
    };
    check();
    pollRef.current = setInterval(check, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [step, websiteId, live, get]);

  const goToDashboard = () => {
    if (onFinished) {
      onFinished(websiteId);
      return;
    }
    router.push(websiteId ? `/websites/${websiteId}` : '/websites');
  };

  return (
    <div className="w-full">
      {/* Header: brand is already visible behind the modal, so only the step
          rail earns its place here. */}
      {/* pr-8 keeps the rail clear of the dialog's absolute close button. */}
      <div className="mb-5 flex items-center justify-between gap-4 pr-8">
        <h2 className="hidden whitespace-nowrap text-[13px] font-semibold text-zinc-400 sm:block">
          Set up your website
        </h2>
        <StepRail step={step} />
      </div>

      {step === 'domain' ? (
        <DomainStep
          value={domain}
          onChange={setDomain}
          onSubmit={analyze}
          busy={busy}
          error={error}
        />
      ) : null}

      {step === 'analysis' && analysis ? (
        <AnalysisStep
          analysis={analysis}
          seo={seo}
          seoLoading={seoLoading}
          onContinue={createWebsite}
          onBack={() => {
            setAnalysis(null);
            setStep('domain');
          }}
          busy={busy}
        />
      ) : null}

      {step === 'install' && websiteId ? (
        <InstallStep
          websiteId={websiteId}
          domain={analysis?.domain || domain}
          tech={analysis?.tech || null}
          appUrl={appUrl}
          live={live}
          onSkip={goToDashboard}
          onDone={goToDashboard}
        />
      ) : null}

      {error && step !== 'domain' ? (
        <p className="mt-4 text-center text-xs text-rose-400">{error}</p>
      ) : null}

      <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-zinc-600">
        <ShieldAlert className="h-3.5 w-3.5" />
        We only read publicly available pages, exactly like a visitor would.
      </div>
    </div>
  );
}
