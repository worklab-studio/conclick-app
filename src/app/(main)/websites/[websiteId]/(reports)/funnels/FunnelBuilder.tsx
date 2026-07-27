'use client';

import { useMemo, useState } from 'react';
import {
  Plus,
  X,
  ChevronUp,
  ChevronDown,
  Loader2,
  UserPlus,
  ShoppingCart,
  Mail,
  Phone,
  FileText,
  FilePlus,
  type LucideIcon,
} from 'lucide-react';
import {
  useDateRange,
  useUpdateQuery,
  useWebsiteValuesQuery,
  useFunnelQuery,
} from '@/components/hooks';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  FUNNEL_TEMPLATES,
  applyTemplate,
  type FunnelStep,
  type TemplateIcon,
} from '@/lib/funnel-templates';
import { FunnelSuggestions, type FunnelSuggestion } from './FunnelSuggestions';
import { FunnelChart } from './FunnelChart';

const WINDOW_PRESETS = [
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '1 day', value: 1440 },
  { label: '7 days', value: 10080 },
  { label: '30 days', value: 43200 },
];

const TPL_ICON: Record<TemplateIcon, LucideIcon> = {
  signup: UserPlus,
  cart: ShoppingCart,
  mail: Mail,
  phone: Phone,
};

function funnelName(steps: FunnelStep[]) {
  const first = steps[0]?.value;
  const last = steps[steps.length - 1]?.value;
  if (first && last && first !== last) return `${first} → ${last} funnel`;
  return 'New funnel';
}

const blankSteps = (): FunnelStep[] => [
  { type: 'path', value: '' },
  { type: 'path', value: '' },
];

/**
 * Conclick-native funnel builder (replaces react-zen FunnelEditForm for create).
 * Templates with smart auto-fill, journey-based suggestions, a visual step
 * builder, and friendly "complete within" presets. Saves the same
 * parameters:{window,steps} payload as the old form.
 */
export function FunnelBuilder({
  websiteId,
  onClose,
  initialSteps,
  initialWindow,
}: {
  websiteId: string;
  onClose: () => void;
  initialSteps?: FunnelStep[];
  initialWindow?: number;
}) {
  const [steps, setSteps] = useState<FunnelStep[]>(() =>
    initialSteps?.length ? initialSteps : blankSteps(),
  );
  const [windowMinutes, setWindowMinutes] = useState(initialWindow ?? 60);
  const [name, setName] = useState('');
  const [nameDirty, setNameDirty] = useState(false);
  const { mutateAsync, isPending, error, touch } = useUpdateQuery('/reports');

  const {
    dateRange: { startDate, endDate },
  } = useDateRange();
  const { data: pagesData } = useWebsiteValuesQuery({
    websiteId,
    type: 'path',
    startDate,
    endDate,
    clean: true,
  });
  const pages = useMemo(
    () => ((pagesData || []) as { value: string }[]).map(d => d.value),
    [pagesData],
  );

  const effectiveName = nameDirty ? name : funnelName(steps);
  const canSave = steps.length >= 2 && steps.every(s => !!s.value) && !!effectiveName;

  // Live preview — runs the real funnel engine on the current valid steps.
  const { data: previewData } = useFunnelQuery(websiteId, { steps, window: windowMinutes });
  const previewRows = (previewData as any[]) || [];

  const setStep = (i: number, patch: Partial<FunnelStep>) =>
    setSteps(prev => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const addStep = () =>
    setSteps(prev => (prev.length >= 8 ? prev : [...prev, { type: 'path', value: '' }]));
  const removeStep = (i: number) =>
    setSteps(prev => (prev.length <= 2 ? prev : prev.filter((_, idx) => idx !== i)));
  const move = (i: number, dir: -1 | 1) =>
    setSteps(prev => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const pickTemplate = (id: string) => {
    const tpl = FUNNEL_TEMPLATES.find(t => t.id === id);
    if (!tpl) return;
    const filled = applyTemplate(tpl, pages);
    setSteps(filled.length >= 2 ? filled : [...filled, { type: 'path', value: '' }]);
  };
  const pickSuggestion = (s: FunnelSuggestion) => setSteps(s.steps);

  const handleSave = async () => {
    await mutateAsync(
      {
        type: 'funnel',
        name: effectiveName,
        websiteId,
        parameters: { window: windowMinutes, steps },
      },
      {
        onSuccess: () => {
          touch('reports:funnel');
          onClose();
        },
      },
    );
  };

  return (
    <div className="space-y-5">
      {/* templates */}
      <div>
        <div className="mb-2 text-[13px] font-semibold text-foreground/90">
          Start from a template
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSteps(blankSteps())}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[hsl(0,0%,16%)] bg-[#18181b] px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <FileText className="h-3.5 w-3.5" /> Blank
          </button>
          {FUNNEL_TEMPLATES.map(t => {
            const Icon = TPL_ICON[t.icon] || FilePlus;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => pickTemplate(t.id)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[hsl(0,0%,16%)] bg-[#18181b] px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:border-[#5e5ba4]/50 hover:text-foreground"
              >
                <Icon className="h-3.5 w-3.5 text-[#b7b4e4]" /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <FunnelSuggestions websiteId={websiteId} onPick={pickSuggestion} />

      {/* steps */}
      <div>
        <div className="mb-2 text-[13px] font-semibold text-foreground/90">Steps</div>
        <div className="space-y-2">
          {steps.map((step, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 rounded-xl border border-[hsl(0,0%,14%)] bg-[hsl(0,0%,9.5%)] p-2.5"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#5e5ba4] text-xs font-bold text-white">
                {i + 1}
              </span>
              <div className="inline-flex shrink-0 overflow-hidden rounded-lg border border-[hsl(0,0%,16%)]">
                {(['path', 'event'] as const).map(tp => (
                  <button
                    key={tp}
                    type="button"
                    onClick={() => setStep(i, { type: tp, value: '' })}
                    className={`px-2.5 py-1.5 text-xs transition-colors ${
                      step.type === tp
                        ? 'bg-[#5e5ba4]/22 text-white'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tp === 'path' ? 'Page' : 'Event'}
                  </button>
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <StepValueSelect
                  websiteId={websiteId}
                  type={step.type}
                  value={step.value}
                  onChange={v => setStep(i, { value: v })}
                />
              </div>
              <div className="flex shrink-0 items-center gap-0.5 text-muted-foreground/60">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="rounded p-1 transition-colors hover:bg-[hsl(0,0%,14%)] hover:text-foreground disabled:opacity-30"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === steps.length - 1}
                  className="rounded p-1 transition-colors hover:bg-[hsl(0,0%,14%)] hover:text-foreground disabled:opacity-30"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removeStep(i)}
                  disabled={steps.length <= 2}
                  className="rounded p-1 transition-colors hover:bg-[hsl(0,0%,14%)] hover:text-foreground disabled:opacity-30"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
        {steps.length < 8 ? (
          <button
            type="button"
            onClick={addStep}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[hsl(0,0%,20%)] py-2.5 text-[13px] text-[#b7b4e4] transition-colors hover:bg-[hsl(0,0%,9%)]"
          >
            <Plus className="h-4 w-4" /> Add step
          </button>
        ) : null}
      </div>

      {/* live preview */}
      {canSave && previewRows.length >= 2 ? (
        <div>
          <div className="mb-2 text-[13px] font-semibold text-foreground/90">Preview</div>
          <div className="rounded-xl border border-[hsl(0,0%,14%)] bg-[hsl(0,0%,9%)] p-3">
            {(previewRows[0]?.visitors || 0) > 0 ? (
              <FunnelChart rows={previewRows} />
            ) : (
              <div className="py-4 text-center text-xs text-muted-foreground">
                No visitors match these steps in the selected date range yet.
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* within + name */}
      <div className="flex gap-3">
        <div className="flex-1">
          <div className="mb-2 text-[13px] font-semibold text-foreground/90">Complete within</div>
          <Select value={String(windowMinutes)} onValueChange={v => setWindowMinutes(Number(v))}>
            <SelectTrigger className="h-10 border-[hsl(0,0%,16%)] bg-[#18181b]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WINDOW_PRESETS.map(p => (
                <SelectItem key={p.value} value={String(p.value)}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <div className="mb-2 text-[13px] font-semibold text-foreground/90">Name</div>
          <input
            value={effectiveName}
            onChange={e => {
              setName(e.target.value);
              setNameDirty(true);
            }}
            className="h-10 w-full rounded-lg border border-[hsl(0,0%,16%)] bg-[#18181b] px-3 text-sm text-foreground focus:border-[#5e5ba4] focus:outline-none focus:ring-1 focus:ring-[#5e5ba4]"
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
          Create funnel
        </Button>
      </div>
    </div>
  );
}

// Compact per-step value picker: a Select populated with the site's real top
// pages/events (shared cache across steps of the same type).
function StepValueSelect({
  websiteId,
  type,
  value,
  onChange,
}: {
  websiteId: string;
  type: 'path' | 'event';
  value: string;
  onChange: (v: string) => void;
}) {
  const {
    dateRange: { startDate, endDate },
  } = useDateRange();
  const { data } = useWebsiteValuesQuery({ websiteId, type, startDate, endDate, clean: true });
  const opts = (data || []) as { value: string; count: number }[];
  const all = value && !opts.some(o => o.value === value) ? [{ value, count: 0 }, ...opts] : opts;

  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className="h-9 border-[hsl(0,0%,16%)] bg-[#18181b]">
        <SelectValue placeholder={type === 'event' ? 'Choose an event…' : 'Choose a page…'} />
      </SelectTrigger>
      <SelectContent className="max-h-64">
        {all.length === 0 ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">
            {type === 'event' ? 'No events tracked yet' : 'No pages found'}
          </div>
        ) : (
          all.map(o => (
            <SelectItem key={o.value} value={o.value}>
              <span className="flex items-center gap-2">
                <span className="truncate">{o.value}</span>
                {o.count > 0 ? (
                  <span className="text-xs text-muted-foreground/60">
                    {o.count.toLocaleString()}
                  </span>
                ) : null}
              </span>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
