# conclick-mcp

**Control [Conclick](https://app.conclick.io) analytics from your AI editor.** A
[Model Context Protocol](https://modelcontextprotocol.io) server that lets Cursor,
Claude Code, Codex, or any MCP client query visitors, inspect revenue, manage
websites, and connect payment providers — straight from a prompt.

```
npx conclick-mcp
```

---

## Quick start

### 1. Create an API key
In Conclick: **Account → API Keys → Create key** (choose *Read only* for queries, or
*Read & write* to also manage sites / connect providers). Copy the `ck_live_…` key —
it's shown once.

### 2. Add the server to your editor

**Claude Code** (one command):
```bash
claude mcp add conclick --env CONCLICK_API_KEY=ck_live_your_key -- npx -y conclick-mcp
```

**Cursor / Windsurf / Codex / any MCP client** — add to the MCP servers config:
```jsonc
{
  "mcpServers": {
    "conclick": {
      "command": "npx",
      "args": ["-y", "conclick-mcp"],
      "env": { "CONCLICK_API_KEY": "ck_live_your_key" }
    }
  }
}
```

Restart the editor — the `conclick` tools will appear.

---

## Configuration

| Env var | Required | Default | Notes |
|---------|----------|---------|-------|
| `CONCLICK_API_KEY` | ✅ | — | Your `ck_live_…` key from Account → API Keys |
| `CONCLICK_API_URL` | – | `https://app.conclick.io` | Set this only if you self-host Conclick |

---

## Tools

| Tool | Parameters | What it does |
|------|------------|--------------|
| `list_websites` | – | List your websites (`id`, `name`, `domain`) |
| `get_stats` | `websiteId`, `days?` (def 7) | Visitors, pageviews, bounce rate, avg visit time + prev-period comparison |
| `get_pageviews` | `websiteId`, `days?` (def 7) | Time-bucketed pageviews + visitors series (trends) |
| `get_top` | `websiteId`, `type`, `days?`, `limit?` | Top breakdown: `path`/`entry`/`exit`/`referrer`/`channel`/`browser`/`os`/`device`/`country`/`region`/`city`/`language` |
| `get_realtime` | `websiteId` | Live active-visitor count right now |
| `get_revenue` | `websiteId`, `days?` (def 30) | Revenue over N days (needs a connected payment provider) |
| `add_website` | `name`, `domain` | Create a new website to track (needs a read-&-write key) |
| `connect_payment_provider` | `websiteId`, `provider` (`dodo`/`stripe`), `apiKey`, `mode?` | Connect a payment provider so revenue flows in (read-&-write key) |

Tools return structured JSON; **your agent reasons over it** ("which channel drives
sales?", "what should I fix next?").

## Example prompts

- "List my Conclick sites and which got the most visitors this week."
- "Show conclick.io's top pages and referrers for the last 30 days."
- "How many people are on conclick.io right now?"
- "Add a website for example.com."
- "Connect my Dodo test key to conclick.io, then show this month's revenue."

---

## Local development (no publish needed)

Point the editor at a local checkout instead of npm:
```jsonc
{ "mcpServers": { "conclick": {
  "command": "node",
  "args": ["/absolute/path/to/conclick-app/mcp/index.js"],
  "env": { "CONCLICK_API_KEY": "ck_live_your_key" }
}}}
```

## Troubleshooting

- **401 / "unauthorized"** — the key is wrong, revoked, or for a different
  environment. Create a fresh one in Account → API Keys.
- **"Subscription required" on revenue** — connect a payment provider first
  (`connect_payment_provider`, or Conclick → Settings → Revenue Integration).
- **Tool not found / editor doesn't see it** — fully restart the editor after
  adding the server; confirm `npx conclick-mcp` runs in a terminal.

## Security

The API key authenticates **as your Conclick account**. Keep it secret, prefer a
**read-only** key when you only need queries, and **revoke** it anytime in
Account → API Keys. Keys are stored hashed server-side and shown only once.

## License

MIT
