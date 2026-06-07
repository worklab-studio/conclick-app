'use client';

import { useState } from 'react';
import { useApi } from '@/components/hooks/useApi';
import { useToast } from '@umami/react-zen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, CheckCircle2, Plug, X } from 'lucide-react';

// Only providers with a working backend are connectable here.
const PROVIDERS = [
  { id: 'dodo', name: 'Dodo Payments', keyLabel: 'API key', hasMode: true },
  { id: 'stripe', name: 'Stripe', keyLabel: 'Secret key (sk_…)', hasMode: false },
];

export function RevenueIntegrationForm({ websiteId }: { websiteId: string }) {
  const { get, post, del, useQuery } = useApi();
  const { toast } = useToast();

  const { data: status, refetch } = useQuery({
    queryKey: ['integration-status', websiteId],
    queryFn: () => get(`/websites/${websiteId}/integrations`),
  });

  const [provider, setProvider] = useState('dodo');
  const [apiKey, setApiKey] = useState('');
  const [mode, setMode] = useState('test');
  const [busy, setBusy] = useState(false);

  const cfg = PROVIDERS.find(p => p.id === provider) ?? PROVIDERS[0];

  const connect = async () => {
    if (!apiKey.trim()) return;
    setBusy(true);
    try {
      const credentials: Record<string, string> = { apiKey: apiKey.trim() };
      if (cfg.hasMode) credentials.mode = mode;
      await post(`/websites/${websiteId}/integrations`, { provider, credentials });
      toast('Connected. Revenue will appear on the Revenue tab.');
      setApiKey('');
      refetch();
    } catch (e: any) {
      toast(e?.message || 'Could not connect — double-check the key and try again.');
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await del(`/websites/${websiteId}/integrations`);
      toast('Disconnected.');
      refetch();
    } catch (e: any) {
      toast(e?.message || 'Could not disconnect.');
    } finally {
      setBusy(false);
    }
  };

  if (status?.connected) {
    const connectedName = PROVIDERS.find(p => p.id === status.provider)?.name || status.provider;
    return (
      <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] p-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          <div>
            <div className="text-sm font-semibold text-foreground">
              Connected to {connectedName}
            </div>
            <div className="text-xs text-muted-foreground">
              Revenue is syncing on the Revenue tab.
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={disconnect}
          disabled={busy}
          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        >
          {busy ? (
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          ) : (
            <X className="mr-2 h-3.5 w-3.5" />
          )}
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Connect a payment provider to pull revenue into the dashboard and tie it to your traffic.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Provider</label>
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger className="dark:border-zinc-800 dark:bg-[#18181b]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="dark:border-[hsl(0,0%,14%)] dark:bg-[hsl(0,0%,8%)]">
              {PROVIDERS.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {cfg.hasMode && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Mode</label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger className="dark:border-zinc-800 dark:bg-[#18181b]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="dark:border-[hsl(0,0%,14%)] dark:bg-[hsl(0,0%,8%)]">
                <SelectItem value="test">Test</SelectItem>
                <SelectItem value="live">Live</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">{cfg.keyLabel}</label>
        <Input
          type="password"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder="Paste your key…"
          autoComplete="off"
          className="font-mono dark:border-zinc-800 dark:bg-[#18181b]"
        />
      </div>

      <Button
        onClick={connect}
        disabled={busy || !apiKey.trim()}
        style={{ backgroundColor: '#5e5ba4', color: 'white' }}
        className="border-0 hover:opacity-90"
      >
        {busy ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Plug className="mr-2 h-4 w-4" />
        )}
        Connect {cfg.name}
      </Button>

      <p className="text-xs text-muted-foreground">
        Your key is validated with a live API call, then stored encrypted. We never display it
        again.
      </p>
    </div>
  );
}
