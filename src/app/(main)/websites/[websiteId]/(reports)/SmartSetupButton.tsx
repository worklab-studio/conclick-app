'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Loader2, Plus, Check, Filter, Globe, Zap } from 'lucide-react';
import { useApi, useUpdateQuery } from '@/components/hooks';
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
}
interface Funnel {
  name: string;
  window: number;
  steps: { type: 'path' | 'event'; value: string }[];
  count?: number;
}

/**
 * "Suggest from my site" — reads the site's real CTAs/links/forms (server-side,
 * heuristic) and proposes goals + funnels the user adds with one click. Works on
 * single-page sites because it proposes event-based items named to match
 * autocapture.
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
            We read your site and proposed goals &amp; funnels from your real buttons, links, and
            forms. Add the ones you want.
          </DialogDescription>
        </DialogHeader>
        {open && <SmartSetup websiteId={websiteId} />}
      </DialogContent>
    </Dialog>
  );
}

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

  useEffect(() => {
    let alive = true;
    post(`/websites/${websiteId}/suggest`, {})
      .then((res: any) => {
        if (!alive) return;
        setGoals(res?.goals || []);
        setFunnels(res?.funnels || []);
        setNote(res?.meta?.note);
        setStatus('ready');
      })
      .catch(() => {
        if (alive) setStatus('error');
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [websiteId]);

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
      if (!added['g' + i]) await addGoal(goals[i], 'g' + i);
    }
    for (let i = 0; i < funnels.length; i++) {
      if (!added['f' + i]) await addFunnel(funnels[i], 'f' + i);
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
      <div className="py-12 text-center text-sm text-muted-foreground">
        Couldn&apos;t analyze your site right now — make sure the domain is public, or build one
        manually.
      </div>
    );
  }
  if (!goals.length && !funnels.length) {
    return (
      <div className="py-12 text-center text-sm leading-relaxed text-muted-foreground">
        {note || "We couldn't spot obvious goals on your site. Try the manual builder."}
      </div>
    );
  }

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
      {goals.length > 0 && (
        <div>
          <div className="mb-2 text-[13px] font-semibold text-foreground/90">Goals</div>
          <div className="space-y-2">
            {goals.map((g, i) => {
              const key = 'g' + i;
              const Icon = g.type === 'path' ? Globe : Zap;
              return (
                <SuggestRow
                  key={key}
                  icon={<Icon className="h-4 w-4" />}
                  title={g.name}
                  sub={`${g.type === 'path' ? 'Page goal' : 'Event goal'}${
                    g.count ? ` · ${g.count} fired` : ''
                  }`}
                  done={added[key]}
                  busy={busy === key}
                  onAdd={() => addGoal(g, key)}
                />
              );
            })}
          </div>
        </div>
      )}
      {funnels.length > 0 && (
        <div>
          <div className="mb-2 text-[13px] font-semibold text-foreground/90">Funnels</div>
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
                  done={added[key]}
                  busy={busy === key}
                  onAdd={() => addFunnel(f, key)}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SuggestRow({
  icon,
  title,
  sub,
  done,
  busy,
  onAdd,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  done?: boolean;
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
          <Check className="h-4 w-4" /> Added
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
