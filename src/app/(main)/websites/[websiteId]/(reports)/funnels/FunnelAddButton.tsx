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
import { FunnelBuilder } from './FunnelBuilder';

export function FunnelAddButton({ websiteId }: { websiteId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          style={{ backgroundColor: '#5e5ba4', color: '#fff' }}
          className="border-0 hover:opacity-90"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Funnel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] max-w-2xl gap-0 overflow-y-auto border-[hsl(0,0%,13%)] bg-[hsl(0,0%,8%)]">
        <DialogHeader className="mb-4">
          <DialogTitle>New funnel</DialogTitle>
          <DialogDescription>See where visitors drop off on the way to a goal.</DialogDescription>
        </DialogHeader>
        <FunnelBuilder websiteId={websiteId} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
