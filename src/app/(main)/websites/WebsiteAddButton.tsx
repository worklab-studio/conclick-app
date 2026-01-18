import { useMessages, useModified } from '@/components/hooks';
import { useToast } from '@umami/react-zen';
import { Plus } from 'lucide-react';
import { WebsiteAddModalContent } from './WebsiteAddModalContent';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useState } from 'react';

export function WebsiteAddButton({ teamId, onSave }: { teamId: string; onSave?: () => void }) {
  const { formatMessage, labels, messages } = useMessages();
  const { toast } = useToast();
  const { touch } = useModified();
  const [open, setOpen] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  const handleSave = async () => {
    toast(formatMessage(messages.saved));
    setHasSaved(true);
  };

  const handleClose = () => {
    setOpen(false);
    if (hasSaved) {
      touch('websites');
      onSave?.();
      setHasSaved(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={val => !val && handleClose()}>
      <DialogTrigger asChild>
        <Button
          className="gap-2 bg-[#5e5ba4] hover:bg-[#4e4b95] text-white border-0"
          onClick={() => setOpen(true)}
        >
          <Plus className="h-4 w-4" />
          {formatMessage(labels.addWebsite)}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-[500px] dark:bg-[hsl(0,0%,8%)] border-0 focus:ring-0 focus:outline-none ring-0 outline-none"
        onInteractOutside={e => e.preventDefault()}
        onEscapeKeyDown={e => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-foreground">{formatMessage(labels.addWebsite)}</DialogTitle>
        </DialogHeader>
        <WebsiteAddModalContent teamId={teamId} onSave={handleSave} onClose={handleClose} />
      </DialogContent>
    </Dialog>
  );
}
