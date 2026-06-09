'use client';

import { ReactNode, useState } from 'react';
import { format } from 'date-fns';
import {
  X,
  Copy,
  Check,
  Calendar,
  MapPin,
  Building2,
  Monitor,
  Languages,
  KeyRound,
} from 'lucide-react';
import { Avatar } from '@/components/common/Avatar';
import { TypeIcon } from '@/components/common/TypeIcon';
import { LoadingPanel } from '@/components/common/LoadingPanel';
import { useFormat, useLocale, useRegionNames, useWebsiteSessionQuery } from '@/components/hooks';
import { friendlyName } from '@/lib/friendly-name';
import { formatShortTime } from '@/lib/format';
import { SessionActivity } from './SessionActivity';
import { SessionData } from './SessionData';

function fmtDate(value: any) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return format(d, 'MMM d, yyyy · h:mm a');
}

// OS icon filenames are slug-cased (e.g. "Windows 10" -> "windows-10").
const osIcon = (os?: string) => os?.toLowerCase()?.replaceAll(/\W/g, '-');

export function SessionProfile({
  websiteId,
  sessionId,
  onClose,
}: {
  websiteId: string;
  sessionId: string;
  onClose?: () => void;
}) {
  const { data, isLoading, error } = useWebsiteSessionQuery(websiteId, sessionId);
  const { formatValue } = useFormat();
  const { locale } = useLocale();
  const { getRegionName } = useRegionNames(locale);
  const [tab, setTab] = useState<'activity' | 'properties'>('activity');
  const [copied, setCopied] = useState(false);

  const copyId = () => {
    if (!data?.id) return;
    navigator.clipboard.writeText(data.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <LoadingPanel
      data={data}
      isLoading={isLoading}
      error={error}
      loadingIcon="spinner"
      loadingPlacement="absolute"
    >
      {data && (
        <div className="overflow-hidden rounded-2xl border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,8%)]">
          {/* Header */}
          <div className="relative flex items-start gap-4 border-b border-[hsl(0,0%,12%)] p-6">
            <Avatar seed={data.id} size={60} />
            <div className="min-w-0 flex-1 pr-10">
              <div className="text-xl font-semibold capitalize text-foreground">
                {friendlyName(data.distinctId || data.id)}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                {data.country && (
                  <span className="inline-flex items-center gap-1.5">
                    <TypeIcon type="country" value={data.country} />
                    {formatValue(data.country, 'country')}
                  </span>
                )}
                {(data.city || data.region) && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground/70" />
                    {[data.city, getRegionName(data.region)].filter(Boolean).join(', ')}
                  </span>
                )}
                {data.device && (
                  <span className="inline-flex items-center gap-1.5">
                    <TypeIcon type="device" value={data.device} />
                    {formatValue(data.device, 'device')}
                  </span>
                )}
                {data.os && (
                  <span className="inline-flex items-center gap-1.5">
                    <TypeIcon type="os" value={osIcon(data.os)} />
                    {formatValue(data.os, 'os')}
                  </span>
                )}
                {data.browser && (
                  <span className="inline-flex items-center gap-1.5">
                    <TypeIcon type="browser" value={data.browser} />
                    {formatValue(data.browser, 'browser')}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={copyId}
                title="Copy ID"
                className="mt-3 inline-flex max-w-full items-center gap-2 rounded-lg border border-[hsl(0,0%,15%)] bg-[hsl(0,0%,5%)] px-2.5 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <span className="truncate">{data.id}</span>
                {copied ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5 shrink-0 opacity-60" />
                )}
              </button>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg border border-[hsl(0,0%,15%)] text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 divide-[hsl(0,0%,12%)] border-b border-[hsl(0,0%,12%)] md:grid-cols-6 md:divide-x">
            <Stat label="Visits" value={data.visits} />
            <Stat label="Page views" value={data.views} />
            <Stat label="Events" value={data.events} />
            <Stat
              label="Time spent"
              value={`${formatShortTime(Math.abs(~~(data.totaltime / (data.visits || 1))), ['m', 's'], ' ')}`}
            />
            <Stat
              label="Max scroll"
              value={data.maxScroll != null ? `${Math.round(Number(data.maxScroll))}%` : '—'}
            />
            <Stat label="Clicks" value={data.clicks != null ? Number(data.clicks) : '—'} />
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-x-7 gap-y-5 p-6 md:grid-cols-4">
            <Field label="First seen" icon={<Calendar className="h-3.5 w-3.5" />}>
              {fmtDate(data.firstAt)}
            </Field>
            <Field label="Last seen" icon={<Calendar className="h-3.5 w-3.5" />}>
              {fmtDate(data.lastAt)}
            </Field>
            <Field
              label="Distinct ID"
              icon={<KeyRound className="h-3.5 w-3.5" />}
              muted={!data.distinctId}
            >
              {data.distinctId || 'not identified'}
            </Field>
            <Field label="Region" icon={<MapPin className="h-3.5 w-3.5" />}>
              {getRegionName(data.region) || '—'}
            </Field>
            <Field label="City" icon={<Building2 className="h-3.5 w-3.5" />}>
              {data.city || '—'}
            </Field>
            <Field label="Device" icon={<Monitor className="h-3.5 w-3.5" />}>
              {[formatValue(data.device, 'device'), data.screen].filter(Boolean).join(' · ') || '—'}
            </Field>
            <Field label="Language" icon={<Languages className="h-3.5 w-3.5" />}>
              {data.language ? formatValue(data.language, 'language') : '—'}
            </Field>
          </div>

          {/* Tabs */}
          <div className="flex gap-6 border-b border-[hsl(0,0%,12%)] px-6">
            <TabButton active={tab === 'activity'} onClick={() => setTab('activity')}>
              Activity
            </TabButton>
            <TabButton active={tab === 'properties'} onClick={() => setTab('properties')}>
              Properties
            </TabButton>
          </div>
          <div className="p-6">
            {tab === 'activity' ? (
              <SessionActivity
                websiteId={websiteId}
                sessionId={sessionId}
                startDate={data.firstAt}
                endDate={data.lastAt}
              />
            ) : (
              <SessionData sessionId={sessionId} websiteId={websiteId} />
            )}
          </div>
        </div>
      )}
    </LoadingPanel>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="p-5">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold tracking-tight text-foreground">{value ?? 0}</div>
    </div>
  );
}

function Field({
  label,
  icon,
  muted,
  children,
}: {
  label: string;
  icon?: ReactNode;
  muted?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
        {label}
      </div>
      <div
        className={`mt-2 flex items-center gap-2 text-sm ${muted ? 'text-muted-foreground/50' : 'text-foreground'}`}
      >
        <span className="shrink-0 text-muted-foreground/60">{icon}</span>
        <span className="truncate">{children}</span>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 px-0.5 pb-3 pt-2.5 text-sm transition-colors ${
        active
          ? 'border-[#5e5ba4] text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}
