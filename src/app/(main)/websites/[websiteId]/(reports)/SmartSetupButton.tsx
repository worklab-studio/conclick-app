'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Sparkles, Loader2, Plus, Check, Filter, Globe, Zap, TrendingUp } from 'lucide-react';
import { useApi, useUpdateQuery, useReportsQuery } from '@/components/hooks';
import { goalKey, funnelKey } from '@/lib/report-identity';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface Goal {
  name: string;
  type: 'path' | 'event';
  value: string;
  count?: number;
  source?: 'site' | 'data';
}
interface Funnel {
  name: string;
  window: number;
  steps: { type: 'path' | 'event'; value: string }[];
  count?: number;
  source?: 'site' | 'data';
}

/**
 * "Suggest from my site" — proposes goals + funnels from the site's real CTAs/links/
 * forms AND from what visitors actually do (so it's never a dead end). One-click add.
 */
export function SmartSetupButton({ websiteId }: { websiteId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="border-[#5e5ba4]/40 bg-[#5e5ba4]/5 text-[#c7c4f0] hover:bg-[#5e5ba4]/10 hover:text-white"
        >
          <Sparkles className="mr-1.5 h-4 w-4" /> Suggest from my site
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] max-w-lg gap-0 overflow-y-auto border-[hsl(0,0%,13%)] bg-[hsl(0,0%,8%)]">
        <DialogHeader className="mb-4">
          <DialogTitle>Suggested setup</DialogTitle>
          <DialogDescription>
            Goals &amp; funnels proposed from your site&apos;s real buttons, links, and forms, plus
            what your visitors actually do.
          </DialogDescription>
        </DialogHeader>
        {open && <SmartSetup websiteId={websiteId} />}
      </DialogContent>
    </Dialog>
  );
}

function SectionLabel({
  icon: Ic,
  children,
}: {
  icon: typeof Sparkles;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/60">
      <Ic className="h-3 w-3" /> {children}
    </div>
  );
}

const goalSub = (g: Goal) => {
  if (g.source === 'data') {
    return g.type === 'event'
      ? `Event goal${g.count ? ` · fired ${g.count}× in the last 30 days` : ''}`
      : `Page goal${g.count ? ` · ${g.count} visitors · likely a conversion page` : ''}`;
  }
  return g.type === 'path'
    ? `Page goal${g.count ? ` · ${g.count} visitors` : ''}`
    : `Event goal${g.count ? ` · ${g.count} fired` : ''}`;
};

function SmartSetup({ websiteId }: { websiteId: string }) {
  const { post } = useApi();
  const { mutateAsync, touch } = useUpdateQuery('/reports');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [note, setNote] = useState<string | undefined>();
  const [added, setAdded] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | undefined>();
  const [addingAll, setAddingAll] = useState(false);

  // What's already tracked — so reopening never re-offers (or re-adds) existing items.
  const { data: goalReports } = useReportsQuery({ websiteId, type: 'goal' });
  const { data: funnelReports } = useReportsQuery({ websiteId, type: 'funnel' });
  const existingKeys = useMemo(() => {
    const set = new Set<string>();
    for (const r of (goalReports?.data as any[]) || []) set.add('goal:' + goalKey(r.parameters));
    for (const r of (funnelReports?.data as any[]) || [])
      set.add('funnel:' + funnelKey(r.parameters));
    return set;
  }, [goalReports, funnelReports]);
  const goalExists = (g: Goal) =>
    existingKeys.has('goal:' + goalKey({ type: g.type, value: g.value }));
  const funnelExists = (f: Funnel) =>
    existingKeys.has('funnel:' + funnelKey({ window: f.window || 60, steps: f.steps }));

  const load = useCallback(() => {
    setStatus('loading');
    post(`/websites/${websiteId}/suggest`, {})
      .then((res: any) => {
        setGoals(res?.goals || []);
        setFunnels(res?.funnels || []);
        setNote(res?.meta?.note);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [websiteId]);

  useEffect(() => {
    load();
  }, [load]);

  const addGoal = async (g: Goal, key: string) => {
    setBusy(key);
    await mutateAsync(
      { type: 'goal', name: g.name, websiteId, parameters: { type: g.type, value: g.value } },
      { onSuccess: () => touch('reports:goal') },
    );
    setAdded(a => ({ ...a, [key]: true }));
    setBusy(undefined);
  };
  const addFunnel = async (f: Funnel, key: string) => {
    setBusy(key);
    await mutateAsync(
      {
        type: 'funnel',
        name: f.name,
        websiteId,
        parameters: { window: f.window || 60, steps: f.steps },
      },
      { onSuccess: () => touch('reports:funnel') },
    );
    setAdded(a => ({ ...a, [key]: true }));
    setBusy(undefined);
  };
  const addAll = async () => {
    setAddingAll(true);
    for (let i = 0; i < goals.length; i++) {
      if (!added['g' + i] && !goalExists(goals[i])) await addGoal(goals[i], 'g' + i);
    }
    for (let i = 0; i < funnels.length; i++) {
      if (!added['f' + i] && !funnelExists(funnels[i])) await addFunnel(funnels[i], 'f' + i);
    }
    setAddingAll(false);
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Reading your site…
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <div className="text-sm leading-relaxed text-muted-foreground">
          Couldn&apos;t analyze your site right now, make sure the domain is public.
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={load}
          className="border-[#5e5ba4]/40 text-[#c7c4f0] hover:bg-[#5e5ba4]/10"
        >
          Try again
        </Button>
      </div>
    );
  }
  if (!goals.length && !funnels.length) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#5e5ba4]/15 text-indigo-300 ring-1 ring-inset ring-[#5e5ba4]/25">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          {note ||
            "We couldn't spot obvious goals yet. Add one with the builder, or turn on Autocapture and revisit once visitors start clicking."}
        </div>
      </div>
    );
  }

  const renderGoal = (g: Goal, i: number) => {
    const key = 'g' + i;
    const Icon = g.type === 'path' ? Globe : Zap;
    return (
      <SuggestRow
        key={key}
        icon={<Icon className="h-4 w-4" />}
        title={g.name}
        sub={goalSub(g)}
        done={added[key] || goalExists(g)}
        doneLabel={added[key] ? 'Added' : 'Already tracking'}
        busy={busy === key}
        onAdd={() => addGoal(g, key)}
      />
    );
  };

  const siteGoals = goals.map((g, i) => ({ g, i })).filter(x => x.g.source !== 'data');
  const dataGoals = goals.map((g, i) => ({ g, i })).filter(x => x.g.source === 'data');

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          onClick={addAll}
          disabled={addingAll}
          className="border-[#5e5ba4]/40 text-[#c7c4f0] hover:bg-[#5e5ba4]/10"
        >
          {addingAll ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="mr-1 h-3.5 w-3.5" />
          )}
          Add all
        </Button>
      </div>

      {siteGoals.length > 0 && (
        <div>
          <SectionLabel icon={Sparkles}>From your site</SectionLabel>
          <div className="space-y-2">{siteGoals.map(x => renderGoal(x.g, x.i))}</div>
        </div>
      )}
      {dataGoals.length > 0 && (
        <div>
          <SectionLabel icon={TrendingUp}>From your traffic</SectionLabel>
          <div className="space-y-2">{dataGoals.map(x => renderGoal(x.g, x.i))}</div>
        </div>
      )}
      {funnels.length > 0 && (
        <div>
          <SectionLabel icon={Filter}>Funnels</SectionLabel>
          <div className="space-y-2">
            {funnels.map((f, i) => {
              const key = 'f' + i;
              return (
                <SuggestRow
                  key={key}
                  icon={<Filter className="h-4 w-4" />}
                  title={f.name}
                  sub={`${f.steps.map(s => s.value).join('  →  ')}${
                    f.count ? `  ·  ${f.count} visitors` : ''
                  }`}
                  done={added[key] || funnelExists(f)}
                  doneLabel={added[key] ? 'Added' : 'Already tracking'}
                  busy={busy === key}
                  onAdd={() => addFunnel(f, key)}
                />
              );
            })}
          </div>
        </div>
      )}

      <div className="text-[11px] leading-relaxed text-muted-foreground/55">
        Suggestions only include actions that actually fire on your site, ranked by how often
        visitors do them.
      </div>
    </div>
  );
}

function SuggestRow({
  icon,
  title,
  sub,
  done,
  doneLabel = 'Added',
  busy,
  onAdd,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  done?: boolean;
  doneLabel?: string;
  busy?: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[hsl(0,0%,14%)] bg-[hsl(0,0%,9.5%)] px-3 py-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#5e5ba4]/15 text-[#b7b4e4]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">{title}</div>
        <div className="truncate text-xs text-muted-foreground">{sub}</div>
      </div>
      {done ? (
        <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-400">
          <Check className="h-4 w-4" /> {doneLabel}
        </span>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={onAdd}
          disabled={busy}
          className="shrink-0 border-[hsl(0,0%,18%)]"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add
            </>
          )}
        </Button>
      )}
    </div>
  );
}
