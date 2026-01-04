import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { UserPlus } from 'lucide-react';
import { useMessages, useModified } from '@/components/hooks';
import { TeamJoinForm } from './TeamJoinForm';
import { useState } from 'react';

export function TeamsJoinButton() {
  const { formatMessage, labels, messages } = useMessages();
  const { touch } = useModified();
  const [open, setOpen] = useState(false);

  const handleJoin = () => {
    touch('teams');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800">
          <UserPlus className="h-4 w-4" />
          {formatMessage(labels.joinTeam)}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] dark:bg-[hsl(0,0%,8%)] dark:border-[hsl(0,0%,12%)]">
        <DialogHeader>
          <DialogTitle className="text-foreground">{formatMessage(labels.joinTeam)}</DialogTitle>
        </DialogHeader>
        <TeamJoinForm onSave={handleJoin} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
