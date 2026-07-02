import path from 'node:path';
import { UAParser } from 'ua-parser-js';
import { browserName, detectOS } from 'detect-browser';
import isLocalhost from 'is-localhost-ip';
import ipaddr from 'ipaddr.js';
import maxmind from 'maxmind';
import { safeDecodeURIComponent } from '@/lib/url';
import { stripPort, getIpAddress } from '@/lib/ip';

const MAXMIND = 'maxmind';
const MAXMIND_ASN = 'maxmind_asn';

// Network orgs that mean "cloud/hosting", i.e. almost certainly a bot — real
// visitors are on residential/mobile ISPs, never these. Used to drop stealth bots
// that send a clean browser UA from a datacenter IP (the kind isbot can't catch).
const DATACENTER_RE =
  /(amazon|aws|\bgoogle\b|microsoft|azure|digitalocean|hetzner|\bovh\b|linode|akamai|vultr|contabo|scaleway|oracle|alibaba|aliyun|tencent|leaseweb|m247|choopa|datacamp|hostwinds|colocrossing|quadranet|psychz|ioflood|gcore|fastly|hostinger|kamatera|upcloud|netcup|interserver|digital ?ocean|hosting|datacent|colocat|\bvps\b|\bllc\b.*cloud|cloud.*\bllc\b)/i;

// True if the IP belongs to a hosting/cloud provider. Fails open (returns false
// on any error) so it can never break ingestion. Disable with DISABLE_DATACENTER_CHECK.
export async function isDatacenterIp(ip: string = ''): Promise<boolean> {
  if (process.env.DISABLE_DATACENTER_CHECK || !ip) {
    return false;
  }
  try {
    if (await isLocalhost(ip)) {
      return false;
    }
    if (!globalThis[MAXMIND_ASN]) {
      const dir = path.join(process.cwd(), 'geo');
      globalThis[MAXMIND_ASN] = await maxmind.open(
        process.env.GEOLITE_ASN_DB_PATH || path.resolve(dir, 'GeoLite2-ASN.mmdb'),
      );
    }
    const result: any = globalThis[MAXMIND_ASN]?.get(stripPort(ip));
    const org = result?.autonomous_system_organization || '';
    return DATACENTER_RE.test(org);
  } catch {
    return false;
  }
}

const PROVIDER_HEADERS = [
  // Cloudflare headers
  {
    countryHeader: 'cf-ipcountry',
    regionHeader: 'cf-region-code',
    cityHeader: 'cf-ipcity',
  },
  // Vercel headers
  {
    countryHeader: 'x-vercel-ip-country',
    regionHeader: 'x-vercel-ip-country-region',
    cityHeader: 'x-vercel-ip-city',
  },
  // CloudFront headers
  {
    countryHeader: 'cloudfront-viewer-country',
    regionHeader: 'cloudfront-viewer-country-region',
    cityHeader: 'cloudfront-viewer-city',
  },
];

export function getDevice(userAgent: string, screen: string = '') {
  const { device } = UAParser(userAgent);

  const [width] = screen.split('x');

  const type = device?.type || 'desktop';

  if (type === 'desktop' && screen && +width <= 1920) {
    return 'laptop';
  }

  return type;
}

function getRegionCode(country: string, region: string) {
  if (!country || !region) {
    return undefined;
  }

  return region.includes('-') ? region : `${country}-${region}`;
}

function decodeHeader(s: string | undefined | null): string | undefined | null {
  if (s === undefined || s === null) {
    return s;
  }

  return Buffer.from(s, 'latin1').toString('utf-8');
}

export async function getLocation(ip: string = '', headers: Headers, hasPayloadIP: boolean) {
  // Ignore local ips
  if (!ip || (await isLocalhost(ip))) {
    return {
      country: 'US',
      region: 'US-CA',
      city: 'San Francisco',
      latitude: 37.7749,
      longitude: -122.4194,
    };
  }

  if (!hasPayloadIP && !process.env.SKIP_LOCATION_HEADERS) {
    for (const provider of PROVIDER_HEADERS) {
      const countryHeader = headers.get(provider.countryHeader);
      if (countryHeader) {
        const country = decodeHeader(countryHeader);
        const region = decodeHeader(headers.get(provider.regionHeader));
        const city = decodeHeader(headers.get(provider.cityHeader));

        return {
          country,
          region: getRegionCode(country, region),
          city,
        };
      }
    }
  }

  // Database lookup
  if (!globalThis[MAXMIND]) {
    const dir = path.join(process.cwd(), 'geo');

    globalThis[MAXMIND] = await maxmind.open(
      process.env.GEOLITE_DB_PATH || path.resolve(dir, 'GeoLite2-City.mmdb'),
    );
  }

  const result = globalThis[MAXMIND]?.get(stripPort(ip));

  if (result) {
    const country = result.country?.iso_code ?? result?.registered_country?.iso_code;
    const region = result.subdivisions?.[0]?.iso_code;
    const city = result.city?.names?.en;

    return {
      country,
      region: getRegionCode(country, region),
      city,
      latitude: result.location?.latitude,
      longitude: result.location?.longitude,
    };
  }
}

export async function getClientInfo(request: Request, payload: Record<string, any>) {
  const userAgent = payload?.userAgent || request.headers.get('user-agent');
  const ip = payload?.ip || getIpAddress(request.headers);
  const location = await getLocation(ip, request.headers, !!payload?.ip);
  const country = safeDecodeURIComponent(location?.country);
  const region = safeDecodeURIComponent(location?.region);
  const city = safeDecodeURIComponent(location?.city);
  const latitude = (location as any)?.latitude ?? null;
  const longitude = (location as any)?.longitude ?? null;
  const browser = browserName(userAgent);
  const os = detectOS(userAgent) as string;
  const device = getDevice(userAgent, payload?.screen);

  return { userAgent, browser, os, ip, country, region, city, latitude, longitude, device };
}

export function hasBlockedIp(clientIp: string) {
  const ignoreIps = process.env.IGNORE_IP;

  if (ignoreIps) {
    const ips = [];

    if (ignoreIps) {
      ips.push(...ignoreIps.split(',').map(n => n.trim()));
    }

    return ips.find(ip => {
      if (ip === clientIp) {
        return true;
      }

      // CIDR notation
      if (ip.indexOf('/') > 0) {
        const addr = ipaddr.parse(clientIp);
        const range = ipaddr.parseCIDR(ip);

        if (addr.kind() === range[0].kind() && addr.match(range)) {
          return true;
        }
      }
    });
  }

  return false;
}
