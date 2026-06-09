'use client';

import { useState } from 'react';
import { Megaphone, Copy, Loader2, Check } from 'lucide-react';
import { useCampaignsQuery, useWebsiteQuery } from '@/components/hooks';
import { TabEmptyState } from '@/components/common/TabEmptyState';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const PRESETS = [
  { label: 'Product Hunt', source: 'producthunt', medium: 'launch' },
  { label: 'LinkedIn', source: 'linkedin', medium: 'social' },
  { label: 'X', source: 'twitter', medium: 'social' },
  { label: 'Reddit', source: 'reddit', medium: 'social' },
  { label: 'Newsletter', source: 'newsletter', medium: 'email' },
  { label: 'YouTube', source: 'youtube', medium: 'video' },
  { label: 'AppSumo', source: 'appsumo', medium: 'referral' },
];

function money(minor: number, currency: string) {
  const major = (minor || 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: Number.isInteger(major) ? 0 : 2,
    }).format(major);
  } catch {
    return `$${major.toFixed(0)}`;
  }
}

// One-click UTM link builder + per-campaign visitors→revenue rollup. Read-side.
export function CampaignsInline({ websiteId }: { websiteId: string }) {
  const { data: website } = useWebsiteQuery(websiteId);
  const { data, isLoading } = useCampaignsQuery(websiteId);
  const rows = Array.isArray(data) ? data : [];

  const [url, setUrl] = useState('');
  const [source, setSource] = useState('');
  const [medium, setMedium] = useState('');
  const [campaign, setCampaign] = useState('');
  const [copied, setCopied] = useState(false);

  const base = url || (website?.domain ? `https://${website.domain}/` : '');
  const params = new URLSearchParams();
  if (source) params.set('utm_source', source);
  if (medium) params.set('utm_medium', medium);
  if (campaign) params.set('utm_campaign', campaign);
  const qs = params.toString();
  const link = base && qs ? `${base}${base.includes('?') ? '&' : '?'}${qs}` : '';

  const copy = () => {
    if (!link) return;
    navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-5 p-4">
      <div className="space-y-3 rounded-lg border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,9%)] p-4">
        <div className="text-sm font-semibold text-foreground">Campaign link builder</div>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map(p => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setSource(p.source);
                setMedium(p.medium);
                if (!campaign) setCampaign(p.source);
              }}
              className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                source === p.source
                  ? 'border-[#5e5ba4] bg-[#5e5ba4]/15 text-foreground'
                  : 'border-[hsl(0,0%,16%)] text-muted-foreground hover:text-foreground'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder={base || 'https://yoursite.com/'}
            className="dark:border-zinc-800 dark:bg-[#18181b]"
          />
          <Input
            value={campaign}
            onChange={e => setCampaign(e.target.value)}
            placeholder="campaign name (e.g. launch-2026)"
            className="dark:border-zinc-800 dark:bg-[#18181b]"
          />
        </div>
        {link ? (
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-[hsl(0,0%,6%)] px-2 py-1.5 text-[11px] text-foreground/90">
              {link}
            </code>
            <Button size="sm" variant="outline" onClick={copy} className="shrink-0 border-zinc-700">
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Pick a source and name to generate a link.
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : !rows.length ? (
        <TabEmptyState
          icon={Megaphone}
          title="No campaigns yet"
          description="Share a link built above (or any link with a utm_campaign). Visitors and revenue per campaign show up here."
        />
      ) : (
        <div className="divide-y divide-[hsl(0,0%,12%)] overflow-hidden rounded-lg border border-[hsl(0,0%,12%)]">
          <div className="hidden text-[11px] font-medium uppercase tracking-wide text-muted-foreground/60 md:block">
            <div className="flex items-center gap-6 px-4 py-2">
              <div className="flex-1">Campaign</div>
              <div className="w-24 text-right">Visitors</div>
              <div className="w-20 text-right">Paid</div>
              <div className="w-28 text-right">Revenue</div>
            </div>
          </div>
          {rows.map(r => (
            <div key={r.campaign} className="flex items-center gap-6 px-4 py-3">
              <div className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                {r.campaign}
              </div>
              <div className="w-24 text-right text-sm text-foreground">{r.visitors}</div>
              <div className="w-20 text-right text-sm text-muted-foreground">{r.paying || 0}</div>
              <div className="w-28 text-right">
                {r.revenue > 0 ? (
                  <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-sm font-semibold text-emerald-300">
                    {money(r.revenue, r.currency)}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground/50">—</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
