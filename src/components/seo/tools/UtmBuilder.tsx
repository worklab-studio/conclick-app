'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

const FIELDS = [
  { key: 'utm_source', label: 'Campaign source', placeholder: 'google, newsletter, twitter', required: true },
  { key: 'utm_medium', label: 'Campaign medium', placeholder: 'cpc, email, social', required: true },
  { key: 'utm_campaign', label: 'Campaign name', placeholder: 'spring_sale', required: true },
  { key: 'utm_term', label: 'Campaign term (optional)', placeholder: 'running shoes' },
  { key: 'utm_content', label: 'Campaign content (optional)', placeholder: 'logolink, textlink' },
] as const;

export function UtmBuilder() {
  const [base, setBase] = useState('');
  const [vals, setVals] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  const set = (k: string, v: string) => setVals(s => ({ ...s, [k]: v }));

  const out = (() => {
    if (!base.trim()) return '';
    let url: URL;
    try {
      url = new URL(base.includes('://') ? base.trim() : `https://${base.trim()}`);
    } catch {
      return '';
    }
    for (const f of FIELDS) {
      const v = (vals[f.key] || '').trim();
      if (v) url.searchParams.set(f.key, v);
    }
    return url.toString();
  })();

  const copy = () => {
    if (!out) return;
    navigator.clipboard.writeText(out);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="my-8 rounded-2xl border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,8%)] p-6">
      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-medium text-zinc-300">Website URL</label>
        <input
          value={base}
          onChange={e => setBase(e.target.value)}
          placeholder="https://example.com/pricing"
          className="h-10 w-full rounded-lg border border-[hsl(0,0%,16%)] bg-[#18181b] px-3 text-sm text-white placeholder:text-muted-foreground/50 focus:border-[#6C63C9] focus:outline-none focus:ring-1 focus:ring-[#6C63C9]"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map(f => (
          <div key={f.key}>
            <label className="mb-1.5 block text-xs font-medium text-zinc-300">
              {f.label}
              {f.required && <span className="text-[#8b88cf]"> *</span>}
            </label>
            <input
              value={vals[f.key] || ''}
              onChange={e => set(f.key, e.target.value)}
              placeholder={f.placeholder}
              className="h-10 w-full rounded-lg border border-[hsl(0,0%,16%)] bg-[#18181b] px-3 text-sm text-white placeholder:text-muted-foreground/50 focus:border-[#6C63C9] focus:outline-none focus:ring-1 focus:ring-[#6C63C9]"
            />
          </div>
        ))}
      </div>
      <div className="mt-5">
        <label className="mb-1.5 block text-xs font-medium text-zinc-300">Your campaign URL</label>
        <div className="flex gap-2">
          <div className="flex-1 truncate rounded-lg border border-[hsl(0,0%,16%)] bg-[#0e0e10] px-3 py-2.5 text-sm text-[#c7c5ec]">
            {out || <span className="text-muted-foreground/50">Fill the fields above…</span>}
          </div>
          <button
            onClick={copy}
            disabled={!out}
            className="flex h-[42px] shrink-0 items-center gap-1.5 rounded-lg bg-[#5e5ba4] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#6b68b5] disabled:opacity-40"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" /> Copy
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
