'use client';

import { MousePointerClick, Loader2, Flame, MousePointerBan, FileX2, Info } from 'lucide-react';
import { useFrustrationQuery } from '@/components/hooks';
import { TabEmptyState } from '@/components/common/TabEmptyState';

const TYPE_META: Record<string, { label: string; icon: any; what: string }> = {
  rage: {
    label: 'Rage clicks',
    icon: Flame,
    what: 'Clicked the same spot 4+ times fast and the page ignored every one',
  },
  dead: {
    label: 'Dead click',
    icon: MousePointerBan,
    what: 'Looks clickable, but clicking produced no response at all',
  },
  form_abandon: {
    label: 'Form abandon',
    icon: FileX2,
    what: 'Started filling this form and left without submitting',
  },
};

/**
 * Where visitors get stuck — element-level only, never what they type.
 *
 * Color is EARNED by evidence, not sprayed by type: a signal seen in one
 * session renders neutral (could be one confused person); it only takes an
 * amber accent at 2+ sessions and rose at 3+ sessions or any multi-session
 * rage. The tracker itself (v2) only reports clicks the page demonstrably
 * ignored — DOM-mutation / navigation / scroll / text-selection all exonerate
 * — so what reaches this table is already high-precision.
 */
export function FrictionInline({ websiteId }: { websiteId: string }) {
  const { data, isLoading } = useFrustrationQuery(websiteId);
  const rows = Array.isArray(data) ? data : [];

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  if (!rows.length) {
    return (
      <TabEmptyState
        icon={MousePointerClick}
        title="No friction detected"
        description="Nothing to fix right now. Signals only appear when a click demonstrably went nowhere, working buttons and text-selection never count. Autocapture must be on in Settings."
      />
    );
  }

  const sessionsOf = (r: any) => Number(r.sessions) || 1;
  const severity = (r: any): 'high' | 'medium' | 'low' => {
    const s = sessionsOf(r);
    if ((r.type === 'rage' && s >= 2) || s >= 3) return 'high';
    if (s >= 2) return 'medium';
    return 'low';
  };
  const ACCENT: Record<string, string> = {
    high: 'bg-rose-400',
    medium: 'bg-amber-400',
    low: 'bg-zinc-700',
  };
  const strong = rows.filter(r => severity(r) !== 'low').length;

  return (
    <div>
      <div className="flex items-center justify-between px-7 pb-1 pt-4">
        <div className="text-sm text-muted-foreground">
          {strong > 0 ? (
            <>
              <span className="font-semibold text-foreground">{strong}</span> issue
              {strong === 1 ? '' : 's'} seen in multiple sessions
              {rows.length > strong ? (
                <span className="text-muted-foreground/60">
                  {' '}
                  · {rows.length - strong} single-session (grey, may be one-offs)
                </span>
              ) : null}
            </>
          ) : (
            <>Only single-session signals so far, grey until they repeat across visitors.</>
          )}
        </div>
        <div
          className="hidden items-center gap-1.5 text-xs text-muted-foreground/60 md:flex"
          title="A click only counts as friction when the page demonstrably ignored it: no DOM change, no navigation, no scroll, and no text selection within the response window."
        >
          <Info className="h-3.5 w-3.5" />
          verified signals only
        </div>
      </div>

      <div className="divide-y divide-[hsl(0,0%,10%)]">
        {rows.map((r: any, i: number) => {
          const meta = TYPE_META[r.type] || {
            label: r.type,
            icon: MousePointerClick,
            what: '',
          };
          const Icon = meta.icon;
          const sev = severity(r);
          const sessions = sessionsOf(r);
          return (
            <div
              key={`${r.type}:${r.selector}:${i}`}
              className={`flex items-center gap-4 px-7 py-3.5 ${sev === 'low' ? 'opacity-60' : ''}`}
            >
              <span className={`h-9 w-1 shrink-0 rounded-full ${ACCENT[sev]}`} aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  {r.text ? (
                    <span className="truncate text-sm font-medium text-foreground">“{r.text}”</span>
                  ) : (
                    <span className="truncate font-mono text-sm text-foreground">{r.selector}</span>
                  )}
                  {r.text ? (
                    <span className="hidden truncate font-mono text-[11px] text-muted-foreground/50 sm:inline">
                      {r.selector}
                    </span>
                  ) : null}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                  <span>{meta.label}</span>
                  {meta.what ? (
                    <span className="hidden text-muted-foreground/50 md:inline">, {meta.what}</span>
                  ) : null}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-sm font-semibold tabular-nums text-foreground">
                  {sessions} session{sessions === 1 ? '' : 's'}
                </div>
                <div className="text-[11px] tabular-nums text-muted-foreground/60">
                  {r.count}× total
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
