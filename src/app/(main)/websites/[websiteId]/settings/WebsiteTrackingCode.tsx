import { useMessages, useConfig } from '@/components/hooks';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

const SCRIPT_NAME = 'script.js';

export function WebsiteTrackingCode({
  websiteId,
  hostUrl,
}: {
  websiteId: string;
  hostUrl?: string;
}) {
  const { formatMessage, messages, labels } = useMessages();
  const config = useConfig();
  const [copied, setCopied] = useState(false);

  const trackerScriptName =
    config?.trackerScriptName?.split(',')?.map((n: string) => n.trim())?.[0] || SCRIPT_NAME;

  const getUrl = () => {
    if (config?.cloudMode) {
      return `${process.env.cloudUrl}/${trackerScriptName}`;
    }

    return `${hostUrl || window?.location?.origin || ''}${process.env.basePath || ''
      }/${trackerScriptName}`;
  };

  const url = trackerScriptName?.startsWith('http') ? trackerScriptName : getUrl();

  const code = `<script defer src="${url}" data-website-id="${websiteId}"></script>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2">
      <Label>{formatMessage(labels.trackingCode)}</Label>
      <p className="text-sm text-muted-foreground">{formatMessage(messages.trackingCode)}</p>
      <div className="relative group">
        <div className="font-mono text-xs bg-[#18181b] p-4 rounded-md border border-zinc-800 overflow-x-auto whitespace-pre-wrap break-all">
          <span style={{ color: '#89ddff' }}>&lt;script</span>{' '}
          <span style={{ color: '#c792ea' }}>defer</span>{' '}
          <span style={{ color: '#c792ea' }}>src</span>
          <span style={{ color: '#89ddff' }}>=</span>
          <span style={{ color: '#c3e88d' }}>"{url}"</span>{' '}
          <span style={{ color: '#c792ea' }}>data-website-id</span>
          <span style={{ color: '#89ddff' }}>=</span>
          <span style={{ color: '#c3e88d' }}>"{websiteId}"</span>
          <span style={{ color: '#89ddff' }}>&gt;&lt;/script&gt;</span>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity dark:bg-zinc-900 dark:border-zinc-800"
          onClick={copyToClipboard}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>
    </div>
  );
}
