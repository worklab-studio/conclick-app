/* eslint-disable no-console */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import https from 'https';
import zlib from 'zlib';
import tar from 'tar';

if (process.env.VERCEL && !process.env.BUILD_GEO) {
  console.log('Vercel environment detected. Skipping geo setup.');
  process.exit(0);
}

const dest = path.resolve(process.cwd(), 'geo');
if (!fs.existsSync(dest)) {
  fs.mkdirSync(dest);
}

function urlFor(db, custom) {
  if (custom) return custom;
  if (process.env.MAXMIND_LICENSE_KEY) {
    return (
      `https://download.maxmind.com/app/geoip_download` +
      `?edition_id=${db}&license_key=${process.env.MAXMIND_LICENSE_KEY}&suffix=tar.gz`
    );
  }
  // Public redistribution (no license needed) — hosts City, Country AND ASN.
  return `https://raw.githubusercontent.com/GitSquared/node-geolite2-redist/master/redist/${db}.tar.gz`;
}

const downloadCompressed = url =>
  new Promise((resolve, reject) => {
    https
      .get(url, res => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          downloadCompressed(res.headers.location).then(resolve).catch(reject);
          return;
        }
        resolve(res.pipe(zlib.createGunzip({})).pipe(tar.t()));
      })
      .on('error', reject);
  });

const downloadDirect = (url, originalUrl) =>
  new Promise((resolve, reject) => {
    https
      .get(url, res => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          downloadDirect(res.headers.location, originalUrl || url).then(resolve).catch(reject);
          return;
        }
        const filename = path.join(dest, path.basename(originalUrl || url));
        const fileStream = fs.createWriteStream(filename);
        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          console.log('Saved geo database:', filename);
          resolve();
        });
        fileStream.on('error', reject);
      })
      .on('error', reject);
  });

async function fetchDb(db, custom) {
  const url = urlFor(db, custom);
  if (url.endsWith('.mmdb')) {
    await downloadDirect(url);
    return;
  }
  const res = await downloadCompressed(url);
  await new Promise((resolve, reject) => {
    res.on('entry', entry => {
      if (entry.path.endsWith('.mmdb')) {
        const filename = path.join(dest, path.basename(entry.path));
        entry.pipe(fs.createWriteStream(filename));
        console.log('Saved geo database:', filename);
      }
    });
    res.on('error', reject);
    res.on('finish', resolve);
  });
}

async function main() {
  // City powers geolocation (GEO_DATABASE_URL override applies here). ASN powers
  // datacenter/hosting detection for bot filtering (see src/lib/detect.ts).
  await fetchDb('GeoLite2-City', process.env.GEO_DATABASE_URL);
  await fetchDb('GeoLite2-ASN');
  console.log('Geo databases ready.');
}

main().catch(e => {
  console.error('Failed to download geo database:', e);
  process.exit(1);
});
