'use client';

import { useState } from 'react';
import { Eye, Zap, Loader2, type LucideIcon } from 'lucide-react';
import { useUpdateQuery } from '@/components/hooks';
import { Button } from '@/components/ui/button';
import { MetricValuePicker } from '@/components/input/MetricValuePicker';

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
 * Conclick-native goal builder (replaces the react-zen GoalEditForm for the
 * create flow). Plain language + pick-from-your-site. Saves the same
 * parameters:{type,value} payload the old form used, so existing goals still
 * compute correctly.
 */
export function GoalBuilder({ websiteId, onClose }: { websiteId: string; onClose: () => void }) {
  const [type, setType] = useState<GoalType>('path');
  const [value, setValue] = useState('');
  const [name, setName] = useState('');
  const [nameDirty, setNameDirty] = useState(false);
  const { mutateAsync, isPending, error, touch } = useUpdateQuery('/reports');

  const effectiveName = nameDirty ? name : defaultName(type, value);
  const canSave = !!value && !!effectiveName;

  const handleSave = async () => {
    await mutateAsync(
      { type: 'goal', name: effectiveName, websiteId, parameters: { type, value } },
      {
        onSuccess: () => {
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
          <span className="font-normal text-muted-foreground/60">— pick from your site</span>
        </div>
        <MetricValuePicker websiteId={websiteId} type={type} value={value} onChange={setValue} />
      </div>

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
          style={{ backgroundColor: '#5e5ba4', color: '#fff' }}
          className="border-0 hover:opacity-90"
        >
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Create goal
        </Button>
      </div>
    </div>
  );
}
