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
import { Loader2, CheckCircle2, Plug, X, ArrowLeft, ArrowRight } from 'lucide-react';

// Only providers with a working backend are connectable here. `hasProducts`
// providers (e.g. Dodo, whose one account can hold many products) get a second
// step to scope this website's revenue to specific products.
const PROVIDERS = [
  { id: 'dodo', name: 'Dodo Payments', keyLabel: 'API key', hasMode: true, hasProducts: true },
  {
    id: 'stripe',
    name: 'Stripe',
    keyLabel: 'Secret key (sk_…)',
    hasMode: false,
    hasProducts: false,
  },
];

interface Product {
  id: string;
  name: string;
}

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
  const [step, setStep] = useState<'credentials' | 'products'>('credentials');
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const cfg = PROVIDERS.find(p => p.id === provider) ?? PROVIDERS[0];

  const buildCredentials = (): Record<string, string> => {
    const c: Record<string, string> = { apiKey: apiKey.trim() };
    if (cfg.hasMode) c.mode = mode;
    return c;
  };

  // Step 1 → 2 (providers with products): validate the key and list products.
  const loadProducts = async () => {
    if (!apiKey.trim()) return;
    setBusy(true);
    try {
      const res = await post(`/websites/${websiteId}/integrations/products`, {
        provider,
        credentials: buildCredentials(),
      });
      const list: Product[] = res?.products || [];
      if (list.length) {
        setProducts(list);
        setSelected(new Set());
        setStep('products');
      } else {
        // No products to pick from — connect against the whole account.
        await save();
      }
    } catch (e: any) {
      toast(e?.message || 'Could not read products — double-check the key and mode.');
    } finally {
      setBusy(false);
    }
  };

  // Persist the integration. `save` is shared by the 1-step and 2-step paths.
  const save = async () => {
    const credentials = buildCredentials();
    if (selected.size) {
      credentials.productIds = [...selected].join(',');
    }
    await post(`/websites/${websiteId}/integrations`, { provider, credentials });
    toast('Connected. Revenue will appear on the Revenue tab.');
    setApiKey('');
    setProducts([]);
    setSelected(new Set());
    setStep('credentials');
    refetch();
  };

  const connect = async () => {
    setBusy(true);
    try {
      await save();
    } catch (e: any) {
      toast(e?.message || 'Could not connect — double-check the key and try again.');
    } finally {
      setBusy(false);
    }
  };

  const toggleProduct = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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

  // Step 2 — pick which products belong to this website.
  if (step === 'products') {
    return (
      <div className="space-y-4">
        <div>
          <div className="text-sm font-semibold text-foreground">
            Which products belong to this website?
          </div>
          <p className="text-xs text-muted-foreground">
            We&apos;ll only count revenue from the products you pick — so two websites on the same{' '}
            {cfg.name} key don&apos;t show the same total. Leave all unchecked to track every
            product.
          </p>
        </div>

        <div className="max-h-64 overflow-y-auto rounded-lg border border-[hsl(0,0%,12%)]">
          {products.map(p => {
            const checked = selected.has(p.id);
            return (
              <label
                key={p.id}
                className="flex cursor-pointer items-center gap-3 border-b border-[hsl(0,0%,10%)] px-4 py-3 transition-colors last:border-b-0 hover:bg-[hsl(0,0%,10%)]"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleProduct(p.id)}
                  className="h-4 w-4 shrink-0 rounded border-[hsl(0,0%,28%)] bg-transparent accent-[#5e5ba4]"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">{p.name}</div>
                  <div className="truncate font-mono text-xs text-muted-foreground">{p.id}</div>
                </div>
              </label>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setStep('credentials')}
            disabled={busy}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button
            onClick={connect}
            disabled={busy}
            style={{ backgroundColor: '#5e5ba4', color: 'white' }}
            className="border-0 hover:opacity-90"
          >
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plug className="mr-2 h-4 w-4" />
            )}
            Connect
            {selected.size ? ` (${selected.size} product${selected.size > 1 ? 's' : ''})` : ''}
          </Button>
        </div>
      </div>
    );
  }

  // Step 1 — provider + key.
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
        onClick={cfg.hasProducts ? loadProducts : connect}
        disabled={busy || !apiKey.trim()}
        style={{ backgroundColor: '#5e5ba4', color: 'white' }}
        className="border-0 hover:opacity-90"
      >
        {busy ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : cfg.hasProducts ? (
          <ArrowRight className="mr-2 h-4 w-4" />
        ) : (
          <Plug className="mr-2 h-4 w-4" />
        )}
        {cfg.hasProducts ? 'Continue' : `Connect ${cfg.name}`}
      </Button>

      <p className="text-xs text-muted-foreground">
        Your key is validated with a live API call, then stored encrypted. We never display it
        again.
      </p>
    </div>
  );
}
