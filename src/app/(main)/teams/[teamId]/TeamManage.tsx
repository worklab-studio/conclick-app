import { useMessages, useModified } from '@/components/hooks';
import { useRouter } from 'next/navigation';
import { TeamDeleteForm } from './TeamDeleteForm';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useState } from 'react';

export function TeamManage({ teamId }: { teamId: string }) {
  const { formatMessage, labels, messages } = useMessages();
  const router = useRouter();
  const { touch } = useModified();
  const [open, setOpen] = useState(false);

  const handleLeave = async () => {
    touch('teams');
    router.push('/settings/teams');
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-medium">{formatMessage(labels.deleteTeam)}</h3>
        <p className="text-sm text-zinc-500">{formatMessage(messages.deleteTeamWarning)}</p>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="destructive">{formatMessage(labels.delete)}</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{formatMessage(labels.deleteTeam)}</DialogTitle>
          </DialogHeader>
          <TeamDeleteForm teamId={teamId} onSave={handleLeave} onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
