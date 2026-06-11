'use client';

import { useState } from 'react';
import { Filter } from 'lucide-react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { FunnelBuilder } from '../funnels/FunnelBuilder';
import type { FunnelStep } from '@/lib/funnel-templates';

// "Funnel to this goal" — opens the funnel builder prefilled with entry → this
// goal, so a goal becomes a drop-off analysis in two clicks.
export function GoalFunnelButton({
  websiteId,
  goalType,
  goalValue,
}: {
  websiteId: string;
  goalType: string;
  goalValue: string;
}) {
  const [open, setOpen] = useState(false);

  const initialSteps: FunnelStep[] = [
    { type: 'path', value: '/' },
    { type: goalType === 'path' ? 'path' : 'event', value: goalValue },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Funnel to this goal"
          title="Funnel to this goal"
          className="rounded-md p-1.5 text-muted-foreground/60 transition-colors hover:bg-[hsl(0,0%,12%)] hover:text-[#b7b4e4]"
        >
          <Filter className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] max-w-2xl gap-0 overflow-y-auto border-[hsl(0,0%,13%)] bg-[hsl(0,0%,8%)]">
        <DialogHeader className="mb-4">
          <DialogTitle>Funnel to this goal</DialogTitle>
          <DialogDescription>
            See where visitors drop off on the way to “{goalValue}”.
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <FunnelBuilder
            websiteId={websiteId}
            onClose={() => setOpen(false)}
            initialSteps={initialSteps}
            initialWindow={1440}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
