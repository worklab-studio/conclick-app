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
import { Loader2, CheckCircle2, Plug, X, ArrowLeft, ArrowRight, Copy, Check } from 'lucide-react';

// Only providers with a working backend are connectable here. `hasProducts`
// providers (e.g. Dodo, whose one account can hold many products) get a second
// step to scope this website's revenue to specific products. `webhookOnly`
// providers need no API key at all — the merchant creates a webhook pointing at
// us and pastes its signing secret; the signature is the auth.
interface ProviderCfg {
  id: string;
  name: string;
  keyLabel?: string;
  hasMode?: boolean;
  hasProducts?: boolean;
  webhookOnly?: boolean;
  setupPath?: string; // where webhooks live in the provider's dashboard
  events?: string; // events to enable, shown in the connect steps
}

const PROVIDERS: ProviderCfg[] = [
  { id: 'dodo', name: 'Dodo Payments', keyLabel: 'API key', hasMode: true, hasProducts: true },
  { id: 'stripe', name: 'Stripe', keyLabel: 'Secret key (sk_…)' },
  {
    id: 'lemonsqueezy',
    name: 'Lemon Squeezy',
    webhookOnly: true,
    setupPath: 'Settings → Webhooks',
    events:
      'order_created · subscription_payment_success · order_refunded · subscription_payment_refunded',
  },
  {
    id: 'paddle',
    name: 'Paddle',
    webhookOnly: true,
    setupPath: 'Developer tools → Notifications',
    events: 'transaction.completed · adjustment.created · adjustment.updated',
  },
  {
    id: 'polar',
    name: 'Polar',
    webhookOnly: true,
    setupPath: 'Settings → Webhooks',
    events: 'order.paid · refund.created · refund.updated',
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
  const [webhookSecret, setWebhookSecret] = useState('');
  const [mode, setMode] = useState('test');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<'credentials' | 'products'>('credentials');
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const cfg = PROVIDERS.find(p => p.id === provider) ?? PROVIDERS[0];
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://app.conclick.io';
  const webhookUrl = `${origin}/api/integrations/webhooks/${provider}?websiteId=${websiteId}`;

  const buildCredentials = (): Record<string, string> => {
    if (cfg.webhookOnly) return { webhookSecret: webhookSecret.trim() };
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
    setWebhookSecret('');
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
      <div className="space-y-4">
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
        <WebhookAttribution
          websiteId={websiteId}
          provider={status.provider}
          hasSecret={!!status.hasWebhookSecret}
        />
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

      {cfg.webhookOnly ? (
        /* Webhook-only connect: no API key — create a webhook in the provider's
           dashboard pointing at us and paste its signing secret. ~2 minutes. */
        <div className="space-y-3 text-sm text-muted-foreground">
          <div>
            <span className="font-semibold text-foreground">1.</span> In {cfg.name} →{' '}
            <span className="font-semibold text-foreground">{cfg.setupPath}</span>, create a webhook
            pointing at:
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-[hsl(0,0%,16%)] bg-[#101013] px-3 py-2 font-mono text-[11.5px] text-[#b7b4e4]">
            <span className="truncate">{webhookUrl}</span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(webhookUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="flex shrink-0 items-center gap-1 font-sans text-[10.5px] text-muted-foreground transition-colors hover:text-foreground"
            >
              {copied ? (
                <Check className="h-3 w-3 text-emerald-400" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
              {copied ? 'copied' : 'copy'}
            </button>
          </div>
          <div>
            <span className="font-semibold text-foreground">2.</span> Select events:{' '}
            <span className="font-mono text-xs text-foreground">{cfg.events}</span>
          </div>
          <div>
            <span className="font-semibold text-foreground">3.</span> Paste the signing secret{' '}
            {cfg.name} shows you:
          </div>
          <div className="flex gap-2">
            <Input
              type="password"
              value={webhookSecret}
              onChange={e => setWebhookSecret(e.target.value)}
              placeholder="Signing secret…"
              autoComplete="off"
              className="font-mono dark:border-zinc-800 dark:bg-[#18181b]"
            />
            <Button
              onClick={connect}
              disabled={busy || !webhookSecret.trim()}
              style={{ backgroundColor: '#5e5ba4', color: 'white' }}
              className="shrink-0 border-0 hover:opacity-90"
            >
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plug className="mr-2 h-4 w-4" />
              )}
              Save &amp; connect
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            No API key needed — every webhook is signature-verified with this secret, which is
            stored encrypted. For per-visitor attribution, pass{' '}
            <span className="font-mono">distinct_id</span> in the checkout&apos;s custom
            data/metadata (shown after connecting).
          </p>
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}

// Optional webhook setup for per-visitor attribution: register the webhook URL +
// signing secret, then identify visitors and tag checkouts with the same id.
function WebhookAttribution({
  websiteId,
  provider,
  hasSecret,
}: {
  websiteId: string;
  provider: string;
  hasSecret: boolean;
}) {
  const { post } = useApi();
  const { toast } = useToast();
  const [secret, setSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://app.conclick.io';
  const webhookUrl = `${origin}/api/integrations/webhooks/${provider}?websiteId=${websiteId}`;

  // Auto-provisioned webhook + the script auto-tags Dodo links → nothing to do.
  if (hasSecret) {
    return (
      <div className="space-y-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] p-4">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-400" />
          <div className="text-sm font-semibold text-foreground">
            Attribution is on — nothing else to do
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          The webhook is connected, and your Conclick script automatically tags Dodo checkout links
          with the visitor — so payments attach to the right person in Users → Spent. No code
          needed.
        </p>
      </div>
    );
  }

  const saveSecret = async () => {
    if (!secret.trim()) return;
    setSaving(true);
    try {
      await post(`/websites/${websiteId}/integrations/webhook-secret`, {
        webhookSecret: secret.trim(),
      });
      setSaved(true);
      setSecret('');
      toast('Webhook secret saved — payments will now attribute to visitors.');
    } catch (e: any) {
      toast(e?.message || 'Could not save the secret.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,9%)] p-4">
      <div>
        <div className="text-sm font-semibold text-foreground">
          Attribute payments to visitors (optional)
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Tie each payment to the visitor who made it — shows in Users → Spent and the Paying
          filter.
        </p>
      </div>

      <div className="space-y-1.5 text-xs text-muted-foreground">
        <div>
          <span className="font-medium text-foreground/80">1.</span> Add this webhook in your{' '}
          {provider} dashboard for the <code className="text-[#b7b4e4]">payment.succeeded</code>{' '}
          event:
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded bg-[hsl(0,0%,6%)] px-2 py-1.5 text-[11px] text-foreground/90">
            {webhookUrl}
          </code>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              navigator.clipboard?.writeText(webhookUrl);
              toast('Webhook URL copied.');
            }}
            className="shrink-0 border-zinc-700"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="space-y-1.5 text-xs text-muted-foreground">
        <div>
          <span className="font-medium text-foreground/80">2.</span> Paste the signing secret it
          gives you:
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="password"
            value={secret}
            onChange={e => {
              setSecret(e.target.value);
              setSaved(false);
            }}
            placeholder="whsec_…"
            className="font-mono dark:border-zinc-800 dark:bg-[#18181b]"
          />
          <Button
            size="sm"
            onClick={saveSecret}
            disabled={saving || !secret.trim()}
            style={{ backgroundColor: '#5e5ba4', color: 'white' }}
            className="shrink-0 border-0"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : saved ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              'Save'
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-1.5 text-xs text-muted-foreground">
        <div>
          <span className="font-medium text-foreground/80">3.</span> On your site, identify the
          visitor and tag the checkout with the same id:
        </div>
        <pre className="overflow-x-auto rounded bg-[hsl(0,0%,6%)] px-2 py-1.5 text-[11px] leading-relaxed text-foreground/80">{`conclick.identify(userId)           // on your site
metadata: { distinct_id: userId }   // on the Dodo checkout`}</pre>
      </div>
    </div>
  );
}
