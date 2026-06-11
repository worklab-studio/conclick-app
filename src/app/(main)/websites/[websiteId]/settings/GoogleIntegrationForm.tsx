'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, Download, Loader2, Search, Unplug } from 'lucide-react';
import { useApi } from '@/components/hooks/useApi';
import { useToast } from '@umami/react-zen';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// One Google consent powers two things: Search Console (the SEO tab) and a
// one-time GA4 history import (the "Imported" overlay on Overview).

interface GoogleStatus {
  connected: boolean;
  configured: boolean;
  email?: string | null;
  gscSiteUrl?: string | null;
  ga4PropertyId?: string | null;
  gscSites?: { siteUrl: string }[];
  ga4Properties?: { property: string; displayName: string }[];
  tokenError?: boolean;
}

export function GoogleIntegrationForm({ websiteId }: { websiteId: string }) {
  const { get, post, del, useQuery } = useApi();
  const { toast } = useToast();
  const params = useSearchParams();
  const justConnected = params.get('google') === 'connected';

  const { data: status, refetch } = useQuery<GoogleStatus>({
    queryKey: ['google-status', websiteId],
    queryFn: () => get(`/websites/${websiteId}/google`, { lists: '1' }),
  });

  const [busy, setBusy] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);

  const select = async (field: 'gscSiteUrl' | 'ga4PropertyId', value: string) => {
    await post(`/websites/${websiteId}/google`, { [field]: value });
    refetch();
  };

  const runImport = async () => {
    setBusy('import');
    setImportResult(null);
    try {
      const res = await post(`/websites/${websiteId}/ga4-import`, {});
      setImportResult(
        res?.days
          ? `Imported ${res.days.toLocaleString()} days (${res.from} → ${res.to}). Overview now shows the history overlay.`
          : res?.message || 'Nothing to import.',
      );
    } catch (e: any) {
      toast(e?.message || 'Import failed.');
    } finally {
      setBusy(null);
    }
  };

  const disconnect = async () => {
    setBusy('disconnect');
    try {
      await del(`/websites/${websiteId}/google`);
      refetch();
    } finally {
      setBusy(null);
    }
  };

  if (!status) return null;

  if (!status.connected) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Connect Google to unlock the{' '}
          <span className="font-semibold text-foreground">SEO tab</span> (Search Console queries,
          clicks, impressions) and a one-time{' '}
          <span className="font-semibold text-foreground">Google Analytics history import</span> so
          your chart starts where your data starts — not where you switched.
        </p>
        {status.configured ? (
          <Button asChild className="border-0 bg-[#5e5ba4] text-white hover:bg-[#5e5ba4]/90">
            <a href={`/api/google/connect?websiteId=${websiteId}`}>
              <Search className="mr-1.5 h-4 w-4" /> Connect Google
            </a>
          </Button>
        ) : (
          <p className="text-xs text-amber-300/80">
            Google OAuth isn&apos;t configured on this server yet (GOOGLE_CLIENT_ID /
            GOOGLE_CLIENT_SECRET).
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] p-4">
        <div className="flex items-center gap-3">
          <Check className="h-5 w-5 text-emerald-400" />
          <div>
            <div className="text-sm font-semibold text-foreground">
              Google connected{status.email ? ` — ${status.email}` : ''}
            </div>
            <div className="text-xs text-muted-foreground">
              {justConnected
                ? 'Pick your Search Console property and GA4 property below.'
                : 'Read-only access · revoke anytime'}
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={disconnect}
          disabled={!!busy}
          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        >
          {busy === 'disconnect' ? (
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Unplug className="mr-2 h-3.5 w-3.5" />
          )}
          Disconnect
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Search Console property */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Search Console property (powers the SEO tab)
          </label>
          <Select value={status.gscSiteUrl || ''} onValueChange={v => select('gscSiteUrl', v)}>
            <SelectTrigger className="dark:border-zinc-800 dark:bg-[#18181b]">
              <SelectValue placeholder="Pick a property…" />
            </SelectTrigger>
            <SelectContent className="dark:border-[hsl(0,0%,14%)] dark:bg-[hsl(0,0%,8%)]">
              {(status.gscSites || []).map(s => (
                <SelectItem key={s.siteUrl} value={s.siteUrl}>
                  {s.siteUrl}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* GA4 property */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            GA4 property (for the history import)
          </label>
          <Select
            value={status.ga4PropertyId || ''}
            onValueChange={v => select('ga4PropertyId', v)}
          >
            <SelectTrigger className="dark:border-zinc-800 dark:bg-[#18181b]">
              <SelectValue placeholder="Pick a property…" />
            </SelectTrigger>
            <SelectContent className="dark:border-[hsl(0,0%,14%)] dark:bg-[hsl(0,0%,8%)]">
              {(status.ga4Properties || []).map(p => (
                <SelectItem key={p.property} value={p.property}>
                  {p.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {status.ga4PropertyId ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={runImport}
            disabled={!!busy}
            className="border-0 bg-[#5e5ba4] text-white hover:bg-[#5e5ba4]/90"
          >
            {busy === 'import' ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-1.5 h-4 w-4" />
            )}
            Import GA history
          </Button>
          {importResult ? (
            <span className="text-xs text-emerald-300">{importResult}</span>
          ) : (
            <span className="text-xs text-muted-foreground/60">
              One click — re-running replaces the previous import.
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}
