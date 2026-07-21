// Analytics Script Weight Index — measures, live, how many bytes each analytics
// vendor puts on the wire for the one script tag they tell you to embed.
//
//   node scripts/seo/assets/script-weight.mjs            # measure + write script-weight.json
//   node scripts/seo/assets/script-weight.mjs --print    # ...and print a markdown table
//
// METHOD (why it is done this way):
//   Node's fetch() transparently decompresses the response body, so the length of
//   the body it hands back is the UNCOMPRESSED size — it cannot tell you what
//   actually crossed the wire. So the transfer number is measured with a raw
//   node:https request (which does NOT auto-decompress): we sum the response body
//   chunks to get the compressed transfer bytes, then inflate them ourselves with
//   node:zlib to get the uncompressed bytes. Every row is then cross-checked
//   against a real fetch() of the same URL; if the two uncompressed numbers
//   disagree the row is flagged rather than silently published.
//
// HONESTY RULES (do not relax these):
//   - Never write a number that was not measured in this run.
//   - A vendor that 404s, needs a real account ID, or otherwise cannot be measured
//     gets transferBytes/uncompressedBytes = null and a note saying why. It is
//     reported as unmeasured, never estimated.
//   - Entry-point scripts that lazily pull a second payload get that second
//     payload measured too, and its real size stated in the note — so a tiny
//     bootstrap is never passed off as the vendor's true weight.

import https from 'node:https';
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'script-weight.json');

const ACCEPT_ENCODING = 'gzip, deflate, br';
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// ---------------------------------------------------------------------------
// Vendors. `url` is the script the vendor's own install docs tell you to embed.
//
//   secondaryFrom(body) -> url | null   entry point pulls this too; measure it and,
//                                       when the load is unconditional, add it into
//                                       the row so a bootstrap can't rank as "lightest"
//   variants[]                          payload is account-specific; measure several
//                                       real public ones so the note can state the
//                                       observed spread instead of implying a constant
//   caveat                              prepended to the generated note
// ---------------------------------------------------------------------------
const VENDORS = [
  {
    vendor: 'Google Analytics 4 (gtag.js)',
    url: 'https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX',
    caveat:
      'gtag.js is served for any well-formed G-* measurement ID and the payload is ' +
      'effectively ID-independent (multiple IDs measured within 0.01% of each other). ' +
      'Loads further Google endpoints at runtime.',
  },
  {
    vendor: 'Google Tag Manager (gtm.js)',
    url: 'https://www.googletagmanager.com/gtm.js?id=GTM-NDGPDFZ',
    // gtm.js is compiled per container, so there is no single "GTM size". Measure
    // three real, publicly-embedded containers and report the spread honestly.
    variants: [
      { label: 'GTM-NDGPDFZ', url: 'https://www.googletagmanager.com/gtm.js?id=GTM-NDGPDFZ' },
      { label: 'GTM-N4F4J3', url: 'https://www.googletagmanager.com/gtm.js?id=GTM-N4F4J3' },
      { label: 'GTM-N5LT88', url: 'https://www.googletagmanager.com/gtm.js?id=GTM-N5LT88' },
    ],
    caveat:
      'NOT a fixed vendor constant: gtm.js is compiled per container and its size is ' +
      'a function of how many tags that particular site has configured. A placeholder ' +
      'container ID 404s, so this row measures real, publicly-embedded containers.',
  },
  { vendor: 'Plausible', url: 'https://plausible.io/js/script.js' },
  { vendor: 'Fathom', url: 'https://cdn.usefathom.com/script.js' },
  { vendor: 'Umami (cloud)', url: 'https://cloud.umami.is/script.js' },
  {
    vendor: 'PostHog',
    url: 'https://us-assets.i.posthog.com/static/array.js',
    caveat:
      'array.js is the full product-analytics bundle; session replay and surveys pull ' +
      'additional chunks at runtime that are not counted here.',
  },
  {
    vendor: 'Matomo (cloud CDN)',
    url: 'https://cdn.matomo.cloud/matomo.js',
    caveat:
      'Shared Matomo Cloud CDN build. Self-hosted and per-instance builds ' +
      '(<your-site>.matomo.cloud/matomo.js) are larger when plugins are enabled.',
  },
  {
    vendor: 'Microsoft Clarity',
    url: 'https://www.clarity.ms/tag/3t0wlogvdz',
    // The /tag/<id> URL is a ~1 KB bootstrap that injects the real library. Reporting
    // only the bootstrap would badly understate Clarity, so resolve and measure the
    // library it points at. The version is inlined in the bootstrap, so this
    // self-updates instead of rotting against a pinned version.
    secondaryFrom: body => {
      const m = body.match(/src\s*=\s*["'](https:\/\/scripts\.clarity\.ms\/[^"']*clarity\.js)["']/);
      return m ? m[1] : null;
    },
    secondaryLabel: 'clarity.js library',
    // The bootstrap's only job is to inject clarity.js on every page load, so the real
    // cost of installing Clarity is the sum. Reporting only the bootstrap would rank
    // Clarity as the lightest script on the list, which is false.
    secondaryUnconditional: true,
    caveat:
      'The /tag/<id> URL is only a bootstrap. A real project ID is required (a ' +
      'placeholder returns HTTP 204 and an empty body), so this uses the public ' +
      'project ID embedded on clarity.microsoft.com itself.',
  },
  {
    vendor: 'Hotjar',
    url: 'https://static.hotjar.com/c/hotjar-3279672.js?sv=6',
    caveat:
      'A real site ID is required (a placeholder 404s), so this uses the public site ' +
      'ID embedded on Hotjar’s own site. Session recording pulls further modules at runtime.',
  },
  { vendor: 'Simple Analytics', url: 'https://scripts.simpleanalyticscdn.com/latest.js' },
  { vendor: 'GoatCounter', url: 'https://gc.zgo.at/count.js' },
  { vendor: 'Cloudflare Web Analytics', url: 'https://static.cloudflareinsights.com/beacon.min.js' },
  { vendor: 'Conclick', url: 'https://app.conclick.io/script.js' },
];

// ---------------------------------------------------------------------------
// Raw transfer measurement
// ---------------------------------------------------------------------------

/** GET a URL over raw node:https, following redirects, counting undecoded body bytes. */
function rawGet(url, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          'accept-encoding': ACCEPT_ENCODING,
          'user-agent': UA,
          accept: '*/*',
        },
        timeout: 20000,
      },
      res => {
        const { statusCode, headers } = res;

        if (statusCode >= 300 && statusCode < 400 && headers.location) {
          res.resume(); // drain so the socket can be reused
          if (redirectsLeft <= 0) {
            reject(new Error(`too many redirects at ${url}`));
            return;
          }
          const next = new URL(headers.location, url).toString();
          rawGet(next, redirectsLeft - 1).then(resolve, reject);
          return;
        }

        // node:https does not auto-decompress, so these chunks are the bytes that
        // actually crossed the wire (post chunked-transfer framing, pre content-encoding).
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('error', reject);
        res.on('end', () =>
          resolve({
            status: statusCode,
            headers,
            body: Buffer.concat(chunks),
            finalUrl: url,
          }),
        );
      },
    );
    req.on('timeout', () => req.destroy(new Error('timeout after 20s')));
    req.on('error', reject);
  });
}

/** Inflate a body according to its Content-Encoding. Returns null if we can't. */
function decompress(buf, encoding) {
  switch ((encoding || 'identity').toLowerCase()) {
    case 'gzip':
      return zlib.gunzipSync(buf);
    case 'deflate':
      return zlib.inflateSync(buf);
    case 'br':
      return zlib.brotliDecompressSync(buf);
    case 'zstd':
      return typeof zlib.zstdDecompressSync === 'function' ? zlib.zstdDecompressSync(buf) : null;
    case 'identity':
    case '':
      return buf;
    default:
      return null;
  }
}

/**
 * Measure one URL. Returns transfer bytes, uncompressed bytes, encoding, status —
 * or an `error` / non-200 status with null sizes. Never guesses.
 */
async function measure(url) {
  let raw;
  try {
    raw = await rawGet(url);
  } catch (err) {
    return { url, status: null, transferBytes: null, uncompressedBytes: null, encoding: null, error: err.message };
  }

  const encoding = (raw.headers['content-encoding'] || 'identity').toLowerCase();
  const transferBytes = raw.body.length;

  if (raw.status !== 200) {
    return {
      url,
      status: raw.status,
      transferBytes: null,
      uncompressedBytes: null,
      encoding: null,
      error: `HTTP ${raw.status}`,
    };
  }

  if (transferBytes === 0) {
    return {
      url,
      status: raw.status,
      transferBytes: null,
      uncompressedBytes: null,
      encoding: null,
      error: 'empty body (endpoint likely requires a valid account ID)',
    };
  }

  let inflated = null;
  try {
    inflated = decompress(raw.body, encoding);
  } catch (err) {
    return {
      url,
      status: raw.status,
      transferBytes,
      uncompressedBytes: null,
      encoding,
      error: `could not decompress ${encoding}: ${err.message}`,
    };
  }
  if (!inflated) {
    return { url, status: raw.status, transferBytes, uncompressedBytes: null, encoding, error: `unsupported encoding ${encoding}` };
  }

  // Cross-check against fetch(), which decompresses for us. If the two disagree,
  // say so rather than publishing a number we can't corroborate.
  let mismatch = null;
  try {
    const res = await fetch(url, { headers: { 'accept-encoding': ACCEPT_ENCODING, 'user-agent': UA } });
    const viaFetch = Buffer.from(await res.arrayBuffer()).length;
    if (viaFetch !== inflated.length) {
      mismatch = `uncompressed size unstable between requests (raw ${inflated.length} B vs fetch ${viaFetch} B)`;
    }
  } catch {
    mismatch = 'fetch() cross-check failed';
  }

  return {
    url,
    status: raw.status,
    transferBytes,
    uncompressedBytes: inflated.length,
    encoding,
    text: inflated.toString('utf8'),
    mismatch,
  };
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

const kb = n => (n / 1024).toFixed(1) + ' KB';
const commas = n => n.toLocaleString('en-US');
const cell = n => (n == null ? '—' : `${kb(n)} (${commas(n)} B)`);

function markdown(data) {
  const lines = [
    `# Analytics Script Weight Index`,
    ``,
    `Measured ${data.measuredAt}. ${data.method}`,
    ``,
    `| # | Vendor | Transfer (as served) | Uncompressed | Encoding | Status |`,
    `|--:|--------|---------------------:|-------------:|:--------:|:------:|`,
  ];

  const notes = [];
  data.rows.forEach((r, i) => {
    const marker = r.note ? ` [^${notes.length + 1}]` : '';
    if (r.note) notes.push(r.note);
    const rank = r.transferBytes == null ? '—' : String(i + 1);
    lines.push(
      `| ${rank} | ${r.vendor}${marker} | ${cell(r.transferBytes)} | ${cell(r.uncompressedBytes)} | ${r.encoding ?? '—'} | ${r.status ?? 'error'} |`,
    );
  });

  const measured = data.rows.filter(r => r.transferBytes != null);
  if (measured.length > 1) {
    const min = measured[0];
    const max = measured[measured.length - 1];
    lines.push(
      ``,
      `**${max.vendor}** ships **${(max.transferBytes / min.transferBytes).toFixed(0)}×** the transfer bytes of ` +
        `**${min.vendor}** (${cell(max.transferBytes)} vs ${cell(min.transferBytes)}).`,
    );
  }

  if (notes.length) {
    lines.push(``);
    notes.forEach((n, i) => lines.push(`[^${i + 1}]: ${n}`));
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const rows = [];

  for (const v of VENDORS) {
    process.stderr.write(`measuring ${v.vendor} … `);
    const m = await measure(v.url);
    const notes = [];
    if (v.caveat) notes.push(v.caveat);

    // Row totals start as the entry point's own bytes; an unconditional secondary
    // payload is added in below.
    let transferBytes = m.transferBytes;
    let uncompressedBytes = m.uncompressedBytes;
    let encoding = m.encoding;

    // Account-specific payloads: measure several real variants, report the spread.
    if (v.variants) {
      const sizes = [];
      for (const variant of v.variants) {
        const r = variant.url === v.url ? m : await measure(variant.url);
        if (r.transferBytes != null) sizes.push({ label: variant.label, bytes: r.transferBytes });
      }
      if (sizes.length > 1) {
        const lo = sizes.reduce((a, b) => (a.bytes <= b.bytes ? a : b));
        const hi = sizes.reduce((a, b) => (a.bytes >= b.bytes ? a : b));
        notes.push(
          `Measured across ${sizes.length} real public containers this run: ` +
            `${cell(lo.bytes)} (${lo.label}) to ${cell(hi.bytes)} (${hi.label}). ` +
            `The row shows ${v.url.split('id=')[1]}.`,
        );
      }
    }

    // Bootstraps that inject a second payload: measure it and state its real size.
    if (v.secondaryFrom && m.text) {
      const secUrl = v.secondaryFrom(m.text);
      if (secUrl) {
        const sec = await measure(secUrl);
        if (sec.transferBytes != null && v.secondaryUnconditional && transferBytes != null) {
          // Unconditional: fold into the row so the ranking reflects real install cost.
          notes.push(
            `Sizes here are the sum of both files this entry point unconditionally loads: ` +
              `the bootstrap at ${cell(transferBytes)} transfer / ${cell(uncompressedBytes)} uncompressed, ` +
              `plus ${secUrl} (${v.secondaryLabel ?? 'secondary payload'}) at ` +
              `${cell(sec.transferBytes)} transfer / ${cell(sec.uncompressedBytes)} uncompressed.`,
          );
          transferBytes += sec.transferBytes;
          uncompressedBytes = uncompressedBytes == null || sec.uncompressedBytes == null
            ? null
            : uncompressedBytes + sec.uncompressedBytes;
          if (encoding && sec.encoding && encoding !== sec.encoding) encoding = `${encoding}+${sec.encoding}`;
        } else if (sec.transferBytes != null) {
          notes.push(
            `This entry point additionally loads ${secUrl} (${v.secondaryLabel ?? 'secondary payload'}) ` +
              `at ${cell(sec.transferBytes)} transfer / ${cell(sec.uncompressedBytes)} uncompressed, ` +
              `for a real total of ${cell(m.transferBytes + sec.transferBytes)} transfer.`,
          );
        } else {
          notes.push(`Additionally loads ${secUrl}, which could not be measured (${sec.error}).`);
        }
      }
    }

    if (m.error) notes.push(`Unmeasured: ${m.error}. No size is reported for this vendor.`);
    if (m.mismatch) notes.push(m.mismatch);

    rows.push({
      vendor: v.vendor,
      url: v.url,
      status: m.status,
      transferBytes,
      uncompressedBytes,
      encoding,
      note: notes.join(' ') || null,
    });

    process.stderr.write(
      transferBytes == null ? `unmeasured (${m.error})\n` : `${cell(transferBytes)}\n`,
    );
  }

  // Ascending by transfer size; anything unmeasured sorts last.
  rows.sort((a, b) => {
    if (a.transferBytes == null && b.transferBytes == null) return a.vendor.localeCompare(b.vendor);
    if (a.transferBytes == null) return 1;
    if (b.transferBytes == null) return -1;
    return a.transferBytes - b.transferBytes;
  });

  const data = {
    measuredAt: new Date().toISOString(),
    method:
      `Each vendor's documented embed script was requested once over HTTPS with ` +
      `\`Accept-Encoding: ${ACCEPT_ENCODING}\`, following redirects. Transfer bytes are the ` +
      `undecoded response body as served (measured with a raw node:https request, since ` +
      `fetch() silently decompresses); uncompressed bytes are that body inflated locally with ` +
      `node:zlib, cross-checked against a second fetch() of the same URL. Sizes exclude HTTP ` +
      `headers and any payload loaded lazily at runtime unless a note says otherwise. Vendors ` +
      `that could not be measured are reported as unmeasured, never estimated.`,
    rows,
  };

  fs.writeFileSync(OUT, JSON.stringify(data, null, 2) + '\n');
  process.stderr.write(`\nwrote ${OUT}\n`);

  if (process.argv.includes('--print')) console.log('\n' + markdown(data));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
