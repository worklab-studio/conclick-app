import { useState } from 'react';
import { getRandomChars } from '@/lib/generate';
import { useMessages, useUpdateQuery, useConfig } from '@/components/hooks';
import { RefreshCcw, Copy, Check, Loader2, Link2, ExternalLink, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

const generateId = () => getRandomChars(16);

export interface WebsiteShareFormProps {
  websiteId: string;
  shareId?: string;
  onSave?: () => void;
  onClose?: () => void;
}

export function WebsiteShareForm({ websiteId, shareId, onSave, onClose }: WebsiteShareFormProps) {
  const { formatMessage, labels } = useMessages();
  const [currentId, setCurrentId] = useState(shareId);
  const { mutateAsync, isPending, touch, toast } = useUpdateQuery(`/websites/${websiteId}`);
  const { cloudMode } = useConfig();
  const [copied, setCopied] = useState(false);

  const getUrl = (id: string) =>
    cloudMode
      ? `${process.env.cloudUrl}/share/${id}`
      : `${window?.location.origin}${process.env.basePath || ''}/share/${id}`;

  const url = currentId ? getUrl(currentId) : '';

  // Persist immediately so the link is live the moment it's toggled on /
  // regenerated — no separate "Save" step.
  const persist = async (id: string | null) => {
    setCurrentId(id ?? undefined);
    await mutateAsync(
      { shareId: id },
      {
        onSuccess: () => {
          touch(`website:${websiteId}`);
          onSave?.();
        },
      },
    );
  };

  const handleSwitch = (checked: boolean) => persist(checked ? generateId() : null);
  const handleGenerate = async () => {
    await persist(generateId());
    toast('New link generated, the old one no longer works.');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast('Link copied to clipboard.');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Intro */}
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#5e5ba4]/15 text-indigo-300 ring-1 ring-inset ring-[#5e5ba4]/30">
          <Link2 className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Public dashboard link</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Share a live, read-only dashboard. Anyone with the link can view, no account needed.
          </p>
        </div>
      </div>

      {/* Toggle */}
      <div className="flex items-center justify-between rounded-lg border border-[hsl(0,0%,14%)] bg-[hsl(0,0%,7%)] px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
          <Eye className="h-4 w-4 text-muted-foreground" />
          {formatMessage(labels.enableShareUrl)}
        </div>
        <div className="flex items-center gap-2">
          {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <Switch
            id="share-url"
            checked={!!currentId}
            onCheckedChange={handleSwitch}
            disabled={isPending}
            className="data-[state=checked]:bg-[#5e5ba4]"
          />
        </div>
      </div>

      {/* Link */}
      {currentId && (
        <div className="space-y-3 rounded-lg border border-[hsl(0,0%,14%)] bg-[hsl(0,0%,7%)] p-4">
          <div className="flex items-center gap-2">
            <Input
              value={url}
              readOnly
              onFocus={e => e.currentTarget.select()}
              className="font-mono text-xs dark:border-zinc-800 dark:bg-[#0f0f12] dark:text-zinc-200 focus-visible:ring-[#5e5ba4]"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleGenerate}
              title={formatMessage(labels.regenerate)}
              className="shrink-0 border-zinc-700 !bg-transparent text-zinc-400 hover:!bg-zinc-800 hover:text-white"
            >
              <RefreshCcw className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => window.open(url, '_blank')}
              title="Open in new tab"
              className="shrink-0 border-zinc-700 !bg-transparent text-zinc-400 hover:!bg-zinc-800 hover:text-white"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
          <Button
            type="button"
            onClick={copyToClipboard}
            style={{ backgroundColor: '#5e5ba4', color: '#fff' }}
            className="w-full border-0 font-medium hover:opacity-90"
          >
            {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
            {copied ? 'Copied!' : 'Copy link'}
          </Button>
          <p className="text-xs text-muted-foreground">
            Anyone with this link can view this dashboard. Regenerate to instantly revoke the old
            link.
          </p>
        </div>
      )}

      <div className="flex justify-end pt-1">
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          className="text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
        >
          Done
        </Button>
      </div>
    </div>
  );
}
