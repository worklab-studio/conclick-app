'use client';

import { useMemo, useState } from 'react';
import { Eye, Zap, Loader2, Info, type LucideIcon } from 'lucide-react';
import { useUpdateQuery, useReportsQuery, useResultQuery } from '@/components/hooks';
import { Button } from '@/components/ui/button';
import { MetricValuePicker } from '@/components/input/MetricValuePicker';
import { goalKey } from '@/lib/report-identity';

type GoalType = 'path' | 'event';

function defaultName(type: GoalType, value: string) {
  if (!value) return '';
  return type === 'path' ? `Visited ${value}` : `Did ${value}`;
}

const CHOICES: { id: GoalType; icon: LucideIcon; title: string; desc: string }[] = [
  { id: 'path', icon: Eye, title: 'Visits a page', desc: 'e.g. someone reaches /pricing' },
  { id: 'event', icon: Zap, title: 'Does an action', desc: 'e.g. clicks a tracked button' },
];

/**
 * Conclick-native goal builder. Used for BOTH create and edit (pass `id` + `initial`).
 * Plain language + pick-from-your-site, a live preview, and a duplicate guard. Saves the
 * same parameters:{type,value} payload the legacy form used.
 */
export function GoalBuilder({
  websiteId,
  onClose,
  id,
  initial,
}: {
  websiteId: string;
  onClose: () => void;
  id?: string;
  initial?: { type: GoalType; value: string; name: string; targetWeekly?: number };
}) {
  const editing = !!id;
  const [type, setType] = useState<GoalType>(initial?.type ?? 'path');
  const [value, setValue] = useState(initial?.value ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [nameDirty, setNameDirty] = useState(!!initial?.name);
  const [target, setTarget] = useState<string>(
    initial?.targetWeekly ? String(initial.targetWeekly) : '',
  );
  const { mutateAsync, isPending, error, touch } = useUpdateQuery(
    editing ? `/reports/${id}` : '/reports',
  );

  const effectiveName = nameDirty ? name : defaultName(type, value);
  const canSave = !!value && !!effectiveName;

  // Duplicate guard (create only — editing the same goal must stay editable).
  const { data: existing } = useReportsQuery({ websiteId, type: 'goal' });
  const isDuplicate = useMemo(() => {
    if (editing || !value) return false;
    const key = goalKey({ type, value });
    return ((existing?.data as any[]) || []).some(r => goalKey(r.parameters) === key);
  }, [existing, type, value, editing]);

  // Live preview: how this goal performs over the current date range, before saving.
  const { data: preview } = useResultQuery<{ num: number; total: number }>(
    'goal',
    { websiteId, type, value },
    { enabled: !!value },
  );
  const pNum = preview?.num || 0;
  const pTotal = preview?.total || 0;
  const pPct = pTotal ? Math.round((pNum / pTotal) * 100) : 0;

  const handleSave = async () => {
    if (isDuplicate) {
      onClose();
      return;
    }
    const targetWeekly = Math.max(0, Math.round(Number(target))) || undefined;
    await mutateAsync(
      {
        type: 'goal',
        name: effectiveName,
        websiteId,
        parameters: { type, value, ...(targetWeekly ? { targetWeekly } : {}) },
      },
      {
        onSuccess: () => {
          if (editing) touch(`report:${id}`);
          touch('reports:goal');
          onClose();
        },
      },
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 text-[13px] font-semibold text-foreground/90">
          What counts as a win?
        </div>
        <div className="grid grid-cols-2 gap-3">
          {CHOICES.map(c => {
            const Icon = c.icon;
            const sel = type === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setType(c.id);
                  setValue('');
                }}
                className={`rounded-xl border p-4 text-left transition-all ${
                  sel
                    ? 'border-[#5e5ba4] bg-[#5e5ba4]/8 shadow-[inset_0_0_0_1px_#5e5ba4]'
                    : 'border-[hsl(0,0%,16%)] bg-[hsl(0,0%,9%)] hover:border-[hsl(0,0%,22%)]'
                }`}
              >
                <div className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-lg bg-[#5e5ba4]/15 text-[#b7b4e4]">
                  <Icon className="h-[18px] w-[18px]" />
                </div>
                <div className="text-sm font-semibold text-foreground">{c.title}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{c.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-2 text-[13px] font-semibold text-foreground/90">
          {type === 'path' ? 'Which page?' : 'Which event?'}{' '}
          <span className="font-normal text-muted-foreground/60">, pick from your site</span>
        </div>
        <MetricValuePicker websiteId={websiteId} type={type} value={value} onChange={setValue} />
      </div>

      {value ? (
        isDuplicate ? (
          <div className="flex items-start gap-2 rounded-lg border border-[#5e5ba4]/30 bg-[#5e5ba4]/10 px-3 py-2 text-xs text-[#c7c4f0]">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            You&apos;re already tracking this, saving won&apos;t create a duplicate.
          </div>
        ) : preview ? (
          <div className="rounded-lg border border-[hsl(0,0%,14%)] bg-[hsl(0,0%,9%)] px-3 py-2 text-xs text-muted-foreground">
            In the selected period:{' '}
            <span className="font-semibold text-foreground">{pNum.toLocaleString()}</span> of{' '}
            <span className="font-semibold text-foreground">{pTotal.toLocaleString()}</span>{' '}
            visitors did this
            {pTotal > 0 ? (
              <>
                {' '}
                (<span className="font-semibold text-[#b7b4e4]">{pPct}%</span>)
              </>
            ) : null}
            .
          </div>
        ) : null
      ) : null}

      <div className="grid grid-cols-[1fr_150px] gap-3">
        <div>
          <div className="mb-2 text-[13px] font-semibold text-foreground/90">Name</div>
          <input
            value={effectiveName}
            onChange={e => {
              setName(e.target.value);
              setNameDirty(true);
            }}
            placeholder="Name this goal"
            className="h-10 w-full rounded-lg border border-[hsl(0,0%,16%)] bg-[#18181b] px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-[#5e5ba4] focus:outline-none focus:ring-1 focus:ring-[#5e5ba4]"
          />
        </div>
        <div>
          <div className="mb-2 text-[13px] font-semibold text-foreground/90">
            Weekly target <span className="font-normal text-muted-foreground/60">optional</span>
          </div>
          <input
            value={target}
            onChange={e => setTarget(e.target.value.replace(/[^0-9]/g, ''))}
            inputMode="numeric"
            placeholder="e.g. 25"
            className="h-10 w-full rounded-lg border border-[hsl(0,0%,16%)] bg-[#18181b] px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-[#5e5ba4] focus:outline-none focus:ring-1 focus:ring-[#5e5ba4]"
          />
        </div>
      </div>

      {error ? (
        <div className="text-sm text-red-400">
          {(error as any)?.message || 'Something went wrong'}
        </div>
      ) : null}

      <div className="flex justify-end gap-2.5 pt-1">
        <Button variant="outline" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!canSave || isPending}
          className="border-0 bg-[#5e5ba4] text-white hover:bg-[#5e5ba4]/90"
        >
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {editing ? 'Save changes' : isDuplicate ? 'Done' : 'Create goal'}
        </Button>
      </div>
    </div>
  );
}
