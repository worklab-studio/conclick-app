'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  LayoutGrid,
  List,
  Loader2,
  Plug,
  Search,
  Send,
  Settings2,
  Trash2,
} from 'lucide-react';
import { useApi } from '@/components/hooks/useApi';
import { useToast } from '@umami/react-zen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DiscordMark,
  DodoMark,
  GoogleMark,
  LemonSqueezyMark,
  PaddleMark,
  PolarMark,
  SlackMark,
  StripeMark,
  TelegramMark,
} from '@/components/integration-logos';

// Integrations directory: every connectable service as a card, grouped by
// category. Messaging channels are workspace-wide (NotificationChannel rows);
// payment gateways and Google are connected per product (per website).

interface Channel {
  id: string;
  type: 'slack' | 'discord' | 'telegram';
  label: string | null;
  target: string;
  digest: boolean;
  paymentAlerts: boolean;
}

interface OverviewWebsite {
  id: string;
  name: string;
  domain: string | null;
  payment: { provider: string; status: string } | null;
  google: { email: string | null; gscSiteUrl: string | null; ga4PropertyId: string | null } | null;
}

interface Overview {
  websites: OverviewWebsite[];
  googleConfigured: boolean;
  slackConfigured: boolean;
}

type Category = 'messaging' | 'payments' | 'search';

interface CardDef {
  id: string;
  name: string;
  desc: string;
  category: Category;
  tile: string; // tile background
  Mark: (props: { size?: number }) => React.ReactNode;
  markSize: number;
}

const CATALOG: CardDef[] = [
  {
    id: 'slack',
    name: 'Slack',
    desc: 'Daily digest and instant payment alerts in your Slack channels. One-click authorize.',
    category: 'messaging',
    tile: '#ffffff',
    Mark: SlackMark,
    markSize: 24,
  },
  {
    id: 'discord',
    name: 'Discord',
    desc: 'Post digests and revenue alerts to a channel in your server. Webhook setup in under a minute.',
    category: 'messaging',
    tile: '#5865f2',
    Mark: DiscordMark,
    markSize: 26,
  },
  {
    id: 'telegram',
    name: 'Telegram',
    desc: 'Alerts in any chat or group via your Telegram bot. Guided bot-token setup.',
    category: 'messaging',
    tile: '#ffffff',
    Mark: TelegramMark,
    markSize: 26,
  },
  {
    id: 'dodo',
    name: 'Dodo Payments',
    desc: 'Live revenue with per-visitor attribution — checkout links are tagged automatically.',
    category: 'payments',
    tile: '#101013',
    Mark: DodoMark,
    markSize: 26,
  },
  {
    id: 'stripe',
    name: 'Stripe',
    desc: 'Sync payments for revenue attribution using your restricted secret key.',
    category: 'payments',
    tile: '#635bff',
    Mark: StripeMark,
    markSize: 24,
  },
  {
    id: 'lemonsqueezy',
    name: 'Lemon Squeezy',
    desc: 'Webhook-verified orders, refunds and subscription payments.',
    category: 'payments',
    tile: '#101013',
    Mark: LemonSqueezyMark,
    markSize: 23,
  },
  {
    id: 'paddle',
    name: 'Paddle',
    desc: 'Transactions, refunds and chargebacks via signed webhooks.',
    category: 'payments',
    tile: '#101013',
    Mark: PaddleMark,
    markSize: 22,
  },
  {
    id: 'polar',
    name: 'Polar',
    desc: 'Orders and refunds from your Polar organization, verified per event.',
    category: 'payments',
    tile: '#0062ff',
    Mark: PolarMark,
    markSize: 24,
  },
  {
    id: 'google',
    name: 'Google Search Console & GA4',
    desc: 'Search queries beside your pages, plus one-time Google Analytics history import.',
    category: 'search',
    tile: '#ffffff',
    Mark: GoogleMark,
    markSize: 23,
  },
];

const SECTIONS: { id: Category; title: string; scope: string; sub: string }[] = [
  {
    id: 'messaging',
    title: 'Messaging',
    scope: 'Workspace',
    sub: 'Daily digests and instant payment alerts, delivered where your team already works.',
  },
  {
    id: 'payments',
    title: 'Payments',
    scope: 'Per product',
    sub: 'Each product connects its own gateway — revenue is attributed to that product’s traffic and never mixed.',
  },
  {
    id: 'search',
    title: 'Search & analytics',
    scope: 'Per product',
    sub: 'Read-only Google access per product — revoke anytime from settings or your Google account.',
  },
];

interface CardState {
  connected: boolean;
  enabled: boolean; // toggle position (messaging + payments)
  hasToggle: boolean;
  target: string | null; // footer chip
  channels: Channel[]; // messaging only
  rows: OverviewWebsite[]; // payments/google only
}

export function IntegrationsSettings() {
  const { get, post, put, del, useQuery } = useApi();
  const { toast } = useToast();
  const router = useRouter();

  const {
    data: channels = [],
    refetch: refetchChannels,
    isLoading: loadingChannels,
  } = useQuery<Channel[]>({
    queryKey: ['notification-channels'],
    queryFn: () => get('/account/notification-channels'),
  });

  const {
    data: overview,
    refetch: refetchOverview,
    isLoading: loadingOverview,
  } = useQuery<Overview>({
    queryKey: ['integrations-overview'],
    queryFn: () => get('/account/integrations-overview'),
  });

  const websites = overview?.websites ?? [];

  const [filter, setFilter] = useState<'all' | 'connected' | 'not'>('all');
  const [q, setQ] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [manage, setManage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Add-channel form state (Discord / Telegram modals).
  const [url, setUrl] = useState('');
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');

  // Feedback after returning from the Slack "Add to Slack" round-trip.
  const params = useSearchParams();
  useEffect(() => {
    const s = params.get('slack');
    if (!s) return;
    if (s === 'connected') {
      toast('Slack connected — sent a welcome message to your channel.');
      refetchChannels();
    } else if (s === 'not-configured') {
      toast('Slack isn’t set up on the server yet.');
    } else if (s === 'error') {
      toast('Slack connection failed — please try again.');
    }
    window.history.replaceState(null, '', '/account?tab=integrations');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const stateFor = (def: CardDef): CardState => {
    if (def.category === 'messaging') {
      const list = channels.filter(c => c.type === def.id);
      const first = list[0];
      return {
        connected: list.length > 0,
        enabled: list.some(c => c.digest || c.paymentAlerts),
        hasToggle: list.length > 0,
        target:
          list.length > 1 ? `${list.length} channels` : first ? first.label || first.target : null,
        channels: list,
        rows: [],
      };
    }
    if (def.category === 'payments') {
      const rows = websites.filter(w => w.payment?.provider === def.id);
      return {
        connected: rows.length > 0,
        enabled: rows.some(r => r.payment?.status === 'active'),
        hasToggle: rows.length > 0,
        target:
          rows.length > 1
            ? `${rows.length} products`
            : rows[0]
              ? rows[0].domain || rows[0].name
              : null,
        channels: [],
        rows,
      };
    }
    const rows = websites.filter(w => !!w.google);
    return {
      connected: rows.length > 0,
      enabled: rows.length > 0,
      hasToggle: false,
      target: rows.length ? `${rows.length} of ${websites.length} products` : null,
      channels: [],
      rows,
    };
  };

  const cardStates = useMemo(
    () => new Map(CATALOG.map(def => [def.id, stateFor(def)])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [channels, websites],
  );

  const counts = useMemo(() => {
    let connected = 0;
    cardStates.forEach(s => {
      if (s.connected) connected += 1;
    });
    return { all: CATALOG.length, connected, not: CATALOG.length - connected };
  }, [cardStates]);

  const visible = (def: CardDef) => {
    const s = cardStates.get(def.id)!;
    if (filter === 'connected' && !s.connected) return false;
    if (filter === 'not' && s.connected) return false;
    if (q.trim() && !def.name.toLowerCase().includes(q.trim().toLowerCase())) return false;
    return true;
  };

  // ---- actions -------------------------------------------------------------

  const toggleMessaging = async (def: CardDef, enabled: boolean) => {
    const s = cardStates.get(def.id)!;
    setBusy(`toggle:${def.id}`);
    try {
      await Promise.all(
        s.channels.map(c =>
          post('/account/notification-channels', {
            id: c.id,
            digest: enabled,
            paymentAlerts: enabled,
          }),
        ),
      );
      toast(enabled ? `${def.name} notifications resumed.` : `${def.name} notifications paused.`);
    } catch (e: any) {
      toast(e?.message || 'Could not update the channel.');
    } finally {
      setBusy(null);
      refetchChannels();
    }
  };

  const togglePayments = async (def: CardDef, enabled: boolean) => {
    const s = cardStates.get(def.id)!;
    setBusy(`toggle:${def.id}`);
    try {
      await Promise.all(
        s.rows.map(r =>
          put(`/websites/${r.id}/integrations`, {
            provider: def.id,
            status: enabled ? 'active' : 'paused',
          }),
        ),
      );
      toast(
        enabled
          ? `${def.name} resumed — events will ingest again.`
          : `${def.name} paused — incoming events are ignored until you resume.`,
      );
    } catch (e: any) {
      toast(e?.message || 'Could not update the integration.');
    } finally {
      setBusy(null);
      refetchOverview();
    }
  };

  const toggleChannelField = async (c: Channel, field: 'digest' | 'paymentAlerts') => {
    try {
      await post('/account/notification-channels', { id: c.id, [field]: !c[field] });
    } catch (e: any) {
      toast(e?.message || 'Could not update the channel.');
    } finally {
      refetchChannels();
    }
  };

  const testChannel = async (c: Channel) => {
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

  const removeChannel = async (c: Channel) => {
    setBusy(`rm:${c.id}`);
    try {
      await del('/account/notification-channels', { id: c.id });
    } finally {
      setBusy(null);
      refetchChannels();
    }
  };

  const addChannel = async (type: 'discord' | 'telegram') => {
    setBusy(`add:${type}`);
    try {
      const config = type === 'telegram' ? { botToken, chatId } : { url };
      await post('/account/notification-channels', { type, config });
      toast('Channel connected — a test message just landed there.');
      setUrl('');
      setBotToken('');
      setChatId('');
      refetchChannels();
    } catch (e: any) {
      toast(e?.message || 'Could not add that channel.');
    } finally {
      setBusy(null);
    }
  };

  const disconnectPayment = async (w: OverviewWebsite) => {
    setBusy(`rm:${w.id}`);
    try {
      await del(`/websites/${w.id}/integrations`);
      toast('Disconnected.');
    } catch (e: any) {
      toast(e?.message || 'Could not disconnect.');
    } finally {
      setBusy(null);
      refetchOverview();
    }
  };

  const disconnectGoogle = async (w: OverviewWebsite) => {
    setBusy(`rm:${w.id}`);
    try {
      await del(`/websites/${w.id}/google`);
      toast('Google disconnected for that product.');
    } catch (e: any) {
      toast(e?.message || 'Could not disconnect.');
    } finally {
      setBusy(null);
      refetchOverview();
    }
  };

  // ---- small render helpers ------------------------------------------------

  const Tile = ({ def, size }: { def: CardDef; size: number }) => (
    <span
      className="flex shrink-0 items-center justify-center rounded-xl border border-[hsl(0,0%,15%)]"
      style={{ background: def.tile, width: size, height: size }}
    >
      <def.Mark size={Math.round(size * 0.52)} />
    </span>
  );

  const ConnectedChip = () => (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/[0.08] px-2.5 py-[3px] text-[11px] font-semibold text-emerald-400">
      <span className="h-[5px] w-[5px] rounded-full bg-emerald-400" />
      Connected
    </span>
  );

  const TargetChip = ({ children }: { children: React.ReactNode }) => (
    <span
      className="max-w-[150px] truncate rounded-[7px] border border-[hsl(0,0%,12%)] bg-[#0f0f11] px-2 py-[3px] font-mono text-[11px] text-muted-foreground"
      title={typeof children === 'string' ? children : undefined}
    >
      {children}
    </span>
  );

  const cardToggle = (def: CardDef, s: CardState) => (
    <Switch
      checked={s.enabled}
      disabled={busy === `toggle:${def.id}`}
      onCheckedChange={v =>
        def.category === 'messaging' ? toggleMessaging(def, v) : togglePayments(def, v)
      }
      className="data-[state=checked]:bg-[#5e5ba4]"
      aria-label={`${def.name} enabled`}
    />
  );

  const actionButton = (def: CardDef, s: CardState) => {
    if (s.connected) {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setManage(def.id)}
          className="border-[hsl(0,0%,17%)] text-[12.5px] font-semibold text-foreground hover:bg-[hsl(0,0%,12%)]"
        >
          <Settings2 className="mr-1.5 h-3.5 w-3.5" />
          Manage
        </Button>
      );
    }
    if (def.id === 'slack') {
      return (
        <a
          href="/api/slack/connect"
          className="inline-flex items-center rounded-lg bg-[#5e5ba4] px-3.5 py-2 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          <Plug className="mr-1.5 h-3.5 w-3.5" />
          Connect
        </a>
      );
    }
    return (
      <Button
        size="sm"
        onClick={() => setManage(def.id)}
        style={{ backgroundColor: '#5e5ba4', color: 'white' }}
        className="border-0 text-[12.5px] font-semibold hover:opacity-90"
      >
        <Plug className="mr-1.5 h-3.5 w-3.5" />
        Connect
      </Button>
    );
  };

  // ---- loading -------------------------------------------------------------

  if (loadingChannels || loadingOverview) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading integrations…
      </div>
    );
  }

  const manageDef = manage ? CATALOG.find(d => d.id === manage) : undefined;
  const manageState = manageDef ? cardStates.get(manageDef.id) : undefined;

  return (
    <div>
      {/* controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-[10px] border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,8%)] p-[3px]">
          {(
            [
              ['all', 'All integrations', counts.all],
              ['connected', 'Connected', counts.connected],
              ['not', 'Not connected', counts.not],
            ] as const
          ).map(([key, label, n]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-[7px] text-[13px] font-semibold transition-colors ${
                filter === key
                  ? 'bg-[#232327] text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
              <span
                className={`rounded-full border px-[7px] py-[1px] text-[10.5px] font-semibold ${
                  filter === key
                    ? 'border-[#5e5ba4]/30 bg-[#5e5ba4]/[.18] text-[#b7b4e4]'
                    : 'border-[hsl(0,0%,15%)] bg-[hsl(0,0%,11%)] text-muted-foreground'
                }`}
              >
                {n}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex w-[230px] items-center gap-2 rounded-[10px] border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,8%)] px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search integrations…"
              className="w-full bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
          <div className="flex rounded-[10px] border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,8%)] p-[3px]">
            <button
              type="button"
              onClick={() => setView('grid')}
              aria-label="Grid view"
              className={`rounded-[7px] px-2.5 py-1.5 ${view === 'grid' ? 'bg-[#232327] text-foreground' : 'text-muted-foreground'}`}
            >
              <LayoutGrid className="h-[15px] w-[15px]" />
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              aria-label="List view"
              className={`rounded-[7px] px-2.5 py-1.5 ${view === 'list' ? 'bg-[#232327] text-foreground' : 'text-muted-foreground'}`}
            >
              <List className="h-[15px] w-[15px]" />
            </button>
          </div>
        </div>
      </div>

      {/* sections */}
      {SECTIONS.map(sec => {
        const defs = CATALOG.filter(d => d.category === sec.id && visible(d));
        if (!defs.length) return null;
        return (
          <section key={sec.id} className="mt-9">
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-bold tracking-tight">{sec.title}</h3>
              <span className="rounded-full border border-[#5e5ba4]/[.28] bg-[#5e5ba4]/[.14] px-2.5 py-[2px] text-[10.5px] font-semibold uppercase tracking-wide text-[#8b88cf]">
                {sec.scope}
              </span>
            </div>
            <p className="mt-1 text-[12.5px] text-muted-foreground">{sec.sub}</p>

            {view === 'grid' ? (
              <div className="mt-3.5 grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
                {defs.map(def => {
                  const s = cardStates.get(def.id)!;
                  return (
                    <div
                      key={def.id}
                      className="relative flex flex-col rounded-[14px] border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,8%)] transition-colors hover:border-[hsl(0,0%,17%)]"
                    >
                      {s.connected && (
                        <span className="absolute right-4 top-4">
                          <ConnectedChip />
                        </span>
                      )}
                      <div className="flex-1 p-[18px] pb-4">
                        <Tile def={def} size={46} />
                        <div className="mt-3 pr-2 text-[15.5px] font-bold tracking-tight">
                          {def.name}
                        </div>
                        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
                          {def.desc}
                        </p>
                      </div>
                      <div className="flex items-center justify-between border-t border-[hsl(0,0%,11%)] px-[18px] py-[11px]">
                        {actionButton(def, s)}
                        <span className="flex items-center gap-2.5">
                          {s.target && <TargetChip>{s.target}</TargetChip>}
                          {s.hasToggle && cardToggle(def, s)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-3.5 overflow-hidden rounded-[14px] border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,8%)]">
                {defs.map(def => {
                  const s = cardStates.get(def.id)!;
                  return (
                    <div
                      key={def.id}
                      className="flex items-center gap-4 border-b border-[hsl(0,0%,10%)] px-4 py-3.5 last:border-b-0"
                    >
                      <Tile def={def} size={36} />
                      <div className="min-w-0 flex-1">
                        <span className="text-[13.5px] font-semibold">{def.name}</span>
                        <span className="ml-2.5 hidden text-[12px] text-muted-foreground lg:inline">
                          {def.desc}
                        </span>
                      </div>
                      {s.connected && <ConnectedChip />}
                      {s.target && <TargetChip>{s.target}</TargetChip>}
                      {actionButton(def, s)}
                      {s.hasToggle ? cardToggle(def, s) : <span className="w-11" />}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      {CATALOG.filter(visible).length === 0 && (
        <div className="mt-10 rounded-xl border border-dashed border-[hsl(0,0%,16%)] p-10 text-center text-sm text-muted-foreground">
          Nothing matches — try a different search or filter.
        </div>
      )}

      {/* manage / connect modal */}
      <Dialog open={!!manageDef} onOpenChange={o => !o && setManage(null)}>
        <DialogContent className="max-w-lg border-[hsl(0,0%,14%)] bg-[hsl(0,0%,7%)] p-6">
          {manageDef && manageState && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-base">
                  <Tile def={manageDef} size={34} />
                  {manageDef.name}
                </DialogTitle>
                <DialogDescription className="text-[12.5px] text-muted-foreground">
                  {manageDef.category === 'messaging'
                    ? 'Workspace-wide — every connected channel receives the digests and alerts you enable.'
                    : 'Per product — each product has its own connection.'}
                </DialogDescription>
              </DialogHeader>

              {/* MESSAGING: channel rows + add */}
              {manageDef.category === 'messaging' && (
                <div className="space-y-3">
                  {manageState.channels.map(c => (
                    <div
                      key={c.id}
                      className="rounded-lg border border-[hsl(0,0%,13%)] bg-[#0f0f11] px-3.5 py-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="truncate text-[13px] font-semibold">
                          {c.label || manageDef.name}
                        </span>
                        <span className="truncate font-mono text-[11px] text-muted-foreground">
                          {c.target}
                        </span>
                        <span className="ml-auto flex shrink-0 items-center gap-2 text-muted-foreground">
                          <button
                            type="button"
                            onClick={() => testChannel(c)}
                            title="Send a test message"
                            className="transition-colors hover:text-foreground"
                          >
                            {busy === `test:${c.id}` ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Send className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeChannel(c)}
                            title="Remove channel"
                            className="transition-colors hover:text-red-400"
                          >
                            {busy === `rm:${c.id}` ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </span>
                      </div>
                      <div className="mt-2.5 flex gap-5">
                        <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <Switch
                            checked={c.digest}
                            onCheckedChange={() => toggleChannelField(c, 'digest')}
                            className="data-[state=checked]:bg-[#5e5ba4]"
                          />
                          Daily digest
                        </label>
                        <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <Switch
                            checked={c.paymentAlerts}
                            onCheckedChange={() => toggleChannelField(c, 'paymentAlerts')}
                            className="data-[state=checked]:bg-[#5e5ba4]"
                          />
                          Payment alerts
                        </label>
                      </div>
                    </div>
                  ))}

                  {manageDef.id === 'slack' && (
                    <a
                      href="/api/slack/connect"
                      className="flex w-fit items-center gap-2.5 rounded-lg border border-[#2c2f33] bg-[#1a1d21] px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:border-[#3c4046]"
                    >
                      <SlackMark size={16} />
                      {manageState.channels.length ? 'Add another workspace' : 'Add to Slack'}
                    </a>
                  )}

                  {manageDef.id === 'discord' && (
                    <div className="space-y-2.5 rounded-lg border border-[hsl(0,0%,13%)] bg-[hsl(0,0%,9%)] p-3.5">
                      <div className="text-[12px] text-muted-foreground">
                        In Discord:{' '}
                        <span className="font-medium text-foreground/80">
                          Server Settings → Integrations → Webhooks → New Webhook
                        </span>{' '}
                        → pick the channel → Copy Webhook URL.
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={url}
                          onChange={e => setUrl(e.target.value)}
                          placeholder="https://discord.com/api/webhooks/…"
                          autoComplete="off"
                          className="font-mono text-xs dark:border-zinc-800 dark:bg-[#18181b]"
                        />
                        <Button
                          size="sm"
                          onClick={() => addChannel('discord')}
                          disabled={busy === 'add:discord' || !url.trim()}
                          style={{ backgroundColor: '#5e5ba4', color: 'white' }}
                          className="shrink-0 border-0"
                        >
                          {busy === 'add:discord' ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            'Connect'
                          )}
                        </Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        We send a test message before saving — a dead webhook is never stored.
                      </p>
                    </div>
                  )}

                  {manageDef.id === 'telegram' && (
                    <div className="space-y-2.5 rounded-lg border border-[hsl(0,0%,13%)] bg-[hsl(0,0%,9%)] p-3.5">
                      <div className="text-[12px] text-muted-foreground">
                        Create a bot with{' '}
                        <span className="font-medium text-foreground/80">@BotFather</span> →{' '}
                        <span className="font-mono text-[11px]">/newbot</span>, add it to your chat
                        or group, then get your chat id from{' '}
                        <span className="font-medium text-foreground/80">@userinfobot</span>.
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={botToken}
                          onChange={e => setBotToken(e.target.value)}
                          placeholder="Bot token (123456:ABC…)"
                          autoComplete="off"
                          className="font-mono text-xs dark:border-zinc-800 dark:bg-[#18181b]"
                        />
                        <Input
                          value={chatId}
                          onChange={e => setChatId(e.target.value)}
                          placeholder="Chat id"
                          autoComplete="off"
                          className="w-32 shrink-0 font-mono text-xs dark:border-zinc-800 dark:bg-[#18181b]"
                        />
                        <Button
                          size="sm"
                          onClick={() => addChannel('telegram')}
                          disabled={busy === 'add:telegram' || !botToken.trim() || !chatId.trim()}
                          style={{ backgroundColor: '#5e5ba4', color: 'white' }}
                          className="shrink-0 border-0"
                        >
                          {busy === 'add:telegram' ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            'Connect'
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* PAYMENTS: per-product rows + connect picker */}
              {manageDef.category === 'payments' && (
                <div className="space-y-3">
                  {manageState.rows.map(w => (
                    <div
                      key={w.id}
                      className="flex items-center gap-3 rounded-lg border border-[hsl(0,0%,13%)] bg-[#0f0f11] px-3.5 py-3"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#5e5ba4] to-[#7c79c4] text-[13px] font-bold text-white">
                        {(w.name || '?').charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-semibold">{w.name}</div>
                        <div className="truncate font-mono text-[11px] text-muted-foreground">
                          {w.domain}
                        </div>
                      </div>
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {w.payment?.status === 'active' ? 'Active' : 'Paused'}
                      </span>
                      <Switch
                        checked={w.payment?.status === 'active'}
                        onCheckedChange={v =>
                          put(`/websites/${w.id}/integrations`, {
                            provider: manageDef.id,
                            status: v ? 'active' : 'paused',
                          })
                            .then(() => refetchOverview())
                            .catch((e: any) => toast(e?.message || 'Could not update.'))
                        }
                        className="data-[state=checked]:bg-[#5e5ba4]"
                      />
                      <button
                        type="button"
                        onClick={() => disconnectPayment(w)}
                        title="Disconnect"
                        className="text-muted-foreground transition-colors hover:text-red-400"
                      >
                        {busy === `rm:${w.id}` ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  ))}

                  {websites.filter(w => !w.payment).length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                        Connect a product
                      </div>
                      {websites
                        .filter(w => !w.payment)
                        .map(w => (
                          <button
                            key={w.id}
                            type="button"
                            onClick={() => router.push(`/websites/${w.id}/settings`)}
                            className="flex w-full items-center gap-3 rounded-lg border border-dashed border-[hsl(0,0%,16%)] px-3.5 py-2.5 text-left transition-colors hover:border-[#5e5ba4]/50 hover:bg-[hsl(0,0%,9%)]"
                          >
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[hsl(0,0%,13%)] text-[12px] font-bold text-foreground/80">
                              {(w.name || '?').charAt(0).toUpperCase()}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13px] font-medium">
                                {w.name}
                              </span>
                              <span className="block truncate font-mono text-[11px] text-muted-foreground">
                                {w.domain}
                              </span>
                            </span>
                            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#b7b4e4]" />
                          </button>
                        ))}
                      <p className="text-[11px] text-muted-foreground">
                        You&apos;ll pick {manageDef.name} and finish in the product&apos;s settings
                        — keys are validated live and stored encrypted.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* GOOGLE: per-product rows + connect */}
              {manageDef.category === 'search' && (
                <div className="space-y-3">
                  {manageState.rows.map(w => (
                    <div
                      key={w.id}
                      className="flex items-center gap-3 rounded-lg border border-[hsl(0,0%,13%)] bg-[#0f0f11] px-3.5 py-3"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#5e5ba4] to-[#7c79c4] text-[13px] font-bold text-white">
                        {(w.name || '?').charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-semibold">{w.name}</div>
                        <div className="truncate font-mono text-[11px] text-muted-foreground">
                          {w.google?.email}
                        </div>
                      </div>
                      <span className="flex shrink-0 gap-1.5">
                        {w.google?.gscSiteUrl && (
                          <span className="rounded-full border border-[hsl(0,0%,15%)] bg-[hsl(0,0%,11%)] px-2 py-[2px] text-[10px] font-medium text-muted-foreground">
                            GSC
                          </span>
                        )}
                        {w.google?.ga4PropertyId && (
                          <span className="rounded-full border border-[hsl(0,0%,15%)] bg-[hsl(0,0%,11%)] px-2 py-[2px] text-[10px] font-medium text-muted-foreground">
                            GA4
                          </span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => disconnectGoogle(w)}
                        title="Disconnect Google for this product"
                        className="text-muted-foreground transition-colors hover:text-red-400"
                      >
                        {busy === `rm:${w.id}` ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  ))}

                  {websites.filter(w => !w.google).length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                        Connect a product
                      </div>
                      {overview?.googleConfigured === false && (
                        <p className="text-[11.5px] text-amber-400/90">
                          Google OAuth isn&apos;t configured on the server yet
                          (GOOGLE_CLIENT_ID/SECRET) — connecting will be enabled once it is.
                        </p>
                      )}
                      {websites
                        .filter(w => !w.google)
                        .map(w =>
                          overview?.googleConfigured ? (
                            <a
                              key={w.id}
                              href={`/api/google/connect?websiteId=${w.id}`}
                              className="flex w-full items-center gap-3 rounded-lg border border-dashed border-[hsl(0,0%,16%)] px-3.5 py-2.5 transition-colors hover:border-[#5e5ba4]/50 hover:bg-[hsl(0,0%,9%)]"
                            >
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[hsl(0,0%,13%)] text-[12px] font-bold text-foreground/80">
                                {(w.name || '?').charAt(0).toUpperCase()}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13px] font-medium">
                                  {w.name}
                                </span>
                                <span className="block truncate font-mono text-[11px] text-muted-foreground">
                                  {w.domain}
                                </span>
                              </span>
                              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#b7b4e4]" />
                            </a>
                          ) : (
                            <div
                              key={w.id}
                              className="flex w-full items-center gap-3 rounded-lg border border-dashed border-[hsl(0,0%,13%)] px-3.5 py-2.5 opacity-50"
                            >
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[hsl(0,0%,13%)] text-[12px] font-bold text-foreground/80">
                                {(w.name || '?').charAt(0).toUpperCase()}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13px] font-medium">
                                  {w.name}
                                </span>
                                <span className="block truncate font-mono text-[11px] text-muted-foreground">
                                  {w.domain}
                                </span>
                              </span>
                            </div>
                          ),
                        )}
                      <p className="text-[11px] text-muted-foreground">
                        Read-only Search Console + Analytics scopes. You pick the property after
                        authorizing; tokens are stored encrypted.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
