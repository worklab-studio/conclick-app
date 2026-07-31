import { NextResponse } from 'next/server';
import dns from 'dns/promises';
import net from 'net';
import { checkAuth } from '@/lib/auth';

// Hard cap on response size to avoid pulling down a multi-GB document.
const MAX_BYTES = 1 * 1024 * 1024;

// Reject anything that resolves to a private / link-local / loopback /
// reserved IP. Otherwise an authenticated user can probe internal services
// (cloud metadata at 169.254.169.254, localhost Postgres/Redis, VPC IPs).
function isPrivateIp(ip: string): boolean {
  if (net.isIP(ip) === 4) {
    const parts = ip.split('.').map(Number);
    // 10.0.0.0/8
    if (parts[0] === 10) return true;
    // 127.0.0.0/8
    if (parts[0] === 127) return true;
    // 169.254.0.0/16 (link-local incl. cloud metadata)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // 172.16.0.0/12
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 0.0.0.0/8
    if (parts[0] === 0) return true;
    return false;
  }

  if (net.isIP(ip) === 6) {
    const lower = ip.toLowerCase();
    // ::1 loopback
    if (lower === '::1' || lower === '0:0:0:0:0:0:0:1') return true;
    // fc00::/7 unique-local
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
    // fe80::/10 link-local
    if (
      lower.startsWith('fe8') ||
      lower.startsWith('fe9') ||
      lower.startsWith('fea') ||
      lower.startsWith('feb')
    )
      return true;
    // IPv4-mapped IPv6
    if (lower.startsWith('::ffff:')) {
      return isPrivateIp(lower.slice('::ffff:'.length));
    }
    return false;
  }

  return false;
}

async function isHostSafe(hostname: string): Promise<boolean> {
  // Reject literal "localhost"-style names too, even though DNS would catch them.
  if (/^localhost$/i.test(hostname) || hostname === '0.0.0.0') return false;

  // If the hostname is itself a literal IP, check it directly.
  if (net.isIP(hostname)) {
    return !isPrivateIp(hostname);
  }

  try {
    const records = await dns.lookup(hostname, { all: true });
    if (records.length === 0) return false;
    return records.every(r => !isPrivateIp(r.address));
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    // Require authentication. The endpoint used to be fully open, letting
    // anyone use the server as an outbound proxy / SSRF probe.
    const auth = await checkAuth(req);
    if (!auth?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { url, websiteId } = await req.json();

    if (typeof url !== 'string' || typeof websiteId !== 'string' || !url || !websiteId) {
      return NextResponse.json({ success: false, message: 'Missing parameters' }, { status: 400 });
    }

    const targetUrl = url.startsWith('http') ? url : `https://${url}`;

    let parsed: URL;
    try {
      parsed = new URL(targetUrl);
    } catch {
      return NextResponse.json({ success: false, message: 'Invalid URL' }, { status: 400 });
    }

    // Only allow http/https. No file:, javascript:, gopher:, ftp:, etc.
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return NextResponse.json(
        { success: false, message: 'Unsupported URL scheme' },
        { status: 400 },
      );
    }

    // Block private / link-local / loopback hosts.
    if (!(await isHostSafe(parsed.hostname))) {
      return NextResponse.json({ success: false, message: 'Host not allowed' }, { status: 400 });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let response: Response;
    try {
      response = await fetch(parsed.toString(), {
        signal: controller.signal,
        headers: { 'User-Agent': 'Conclick-Verifier/1.0' },
        redirect: 'manual', // Don't follow redirects, they could hop to a private host.
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      return NextResponse.json({ success: false, message: 'Failed to fetch website' });
    }

    // Cap the size of the response body we read.
    const reader = response.body?.getReader();
    if (!reader) {
      return NextResponse.json({ success: false });
    }

    let received = 0;
    let html = '';
    const decoder = new TextDecoder();
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > MAX_BYTES) {
        await reader.cancel();
        break;
      }
      html += decoder.decode(value, { stream: true });
    }
    html += decoder.decode();

    const hasId = html.includes(websiteId);

    return NextResponse.json({ success: hasId });
  } catch (error: any) {
    // Don't echo raw error messages — they leak connection state (DNS vs
    // refused vs timeout), which is a timing/info oracle.
    // eslint-disable-next-line no-console
    console.error('Verification error:', error?.message ?? error);
    return NextResponse.json({ success: false, message: 'Verification failed' });
  }
}
