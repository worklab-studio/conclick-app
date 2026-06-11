'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { GoalBuilder } from './GoalBuilder';

export function GoalAddButton({ websiteId }: { websiteId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="border-0 bg-[#5e5ba4] text-white hover:bg-[#5e5ba4]/90">
          <Plus className="mr-1.5 h-4 w-4" /> Goal
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] max-w-md gap-0 overflow-y-auto border-[hsl(0,0%,13%)] bg-[hsl(0,0%,8%)]">
        <DialogHeader className="mb-4">
          <DialogTitle>New goal</DialogTitle>
          <DialogDescription>
            Track when a visitor does something that matters to you.
          </DialogDescription>
        </DialogHeader>
        <GoalBuilder websiteId={websiteId} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
