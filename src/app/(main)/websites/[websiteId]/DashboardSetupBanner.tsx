'use client';

import { useState } from 'react';
import { useApi } from '@/components/hooks/useApi';
import { useTimezone } from '@/components/hooks';
import { Button } from '@/components/ui/button';
import { Check, Code2, Copy, ExternalLink } from 'lucide-react';

/**
 * Shown at the top of a website dashboard only while the site has never
 * received data — turns an empty dashboard into a guided "install your code"
 * step instead of a wall of zeros. Hides itself automatically once data flows.
 */
export function DashboardSetupBanner({
  websiteId,
  domain,
}: {
  websiteId: string;
  domain?: string;
}) {
  const { get, useQuery } = useApi();
  const { timezone } = useTimezone();
  const [copied, setCopied] = useState(false);

  const { data: lifetime } = useQuery({
    queryKey: ['website:lifetime', websiteId, timezone],
    queryFn: () =>
      get(`/websites/${websiteId}/stats`, {
        startAt: new Date('2020-01-01').getTime(),
        endAt: Date.now(),
        unit: 'month',
        timezone,
      }),
    enabled: !!websiteId,
    staleTime: 60_000,
  });

  // Hide while loading, and once the site has any data.
  if (!lifetime || (lifetime.pageviews || 0) > 0) return null;

  const host = typeof window !== 'undefined' ? window.location.origin : 'https://app.conclick.io';
  const snippet = `<script defer src="${host}/script.js" data-website-id="${websiteId}"></script>`;
  const siteUrl = domain ? (domain.startsWith('http') ? domain : `https://${domain}`) : null;

  const copy = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-[#5e5ba4]/30 bg-gradient-to-br from-[#5e5ba4]/10 to-transparent p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#5e5ba4]/15 text-indigo-300 ring-1 ring-inset ring-[#5e5ba4]/30">
          <Code2 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">
            Finish setup, install your tracking code
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            No data yet. Paste this into the <code className="text-foreground">&lt;head&gt;</code>{' '}
            of {domain ? <span className="text-foreground">{domain}</span> : 'your site'} and
            analytics start flowing automatically.
          </p>
          <div className="mt-3 flex items-stretch gap-2">
            <code className="flex-1 overflow-x-auto whitespace-nowrap rounded-md border border-[hsl(0,0%,14%)] bg-[#0f0f12] px-3 py-2 font-mono text-xs text-zinc-300">
              {snippet}
            </code>
            <Button variant="outline" size="icon" onClick={copy} className="shrink-0">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          {siteUrl && (
            <a
              href={siteUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-300 transition-colors hover:text-indigo-200"
            >
              Open {domain} to generate your first visit
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
