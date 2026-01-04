import { useState } from 'react';
import { getRandomChars } from '@/lib/generate';
import { useMessages, useUpdateQuery, useConfig } from '@/components/hooks';
import { RefreshCcw, Copy, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const generateId = () => getRandomChars(16);

export interface WebsiteShareFormProps {
  websiteId: string;
  shareId?: string;
  onSave?: () => void;
  onClose?: () => void;
}

export function WebsiteShareForm({ websiteId, shareId, onSave, onClose }: WebsiteShareFormProps) {
  const { formatMessage, labels, messages } = useMessages();
  const [currentId, setCurrentId] = useState(shareId);
  const { mutateAsync, isPending, touch, toast } = useUpdateQuery(`/websites/${websiteId}`);
  const { cloudMode } = useConfig();
  const [copied, setCopied] = useState(false);

  const getUrl = (shareId: string) => {
    if (cloudMode) {
      return `${process.env.cloudUrl}/share/${shareId}`;
    }

    return `${window?.location.origin}${process.env.basePath || ''}/share/${shareId}`;
  };

  const url = getUrl(currentId || '');

  const handleGenerate = () => {
    setCurrentId(generateId());
  };

  const handleSwitch = (checked: boolean) => {
    setCurrentId(checked ? generateId() : undefined);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      shareId: currentId ?? null,
    };
    await mutateAsync(data, {
      onSuccess: async () => {
        toast(formatMessage(messages.saved));
        touch(`website:${websiteId}`);
        onSave?.();
        onClose?.();
      },
    });
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="flex items-center space-x-2">
        <Switch
          id="share-url"
          checked={!!currentId}
          onCheckedChange={handleSwitch}
          className="data-[state=checked]:bg-[#5e5ba4]"
        />
        <Label htmlFor="share-url" className="text-zinc-200">{formatMessage(labels.enableShareUrl)}</Label>
      </div>

      {currentId && (
        <div className="space-y-2">
          <Label className="text-zinc-200">{formatMessage(labels.shareUrl)}</Label>
          <div className="flex space-x-2">
            <Input value={url} readOnly className="dark:bg-[#18181b] dark:border-zinc-800 dark:text-zinc-200 focus-visible:ring-[#5e5ba4]" />
            <Button type="button" variant="outline" size="icon" onClick={handleGenerate} title={formatMessage(labels.regenerate)} className="!bg-transparent border-zinc-700 text-zinc-400 hover:!bg-zinc-800 hover:text-white">
              <RefreshCcw className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" onClick={copyToClipboard} title="Copy URL" className="!bg-transparent border-zinc-700 text-zinc-400 hover:!bg-zinc-800 hover:text-white">
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}

      <div className="flex justify-end pt-4 gap-2">
        {onClose && (
          <Button type="button" variant="ghost" onClick={onClose} className="text-zinc-400 hover:text-white hover:bg-zinc-800/50">
            {formatMessage(labels.cancel)}
          </Button>
        )}
        <Button type="submit" disabled={isPending} style={{ backgroundColor: '#5e5ba4', color: 'white' }} className="hover:opacity-90 font-medium border-0">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {formatMessage(labels.save)}
        </Button>
      </div>
    </form>
  );
}
