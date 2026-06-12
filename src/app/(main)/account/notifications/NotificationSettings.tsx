'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Plus, Send, Slack, Trash2, MessageCircle, Info } from 'lucide-react';
import { useApi } from '@/components/hooks/useApi';
import { useToast } from '@umami/react-zen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Channel rows per the approved mockup: brand icon, masked target, digest +
// payment-alert toggles, send-test, remove — plus an add row. Adding a channel
// sends a live test message first, so a dead webhook is never stored.

interface Channel {
  id: string;
  type: 'slack' | 'discord' | 'telegram';
  label: string | null;
  target: string;
  digest: boolean;
  paymentAlerts: boolean;
}

const TYPE_META = {
  slack: { name: 'Slack', icon: Slack, tint: 'bg-[#1a1d21] border border-[#2c2f33] text-white' },
  discord: { name: 'Discord', icon: MessageCircle, tint: 'bg-[#5865f2] text-white' },
  telegram: { name: 'Telegram', icon: Send, tint: 'bg-[#2aabee] text-white' },
} as const;

export function NotificationSettings() {
  const { get, post, del, useQuery } = useApi();
  const { toast } = useToast();

  const {
    data: channels = [],
    refetch,
    isLoading,
  } = useQuery<Channel[]>({
    queryKey: ['notification-channels'],
    queryFn: () => get('/account/notification-channels'),
  });

  const [type, setType] = useState<'slack' | 'discord' | 'telegram'>('slack');
  const [url, setUrl] = useState('');
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  // Feedback after returning from the Slack "Add to Slack" round-trip.
  const params = useSearchParams();
  useEffect(() => {
    const s = params.get('slack');
    if (!s) return;
    if (s === 'connected') {
      toast('Slack connected — sent a welcome message to your channel.');
      refetch();
    } else if (s === 'not-configured') {
      toast('Slack isn’t set up on the server yet.');
    } else if (s === 'error') {
      toast('Slack connection failed — please try again.');
    }
    window.history.replaceState(null, '', '/account?tab=notifications');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const add = async () => {
    setBusy('add');
    try {
      const config = type === 'telegram' ? { botToken, chatId } : { url };
      await post('/account/notification-channels', { type, config });
      toast('Channel connected — a test message just landed there.');
      setUrl('');
      setBotToken('');
      setChatId('');
      refetch();
    } catch (e: any) {
      toast(e?.message || 'Could not add that channel.');
    } finally {
      setBusy(null);
    }
  };

  const toggle = async (c: Channel, field: 'digest' | 'paymentAlerts') => {
    try {
      await post('/account/notification-channels', { id: c.id, [field]: !c[field] });
    } catch (e: any) {
      toast(e?.message || 'Could not update the channel.');
    } finally {
      refetch();
    }
  };

  const test = async (c: Channel) => {
    setBusy(`test:${c.id}`);
    try {
      await post('/account/notification-channels', { id: c.id, action: 'test' });
      toast('Test sent.');
    } catch (e: any) {
      toast(e?.message || 'Test failed.');
    } finally {
      setBusy(null);
    }
  };

  const remove = async (c: Channel) => {
    setBusy(`rm:${c.id}`);
    try {
      await del('/account/notification-channels', { id: c.id });
      refetch();
    } finally {
      setBusy(null);
    }
  };

  const canAdd =
    type === 'telegram' ? botToken.trim().includes(':') && chatId.trim() : url.trim().length > 10;

  return (
    <div className="space-y-4 rounded-2xl border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,8%)] p-6">
      {isLoading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : channels.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No channels yet — add Slack, Discord or Telegram below. Each channel can carry the daily
          digest, instant payment alerts, or both. Your email digest stays on either way.
        </p>
      ) : (
        <div className="space-y-2.5">
          {channels.map(c => {
            const meta = TYPE_META[c.type];
            const Icon = meta.icon;
            return (
              <div
                key={c.id}
                className="flex flex-wrap items-center gap-4 rounded-xl border border-[hsl(0,0%,16%)] bg-[hsl(0,0%,9%)] px-4 py-3.5"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${meta.tint}`}
                >
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold text-foreground">
                    {meta.name}
                    {c.label ? ` — ${c.label}` : ''}
                  </div>
                  <div className="truncate font-mono text-[11px] text-muted-foreground/60">
                    {c.target}
                  </div>
                </div>
                <label className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
                  <Switch checked={c.digest} onCheckedChange={() => toggle(c, 'digest')} />
                  Daily digest
                </label>
                <label className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
                  <Switch
                    checked={c.paymentAlerts}
                    onCheckedChange={() => toggle(c, 'paymentAlerts')}
                  />
                  Payment alerts
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => test(c)}
                  disabled={!!busy}
                  className="h-7 border-[hsl(0,0%,18%)] px-2.5 text-[11px] text-muted-foreground"
                >
                  {busy === `test:${c.id}` ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Send className="mr-1 h-3 w-3" />
                  )}
                  Send test
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => remove(c)}
                  disabled={!!busy}
                  className="h-7 border-red-500/30 px-2.5 text-[11px] text-red-400 hover:bg-red-500/10"
                >
                  {busy === `rm:${c.id}` ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="mr-1 h-3 w-3" />
                  )}
                  Remove
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* One-click connect (Slack OAuth — picks a channel, no URL to copy) */}
      <div className="border-t border-[hsl(0,0%,12%)] pt-4">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/60">
          Connect in one click
        </div>
        <a
          href="/api/slack/connect"
          className="inline-flex items-center gap-2 rounded-lg border border-[#2c2f33] bg-[#1a1d21] px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#24272c]"
        >
          <Slack className="h-4 w-4" /> Add to Slack
        </a>
        <span className="ml-3 text-[11px] text-muted-foreground/50">
          authorize &amp; pick a channel — done · Discord &amp; Telegram one-click coming next
        </span>
      </div>

      {/* Or add any channel manually by webhook URL / bot token */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="mr-1 text-[11px] text-muted-foreground/50">Or add manually:</span>
        <Select value={type} onValueChange={(v: any) => setType(v)}>
          <SelectTrigger className="w-[150px] dark:border-zinc-800 dark:bg-[#18181b]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="dark:border-[hsl(0,0%,14%)] dark:bg-[hsl(0,0%,8%)]">
            <SelectItem value="slack">Slack</SelectItem>
            <SelectItem value="discord">Discord</SelectItem>
            <SelectItem value="telegram">Telegram</SelectItem>
          </SelectContent>
        </Select>

        {type === 'telegram' ? (
          <>
            <Input
              value={botToken}
              onChange={e => setBotToken(e.target.value)}
              placeholder="Bot token (from @BotFather)…"
              className="min-w-[220px] flex-1 font-mono dark:border-zinc-800 dark:bg-[#18181b]"
            />
            <Input
              value={chatId}
              onChange={e => setChatId(e.target.value)}
              placeholder="Chat id…"
              className="w-[140px] font-mono dark:border-zinc-800 dark:bg-[#18181b]"
            />
          </>
        ) : (
          <Input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder={
              type === 'slack'
                ? 'Paste the Slack incoming-webhook URL…'
                : 'Paste the Discord webhook URL…'
            }
            className="min-w-[260px] flex-1 font-mono dark:border-zinc-800 dark:bg-[#18181b]"
          />
        )}

        <Button
          onClick={add}
          disabled={!canAdd || !!busy}
          className="border-0 bg-[#5e5ba4] text-white hover:bg-[#5e5ba4]/90"
        >
          {busy === 'add' ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-1.5 h-4 w-4" />
          )}
          Add channel
        </Button>
      </div>

      <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground/60">
        <Info className="mt-0.5 h-3 w-3 shrink-0" />
        Slack: channel → Integrations → Add an app → Incoming Webhooks. Discord: channel settings →
        Integrations → Webhooks. Telegram: create a bot with @BotFather, then message it and grab
        your chat id from api.telegram.org/bot&lt;token&gt;/getUpdates. We send a test message
        before saving, and store the config encrypted.
      </p>
    </div>
  );
}
