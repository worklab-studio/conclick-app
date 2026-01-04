import { useMessages, useModified, useNavigation } from '@/components/hooks';
import { WebsiteDeleteForm } from './WebsiteDeleteForm';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';

export function WebsiteData({ websiteId, onSave }: { websiteId: string; onSave?: () => void }) {
  const { formatMessage, labels, messages } = useMessages();
  const { touch } = useModified();
  const { router, renderUrl } = useNavigation();
  const [open, setOpen] = useState(false);

  const handleSave = () => {
    touch('websites');
    onSave?.();
    router.push(renderUrl(`/websites`));
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="border border-red-200 dark:border-red-900/30 rounded-lg p-4 bg-red-50/50 dark:bg-red-900/10">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h4 className="font-medium text-red-900 dark:text-red-200">{formatMessage(labels.deleteWebsite)}</h4>
            <p className="text-sm text-red-700 dark:text-red-300">
              {formatMessage(messages.deleteWebsiteWarning)}
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" className="gap-2">
                <Trash2 className="h-4 w-4" />
                {formatMessage(labels.delete)}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-white dark:bg-[hsl(0,0%,8%)] dark:border-[hsl(0,0%,12%)]">
              <DialogHeader>
                <DialogTitle className="text-foreground">{formatMessage(labels.deleteWebsite)}</DialogTitle>
              </DialogHeader>
              <WebsiteDeleteForm websiteId={websiteId} onSave={handleSave} onClose={() => setOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
