// Friendly names for the referrer domains the digest hypes about. Spike copy
// and the LLM prompt use these (the channel classifier doesn't know Product
// Hunt, so referrer detection runs on raw referrer_domain). Exact match first,
// then suffix/prefix; unknown domains keep their bare host.

const EXACT: Record<string, string> = {
  'producthunt.com': 'Product Hunt',
  'news.ycombinator.com': 'Hacker News',
  'x.com': 'X (Twitter)',
  'twitter.com': 'X (Twitter)',
  't.co': 'X (Twitter)',
  'reddit.com': 'Reddit',
  'old.reddit.com': 'Reddit',
  'linkedin.com': 'LinkedIn',
  'lnkd.in': 'LinkedIn',
  'github.com': 'GitHub',
  'facebook.com': 'Facebook',
  'l.facebook.com': 'Facebook',
  'instagram.com': 'Instagram',
  'youtube.com': 'YouTube',
  'bing.com': 'Bing',
  'duckduckgo.com': 'DuckDuckGo',
  'perplexity.ai': 'Perplexity',
  'chatgpt.com': 'ChatGPT',
  'medium.com': 'Medium',
  'dev.to': 'DEV',
};

// Prefix rules for families of subdomains.
const PREFIXES: [string, string][] = [
  ['google.', 'Google'],
  ['news.google.', 'Google News'],
  ['baidu.', 'Baidu'],
  ['yandex.', 'Yandex'],
];

const bare = (domain: string) =>
  (domain || '').replace(/^www\./, '').toLowerCase().trim();

export function friendlyReferrer(domain: string | null | undefined): string {
  const host = bare(domain || '');
  if (!host) return 'Direct';
  if (EXACT[host]) return EXACT[host];
  for (const [prefix, name] of PREFIXES) {
    if (host === prefix.replace(/\.$/, '') || host.startsWith(prefix)) return name;
  }
  return host;
}
