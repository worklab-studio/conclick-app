import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUpdateQuery, useMessages, useConfig } from '@/components/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { AlertTriangle, ArrowRight, Check, Copy, ExternalLink, Globe, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { DOMAIN_REGEX } from '@/lib/constants';
import { SiteIcon } from './SiteIcon';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  domain: z.string().min(1, 'Domain is required').regex(DOMAIN_REGEX, 'Invalid domain'),
});

enum Step {
  FORM = 0,
  VERIFY = 1,
  SUCCESS = 2,
}

// Coding agents the user can hand installation to. Logos are REAL brand marks
// served from our own /public (no runtime dependency on external CDNs).
const AI_TOOLS = [
  { key: 'claude', label: 'Claude Code', icon: '/images/ai/claude.svg' },
  { key: 'codex', label: 'Codex', icon: '/images/ai/openai.png' },
  { key: 'antigravity', label: 'Antigravity', icon: '/images/ai/antigravity.png' },
  { key: 'v0', label: 'v0', icon: '/images/ai/v0.svg' },
  { key: 'lovable', label: 'Lovable', icon: '/images/ai/lovable.png' },
];

function buildAiPrompt(domain: string, script: string) {
  return `Install Conclick analytics on ${domain}.

Add this snippet once to the <head> of every page (use the site-wide layout/template), just before </head>:

${script}

Rules:
- Skip if this exact snippet already exists — never add it twice.
- Keep the defer attribute.
- Next.js/React: root layout head. Plain HTML: every page's <head>.

Then deploy the change and open https://${domain} once so the first pageview fires. Reply with the file(s) you changed.`;
}

function fireConfetti() {
  confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 }, zIndex: 2147483647 });
  setTimeout(() => {
    confetti({ particleCount: 100, angle: 60, spread: 55, origin: { x: 0 }, zIndex: 2147483647 });
    confetti({ particleCount: 100, angle: 120, spread: 55, origin: { x: 1 }, zIndex: 2147483647 });
  }, 250);
}

// Small debounce so the favicon lookup follows typing smoothly instead of
// firing a request per keystroke.
function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

function StepBar({ step }: { step: Step }) {
  const items = ['Details', 'Install', 'Done'];
  return (
    <div className="flex items-center justify-center gap-1.5 pb-1">
      {items.map((label, i) => (
        <div key={label} className="flex items-center gap-1.5">
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold transition-colors ${
              i < step
                ? 'bg-emerald-500 text-white'
                : i === step
                  ? 'bg-[#5e5ba4] text-white'
                  : 'bg-zinc-800 text-zinc-500'
            }`}
          >
            {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
          </div>
          <span
            className={`text-xs ${i === step ? 'font-medium text-foreground' : 'text-muted-foreground'}`}
          >
            {label}
          </span>
          {i < items.length - 1 && (
            <div className={`mx-1 h-px w-6 ${i < step ? 'bg-emerald-500' : 'bg-zinc-800'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export function WebsiteAddModalContent({
  teamId,
  onSave,
  onClose,
}: {
  teamId?: string;
  onSave?: () => void;
  onClose?: () => void;
}) {
  const { formatMessage, labels } = useMessages();
  const { mutateAsync: createWebsite, isPending: isCreating } = useUpdateQuery('/websites', {
    teamId,
  });
  const [step, setStep] = useState<Step>(Step.FORM);
  const [createdWebsite, setCreatedWebsite] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const config = useConfig();
  const [copiedId, setCopiedId] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedTool, setCopiedTool] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      domain: '',
    },
  });

  const nameVal = form.watch('name');
  const domainVal = form.watch('domain');
  const previewDomain = useDebounced(domainVal, 300);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const data = await createWebsite(values);
      successFired.current = false;
      setCreatedWebsite(data);
      setStep(Step.VERIFY);
      onSave?.(); // We call onSave to trigger list refresh, but don't close modal yet
    } catch {
      // Error handled by query hook or global error boundary usually,
      // but form error handling is better here if needed.
    }
  };

  const getTrackingScript = () => {
    if (!createdWebsite) return '';

    const SCRIPT_NAME = 'script.js';
    const trackerScriptName =
      config?.trackerScriptName?.split(',')?.map((n: string) => n.trim())?.[0] || SCRIPT_NAME;

    const hostUrl = window?.location?.origin || '';

    const url = config?.cloudMode
      ? `${process.env.cloudUrl}/${trackerScriptName}`
      : `${hostUrl}${process.env.basePath || ''}/${trackerScriptName}`;

    const src = trackerScriptName?.startsWith('http') ? trackerScriptName : url;

    return `<script defer src="${src}" data-website-id="${createdWebsite.id}"></script>`;
  };

  const copyToClipboard = (text: string, setCopied: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyAiPrompt = (toolKey: string) => {
    navigator.clipboard.writeText(buildAiPrompt(createdWebsite?.domain || '', getTrackingScript()));
    setCopiedTool(toolKey);
    setTimeout(() => setCopiedTool(null), 1800);
  };

  const [verifyOutcome, setVerifyOutcome] = useState<'notFound' | 'error' | null>(null);
  const [progress, setProgress] = useState(0);

  // Progress bar animation
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isVerifying) {
      setProgress(0);
      const duration = 10000; // 10 seconds
      const stepTime = 100;
      const steps = duration / stepTime;
      let currentStep = 0;

      interval = setInterval(() => {
        currentStep++;
        const newProgress = Math.min((currentStep / steps) * 100, 95); // Cap at 95% until done
        setProgress(newProgress);
      }, stepTime);
    } else {
      setProgress(0);
    }

    return () => clearInterval(interval);
  }, [isVerifying]);

  // Success can arrive from two directions (the explicit verify button and the
  // background poll) — the ref guard makes whichever lands first the only one
  // that fires confetti and advances the step.
  const successFired = useRef(false);
  const succeed = () => {
    if (successFired.current) return;
    successFired.current = true;
    setStep(Step.SUCCESS);
    fireConfetti();
  };
  const succeedRef = useRef(succeed);
  succeedRef.current = succeed;

  // The install step LISTENS: poll stats every 5s and flip to success the
  // moment the first event lands — no button press required. This is what
  // makes the step feel live instead of a static instruction sheet.
  useEffect(() => {
    if (step !== Step.VERIFY || !createdWebsite?.id) return;

    let cancelled = false;
    const createdAt = Date.parse(createdWebsite.createdAt) || Date.now() - 24 * 60 * 60 * 1000;

    const check = async () => {
      try {
        const params = new URLSearchParams({
          startAt: String(createdAt - 60_000),
          endAt: String(Date.now() + 60_000),
        });
        const res = await fetch(`/api/websites/${createdWebsite.id}/stats?${params}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && (Number(data?.pageviews) > 0 || Number(data?.visitors) > 0)) {
          succeedRef.current();
        }
      } catch {
        // Network hiccups just mean the next tick tries again.
      }
    };

    check();
    const interval = setInterval(check, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [step, createdWebsite?.id]);

  const handleVerify = async () => {
    setIsVerifying(true);
    setVerifyOutcome(null);

    try {
      // Open website in new tab (user convenience)
      const url = createdWebsite.domain.startsWith('http')
        ? createdWebsite.domain
        : `https://${createdWebsite.domain}`;

      window.open(url, '_blank');

      // Concurrent execution: API check AND 10s minimum wait
      const verifyPromise = fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: createdWebsite.domain,
          websiteId: createdWebsite.id,
        }),
      }).then(res => res.json());

      const timerPromise = new Promise(resolve => setTimeout(resolve, 10000));

      const [data] = await Promise.all([verifyPromise, timerPromise]);

      setProgress(100); // Complete bar

      if (data.success) {
        succeed();
      } else {
        setVerifyOutcome('notFound');
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      setVerifyOutcome('error');
    } finally {
      setIsVerifying(false);
    }
  };

  // ---------------------------------------------------------------- FORM step
  if (step === Step.FORM) {
    const showPreview = !!domainVal && /\.[a-z]{2,}/i.test(domainVal);

    return (
      <div className="space-y-5">
        <StepBar step={Step.FORM} />

        <div className="space-y-1 text-center">
          <h3 className="text-base font-semibold text-foreground">Connect a website</h3>
          <p className="text-sm text-muted-foreground">
            Add a site and start tracking visitors in real time.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">{formatMessage(labels.name)}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      autoComplete="off"
                      placeholder="My Website"
                      className="h-10 dark:bg-[#18181b] dark:border-zinc-800"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="domain"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">{formatMessage(labels.domain)}</FormLabel>
                  <FormControl>
                    <div className="flex h-10 items-stretch overflow-hidden rounded-md border border-input bg-[#18181b] transition-colors focus-within:border-[#5e5ba4] focus-within:ring-1 focus-within:ring-[#5e5ba4] dark:border-zinc-800">
                      <span className="flex select-none items-center gap-1 border-r border-zinc-800 px-3 text-xs text-muted-foreground">
                        <Globe className="h-3.5 w-3.5" />
                        https://
                      </span>
                      <input
                        {...field}
                        autoComplete="off"
                        placeholder="example.com"
                        className="flex-1 bg-transparent px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showPreview && (
              <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-[#18181b]/60 p-3 animate-in fade-in slide-in-from-bottom-1 duration-200">
                <SiteIcon domain={previewDomain} name={nameVal} size={36} className="rounded-lg" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">
                    {nameVal || domainVal}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{domainVal}</div>
                </div>
                <span className="ml-auto shrink-0 rounded-full bg-zinc-800/70 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                  Preview
                </span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="dark:bg-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800"
              >
                {formatMessage(labels.cancel)}
              </Button>
              <Button
                type="submit"
                disabled={isCreating}
                style={{ backgroundColor: '#5e5ba4', color: 'white' }}
                className="group border-0 hover:opacity-90"
              >
                {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Continue
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </div>
          </form>
        </Form>
      </div>
    );
  }

  // -------------------------------------------------------------- VERIFY step
  if (step === Step.VERIFY) {
    const scriptCode = getTrackingScript();
    const trackingUrl = config?.cloudMode
      ? `${process.env.cloudUrl}/script.js`
      : `${window?.location?.origin || ''}${process.env.basePath || ''}/script.js`;

    return (
      <div className="space-y-4">
        <StepBar step={Step.VERIFY} />

        <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-[#18181b]/60 p-3">
          <SiteIcon
            domain={createdWebsite?.domain}
            name={createdWebsite?.name}
            size={36}
            className="rounded-lg"
          />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-foreground">
              {createdWebsite?.name || createdWebsite?.domain}
            </div>
            <div className="truncate text-xs text-muted-foreground">{createdWebsite?.domain}</div>
          </div>
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
            <Check className="h-3 w-3" />
            Created
          </span>
        </div>

        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">Install your tracking code</h3>
          <p className="text-sm text-muted-foreground">
            Paste this into the <code className="text-foreground">&lt;head&gt;</code> of your site —
            or hand it to your AI below.
          </p>
        </div>

        {/* Live status: this panel IS the verification. It polls on its own and
            flips the whole modal to success the moment the first event lands. */}
        <div
          className={`rounded-lg border p-3 transition-colors ${
            verifyOutcome === 'error'
              ? 'border-red-500/20 bg-red-500/[0.05]'
              : 'border-zinc-800 bg-[#18181b]/60'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="relative flex h-8 w-8 shrink-0 items-center justify-center">
              {verifyOutcome === 'error' ? (
                <AlertTriangle className="h-4 w-4 text-red-400" />
              ) : (
                <>
                  <span className="absolute inline-flex h-6 w-6 animate-ping rounded-full bg-[#5e5ba4]/30" />
                  <span className="absolute inline-flex h-4 w-4 animate-pulse rounded-full bg-[#5e5ba4]/40" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#8b88d8]" />
                </>
              )}
            </span>
            <div className="min-w-0 flex-1">
              {verifyOutcome === 'error' ? (
                <>
                  <p className="text-sm font-medium text-red-200">
                    Couldn&apos;t reach {createdWebsite?.domain}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Make sure the domain is correct and publicly reachable, then try again.
                  </p>
                </>
              ) : verifyOutcome === 'notFound' ? (
                <>
                  <p className="text-sm font-medium text-foreground">
                    Snippet not found yet — still listening
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Quick checks: pasted before <code className="text-zinc-300">&lt;/head&gt;</code>{' '}
                    · deployed live · page opened once · ad-blocker off
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-foreground">
                    Listening for your first visit
                  </p>
                  <p className="text-xs text-muted-foreground">
                    This updates by itself — the moment a pageview arrives, you&apos;re done.
                  </p>
                </>
              )}
            </div>
            {verifyOutcome !== 'error' && (
              <span className="shrink-0 rounded-full bg-zinc-800/70 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                auto-checking
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium leading-none">Tracking Code</label>
          <div className="group relative">
            <div className="flex min-h-[72px] w-full overflow-x-auto rounded-md border border-zinc-800 bg-[#18181b] py-3 pl-3 pr-11 font-mono text-sm">
              <code className="text-sm">
                <span style={{ color: '#89ddff' }}>&lt;script</span>{' '}
                <span style={{ color: '#c792ea' }}>defer</span>{' '}
                <span style={{ color: '#c792ea' }}>src</span>
                <span style={{ color: '#89ddff' }}>=</span>
                <span style={{ color: '#c3e88d' }}>&quot;{trackingUrl}&quot;</span>{' '}
                <span style={{ color: '#c792ea' }}>data-website-id</span>
                <span style={{ color: '#89ddff' }}>=</span>
                <span style={{ color: '#c3e88d' }}>&quot;{createdWebsite?.id}&quot;</span>
                <span style={{ color: '#89ddff' }}>&gt;&lt;/script&gt;</span>
              </code>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="absolute right-2 top-2 h-7 w-7"
              onClick={() => copyToClipboard(scriptCode, setCopiedScript)}
            >
              {copiedScript ? (
                <Check className="h-3 w-3 text-emerald-400" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="shrink-0">Website ID</span>
            <code className="truncate text-zinc-400">{createdWebsite?.id}</code>
            <button
              type="button"
              className="shrink-0 text-zinc-500 transition-colors hover:text-zinc-300"
              onClick={() => copyToClipboard(createdWebsite?.id, setCopiedId)}
              aria-label="Copy website ID"
            >
              {copiedId ? (
                <Check className="h-3 w-3 text-emerald-400" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          </div>
        </div>

        {/* Hand-off to a coding agent: one click copies a complete, tailored
            prompt (exact snippet + placement rules + verify step). */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-800" />
            <span className="text-xs font-medium text-muted-foreground">or hand it to your AI</span>
            <div className="h-px flex-1 bg-zinc-800" />
          </div>
          <div className="flex flex-wrap gap-2">
            {AI_TOOLS.map(tool => (
              <button
                key={tool.key}
                type="button"
                onClick={() => handleCopyAiPrompt(tool.key)}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                  copiedTool === tool.key
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                    : 'border-zinc-800 bg-[#18181b] text-zinc-300 hover:border-[#5e5ba4]/60 hover:bg-zinc-900'
                }`}
              >
                {copiedTool === tool.key ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <img src={tool.icon} alt="" className="h-4 w-4 object-contain" />
                )}
                {copiedTool === tool.key ? 'Prompt copied' : tool.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Copies a ready-to-paste prompt with your exact snippet, placement rules and a verify
            step.
          </p>
        </div>

        {isVerifying && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Checking {createdWebsite?.domain}…</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full transition-all duration-100 ease-linear"
                style={{ width: `${progress}%`, backgroundColor: '#5e5ba4' }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isVerifying}
            className="text-muted-foreground hover:text-foreground"
          >
            I&apos;ll do this later
          </Button>
          <Button
            onClick={handleVerify}
            disabled={isVerifying}
            style={{ backgroundColor: '#5e5ba4', color: 'white' }}
            className="border-0 hover:opacity-90"
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking…
              </>
            ) : (
              <>
                {verifyOutcome ? 'Open site & check again' : 'Open site & verify'}
                <ExternalLink className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------- SUCCESS step
  const verifiedDomain = createdWebsite?.domain || createdWebsite?.name || '';

  return (
    <div className="flex flex-col items-center justify-center gap-5 py-2 text-center animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-500">
      <StepBar step={Step.SUCCESS} />

      {/* Verified badge: gradient core + soft glow + pulsing ring */}
      <div className="relative flex h-20 w-20 items-center justify-center">
        <div className="absolute h-20 w-20 rounded-full bg-emerald-500/20 blur-2xl" aria-hidden />
        <span
          className="absolute inline-flex h-16 w-16 animate-ping rounded-full bg-emerald-500/20"
          aria-hidden
        />
        <div className="absolute h-16 w-16 rounded-full border border-emerald-500/30" aria-hidden />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-900/40 ring-8 ring-emerald-500/10">
          <Check className="h-7 w-7 text-white" strokeWidth={3} />
        </div>
      </div>

      {/* Copy */}
      <div className="space-y-1.5">
        <h3 className="text-xl font-semibold tracking-tight text-foreground">
          You&apos;re all set!
        </h3>
        <p className="mx-auto max-w-[300px] text-sm text-muted-foreground">
          {verifiedDomain ? (
            <>
              We detected live data from{' '}
              <span className="font-medium text-foreground">{verifiedDomain}</span>. Your tracking
              is verified and active.
            </>
          ) : (
            'We successfully detected data from your website. Your tracking is verified and active.'
          )}
        </p>
      </div>

      {/* Live indicator */}
      <div
        className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400"
        role="status"
        aria-live="polite"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        Receiving data
      </div>

      {/* Action */}
      <Button
        className="group mt-1 w-full border-0 bg-gradient-to-r from-indigo-500 to-[#5e5ba4] text-white shadow-lg shadow-indigo-950/30 transition hover:opacity-95 hover:shadow-indigo-900/40"
        onClick={onClose}
      >
        Go to dashboard
        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </Button>
    </div>
  );
}
