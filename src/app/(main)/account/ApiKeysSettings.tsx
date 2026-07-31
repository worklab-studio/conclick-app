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
import { Copy, Check, Plus, Trash2, KeyRound, Loader2 } from 'lucide-react';

const MCP_CONFIG = `{
  "mcpServers": {
    "conclick": {
      "command": "npx",
      "args": ["-y", "conclick-mcp"],
      "env": { "CONCLICK_API_KEY": "ck_live_…" }
    }
  }
}`;

const CLAUDE_CMD =
  'claude mcp add conclick --env CONCLICK_API_KEY=ck_live_… -- npx -y conclick-mcp';

const EXAMPLE_PROMPTS = [
  'List my sites and which got the most visitors this week',
  "Show conclick.io's top pages and referrers (last 30 days)",
  'How many people are on conclick.io right now?',
  'Connect my Dodo test key to conclick.io and show revenue',
];

export function ApiKeysSettings() {
  const { get, post, del, useQuery } = useApi();
  const { toast } = useToast();

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => get('/keys'),
  });
  const keys: any[] = data?.keys || [];

  const [name, setName] = useState('');
  const [scope, setScope] = useState('all');
  const [busy, setBusy] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const create = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const res = await post('/keys', { name: name.trim(), scope });
      setNewKey(res.key);
      setName('');
      refetch();
    } catch (e: any) {
      toast(e?.message || 'Could not create key.');
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    try {
      await del(`/keys/${id}`);
      toast('Key revoked.');
      refetch();
    } catch (e: any) {
      toast(e?.message || 'Could not revoke key.');
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast('Copied to clipboard.');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Let Cursor, Claude Code, Codex, or any script control Conclick, query visitors, inspect
        revenue, manage websites, and connect payment providers, through the Conclick MCP server.
      </p>

      {newKey && (
        <div className="space-y-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] p-4">
          <div className="text-sm font-semibold text-emerald-200">Your new key, copy it now</div>
          <div className="flex gap-2">
            <code className="flex-1 truncate rounded-md border border-zinc-800 bg-[#0f0f12] px-3 py-2 font-mono text-xs text-zinc-200">
              {newKey}
            </code>
            <Button
              variant="outline"
              size="icon"
              onClick={() => copy(newKey)}
              className="shrink-0 border-zinc-700"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            You won&apos;t be able to see this key again, store it somewhere safe.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[160px] flex-1 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Key name</label>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Claude Code"
            className="dark:border-zinc-800 dark:bg-[#18181b]"
          />
        </div>
        <div className="w-36 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Scope</label>
          <Select value={scope} onValueChange={setScope}>
            <SelectTrigger className="dark:border-zinc-800 dark:bg-[#18181b]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="dark:border-[hsl(0,0%,14%)] dark:bg-[hsl(0,0%,8%)]">
              <SelectItem value="all">Read &amp; write</SelectItem>
              <SelectItem value="read">Read only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={create}
          disabled={busy || !name.trim()}
          style={{ backgroundColor: '#5e5ba4', color: 'white' }}
          className="border-0 hover:opacity-90"
        >
          {busy ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          Create key
        </Button>
      </div>

      <div className="divide-y divide-[hsl(0,0%,12%)] rounded-lg border border-[hsl(0,0%,12%)]">
        {isLoading ? (
          <div className="p-4 text-sm text-muted-foreground">Loading…</div>
        ) : keys.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No API keys yet.</div>
        ) : (
          keys.map(k => (
            <div key={k.id} className="flex items-center justify-between gap-3 p-3">
              <div className="flex min-w-0 items-center gap-3">
                <KeyRound className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">{k.name}</div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {k.prefix}… · {k.scope === 'read' ? 'read only' : 'read & write'}
                    {k.lastUsedAt
                      ? `  ·  used ${new Date(k.lastUsedAt).toLocaleDateString()}`
                      : '  ·  never used'}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => revoke(k.id)}
                className="shrink-0 text-red-500 hover:bg-red-500/10 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>

      <div className="space-y-3 rounded-lg border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,7%)] p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold text-foreground">Connect your AI editor</div>
          <a
            href="https://www.npmjs.com/package/conclick-mcp"
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-xs font-medium text-indigo-300 hover:text-indigo-200"
          >
            Full docs ↗
          </a>
        </div>

        <p className="text-xs text-muted-foreground">Cursor / Codex / any MCP client:</p>
        <div className="relative">
          <pre className="overflow-x-auto rounded-md border border-zinc-800 bg-[#0f0f12] p-3 pr-10 text-xs leading-relaxed text-zinc-300">
            <code>{MCP_CONFIG}</code>
          </pre>
          <Button
            variant="outline"
            size="icon"
            onClick={() => copy(MCP_CONFIG)}
            className="absolute right-2 top-2 h-7 w-7 border-zinc-700"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">Claude Code, one command:</p>
        <div className="relative">
          <pre className="overflow-x-auto rounded-md border border-zinc-800 bg-[#0f0f12] p-3 pr-10 text-xs text-zinc-300">
            <code>{CLAUDE_CMD}</code>
          </pre>
          <Button
            variant="outline"
            size="icon"
            onClick={() => copy(CLAUDE_CMD)}
            className="absolute right-2 top-2 h-7 w-7 border-zinc-700"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="pt-1">
          <div className="text-xs font-medium text-muted-foreground">Then just ask:</div>
          <ul className="mt-1.5 space-y-1">
            {EXAMPLE_PROMPTS.map(p => (
              <li key={p} className="flex items-start gap-2 text-xs text-zinc-300">
                <span className="mt-px text-indigo-400">›</span>
                <span>&ldquo;{p}&rdquo;</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
