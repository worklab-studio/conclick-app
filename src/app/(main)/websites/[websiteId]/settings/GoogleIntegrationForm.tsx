'use client';

import { useState } from 'react';
import { ArrowRight, Check, Copy, Download, ExternalLink, Loader2, Unplug } from 'lucide-react';
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

// Service-account "invite our reader" connect: the customer adds Conclick's
// reader email as a read-only user in their own Search Console + GA4, then we
// list the properties they shared and auto-match by domain. No OAuth, no
// verification, no token held. One Google consent powers the SEO tab (Search
// Console) and the one-time GA4 history import.

interface GoogleStatus {
  connected: boolean;
  configured: boolean;
  serviceEmail?: string;
  gscSiteUrl?: string | null;
  ga4PropertyId?: string | null;
  gscSites?: { siteUrl: string }[];
  ga4Properties?: { property: string; displayName: string }[];
  suggested?: { gscSiteUrl: string | null; ga4PropertyId: string | null };
}

const GSC_USERS = 'https://search.google.com/search-console/users';
const GA_ADMIN = 'https://analytics.google.com/analytics/web/#/admin';

export function GoogleIntegrationForm({ websiteId }: { websiteId: string }) {
  const { get, post, del, useQuery } = useApi();
  const { toast } = useToast();

  const { data: status, refetch } = useQuery<GoogleStatus>({
    queryKey: ['google-status', websiteId],
    queryFn: () => get(`/websites/${websiteId}/google`, { lists: '1' }),
  });

  const [busy, setBusy] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const copyEmail = () => {
    if (!status?.serviceEmail) return;
    navigator.clipboard?.writeText(status.serviceEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const select = async (field: 'gscSiteUrl' | 'ga4PropertyId', value: string) => {
    await post(`/websites/${websiteId}/google`, { [field]: value });
    refetch();
  };

  // "I've added it" — list the now-shared properties and auto-connect the
  // domain match, so most connections need no manual pick.
  const findProperties = async () => {
    setBusy('find');
    try {
      const res: GoogleStatus = await get(`/websites/${websiteId}/google`, { lists: '1' });
      setRevealed(true);
      const hasLists = !!(res.gscSites?.length || res.ga4Properties?.length);
      if (!hasLists) {
        toast(
          'No shared properties yet, add the reader email above, give Google a few seconds, and retry.',
        );
      } else if (res.suggested?.gscSiteUrl || res.suggested?.ga4PropertyId) {
        await post(`/websites/${websiteId}/google`, {
          gscSiteUrl: res.suggested.gscSiteUrl,
          ga4PropertyId: res.suggested.ga4PropertyId,
        });
        toast('Connected, using the property you shared.');
      }
      await refetch();
    } catch (e: any) {
      toast(e?.message || 'Could not reach Google, try again.');
    } finally {
      setBusy(null);
    }
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
      setRevealed(false);
      refetch();
    } finally {
      setBusy(null);
    }
  };

  if (!status) return null;

  if (!status.configured) {
    return (
      <p className="text-xs text-amber-300/80">
        Google reader isn&apos;t set up on this server yet (GOOGLE_SERVICE_ACCOUNT_KEY).
      </p>
    );
  }

  const hasLists = !!(status.gscSites?.length || status.ga4Properties?.length);

  // ----- Not connected: invite the reader, then find/pick -----
  if (!status.connected) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Connect Google for the <span className="font-semibold text-foreground">SEO tab</span>{' '}
          (Search Console queries, clicks, impressions) and a one-time{' '}
          <span className="font-semibold text-foreground">GA history import</span>. Read-only, you
          grant access in your own Google, no sign-in here, revoke anytime.
        </p>

        {/* reader address */}
        <div>
          <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground/70">
            Add this reader to your properties
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-[hsl(0,0%,16%)] bg-[#0f0f11] px-3 py-2.5">
            <code className="truncate font-mono text-xs text-[#b7b4e4]">{status.serviceEmail}</code>
            <button
              type="button"
              onClick={copyEmail}
              className="flex shrink-0 items-center gap-1.5 rounded-md border border-[hsl(0,0%,18%)] bg-[hsl(0,0%,12%)] px-2.5 py-1.5 text-[11.5px] font-semibold text-foreground/90 transition-colors hover:bg-[hsl(0,0%,15%)]"
            >
              {copied ? (
                <Check className="h-3 w-3 text-emerald-400" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* two deep-linked steps */}
        <div className="space-y-2.5">
          <Step n={1} href={GSC_USERS} label="Open Search Console">
            Add it in <b className="font-semibold text-foreground">Search Console</b> → Settings →
            Users and permissions, permission <Role>Restricted</Role> is enough.
          </Step>
          <Step n={2} href={GA_ADMIN} label="Open Analytics">
            Add the same address in{' '}
            <b className="font-semibold text-foreground">Google Analytics</b> → Admin → Property
            access management, role <Role>Viewer</Role>.
          </Step>
        </div>

        <Button
          onClick={findProperties}
          disabled={busy === 'find'}
          className="border-0 bg-[#5e5ba4] text-white hover:bg-[#5e5ba4]/90"
        >
          {busy === 'find' ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="mr-1.5 h-4 w-4" />
          )}
          I&apos;ve added it, find my properties
        </Button>

        {/* lists found but nothing auto-matched → pick manually */}
        {revealed && hasLists ? (
          <div className="space-y-3 rounded-lg border border-[hsl(0,0%,13%)] bg-[hsl(0,0%,9%)] p-4">
            <div className="text-xs text-muted-foreground">
              Found your shared properties, pick which map to this website.
            </div>
            <PropertyPickers status={status} onSelect={select} />
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground/60">
            We&apos;ll list only the properties you share with the reader above.
          </p>
        )}
      </div>
    );
  }

  // ----- Connected -----
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] p-4">
        <div className="flex items-center gap-3">
          <Check className="h-5 w-5 text-emerald-400" />
          <div>
            <div className="text-sm font-semibold text-foreground">Google connected</div>
            <div className="text-xs text-muted-foreground">
              Reading the properties you shared · revoke by removing the reader in Google.
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

      <PropertyPickers status={status} onSelect={select} />

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
              One click, re-running replaces the previous import.
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Step({
  n,
  href,
  label,
  children,
}: {
  n: number;
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#5e5ba4]/35 bg-[#5e5ba4]/20 text-[11px] font-bold text-[#b7b4e4]">
        {n}
      </span>
      <span className="flex-1 text-xs leading-relaxed text-muted-foreground">{children}</span>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[hsl(0,0%,18%)] px-2.5 py-1.5 text-[11.5px] font-semibold text-[#b7b4e4] transition-colors hover:border-[#5e5ba4]/50"
      >
        {label} <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}

const Role = ({ children }: { children: React.ReactNode }) => (
  <span className="rounded border border-[hsl(0,0%,15%)] bg-[hsl(0,0%,11%)] px-1.5 py-0.5 font-mono text-[10.5px] text-foreground/80">
    {children}
  </span>
);

function PropertyPickers({
  status,
  onSelect,
}: {
  status: GoogleStatus;
  onSelect: (field: 'gscSiteUrl' | 'ga4PropertyId', value: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Search Console property (powers the SEO tab)
        </label>
        <Select value={status.gscSiteUrl || ''} onValueChange={v => onSelect('gscSiteUrl', v)}>
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

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          GA4 property (for the history import)
        </label>
        <Select
          value={status.ga4PropertyId || ''}
          onValueChange={v => onSelect('ga4PropertyId', v)}
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
  );
}
