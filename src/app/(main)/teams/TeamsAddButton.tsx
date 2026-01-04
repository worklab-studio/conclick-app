import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { useMessages, useModified } from '@/components/hooks';
import { TeamAddForm } from './TeamAddForm';
import { messages } from '@/components/messages';
import { useState } from 'react';

export function TeamsAddButton({ onSave }: { onSave?: () => void }) {
  const { formatMessage, labels } = useMessages();
  const { touch } = useModified();
  const [open, setOpen] = useState(false);

  const handleSave = async () => {
    touch('teams');
    onSave?.();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-[#5e5ba4] hover:bg-[#5e5ba4]/90 text-white">
          <Plus className="h-4 w-4" />
          {formatMessage(labels.createTeam)}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] dark:bg-[hsl(0,0%,8%)] dark:border-[hsl(0,0%,12%)]">
        <DialogHeader>
          <DialogTitle className="text-foreground">{formatMessage(labels.createTeam)}</DialogTitle>
        </DialogHeader>
        <TeamAddForm onSave={handleSave} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
