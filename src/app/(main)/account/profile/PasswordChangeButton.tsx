import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { PasswordEditForm } from './PasswordEditForm';
import { Lock } from 'lucide-react';
import { useMessages } from '@/components/hooks';
import { useState } from 'react';
import { toast } from 'sonner';

export function PasswordChangeButton() {
  const { formatMessage, labels, messages } = useMessages();
  const [open, setOpen] = useState(false);

  const handleSave = () => {
    toast.success(formatMessage(messages.saved));
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800">
          <Lock className="h-4 w-4" />
          {formatMessage(labels.changePassword)}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] dark:bg-[hsl(0,0%,8%)] dark:border-[hsl(0,0%,12%)]">
        <DialogHeader>
          <DialogTitle className="text-foreground">{formatMessage(labels.changePassword)}</DialogTitle>
        </DialogHeader>
        <PasswordEditForm onSave={handleSave} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
