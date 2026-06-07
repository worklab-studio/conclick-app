# @conclick/mcp

Control [Conclick](https://app.conclick.io) from Cursor, Claude Code, Codex, or any
MCP client. Query visitors, inspect revenue, manage websites, and connect payment
providers — from a prompt.

## Setup

1. In Conclick, go to **Account → API Keys** and create a key (`ck_live_…`).
2. Add the server to your editor's MCP config:

```jsonc
{
  "mcpServers": {
    "conclick": {
      "command": "npx",
      "args": ["-y", "@conclick/mcp"],
      "env": { "CONCLICK_API_KEY": "ck_live_your_key" }
    }
  }
}
```

- **Cursor:** Settings → MCP → add the block above.
- **Claude Code:** `claude mcp add conclick -e CONCLICK_API_KEY=ck_live_… -- npx -y @conclick/mcp`
- **Codex:** add to its MCP servers config.

Self-hosting Conclick? Set `CONCLICK_API_URL` (defaults to `https://app.conclick.io`).

## Tools

| Tool | What it does |
|------|--------------|
| `list_websites` | List your websites (id, name, domain) |
| `get_stats` | Visitors, pageviews, bounce rate, avg visit time over N days (+ comparison) |
| `get_top` | Top pages / referrers / browsers / countries / etc. |
| `get_revenue` | Revenue over N days (needs a connected payment provider) |
| `add_website` | Create a new website to track |
| `connect_payment_provider` | Connect Dodo / Stripe so revenue flows in |

The tools return structured JSON — your agent reasons over it ("which channel drives
sales?", "what should I fix next?").

## Example prompts

- "Which of my sites got the most visitors this week?"
- "Show conclick.io's top pages and referrers for the last 30 days."
- "Add a website for example.com, then give me the tracking snippet."
- "Connect my Dodo test key to conclick.io and show this month's revenue."

## Security

Your API key authenticates as your Conclick account. Keep it secret, scope it
read-only when you only need queries, and revoke it anytime in **Account → API Keys**.
