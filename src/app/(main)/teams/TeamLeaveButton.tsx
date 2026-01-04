import { useLoginQuery, useMessages, useModified } from '@/components/hooks';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { TeamLeaveForm } from './TeamLeaveForm';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useState } from 'react';

export function TeamLeaveButton({ teamId, teamName }: { teamId: string; teamName: string }) {
  const { formatMessage, labels } = useMessages();
  const router = useRouter();
  const { user } = useLoginQuery();
  const { touch } = useModified();
  const [open, setOpen] = useState(false);

  const handleLeave = async () => {
    touch('teams');
    router.push('/settings/teams');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <LogOut className="h-4 w-4" />
          {formatMessage(labels.leave)}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{formatMessage(labels.leaveTeam)}</DialogTitle>
        </DialogHeader>
        <TeamLeaveForm
          teamId={teamId}
          userId={user.id}
          teamName={teamName}
          onSave={handleLeave}
          onClose={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
