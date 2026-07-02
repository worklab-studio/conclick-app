import { SiteSnapshot, PeakMoment } from './snapshot';

// "Peak moments" — computed on the fly from the snapshot, no baseline table.
// Two kinds:
//   traffic  — today's visitors vs the trailing-7d daily average
//   channel  — a specific referrer (Product Hunt / Google / X …) vs its own
//              trailing-7d daily average, or brand-new and already meaningful
//
// Floors keep tiny sites from screaming "10× SPIKE!" off 3 visitors.

const TRAFFIC_FLOOR = 30; // today visitors must clear this
const CHANNEL_FLOOR = 15; // today hits from a single source must clear this
const MULTIPLE = 2; // ≥2× the baseline to count

const round1 = (x: number) => Math.round(x * 10) / 10;

export function detectSpikes(site: SiteSnapshot): PeakMoment[] {
  const out: PeakMoment[] = [];

  // General traffic surge.
  const base = site.prev7dAvgVisitors;
  if (site.visitors >= TRAFFIC_FLOOR && base > 0 && site.visitors / base >= MULTIPLE) {
    out.push({
      kind: 'traffic',
      label: 'Overall traffic',
      today: site.visitors,
      multiple: round1(site.visitors / base),
    });
  }

  // Per-channel / referrer surges.
  for (const ref of site.topReferrers) {
    if (ref.label === 'Direct') continue;
    const baseline = site.referrerBaselinePerDay[ref.domain] ?? 0;
    if (ref.hits < CHANNEL_FLOOR) continue;

    if (baseline <= 0.5) {
      // Effectively a new source that already cleared the floor — exciting.
      out.push({ kind: 'channel', label: ref.label, today: ref.hits, multiple: ref.hits, isNew: true });
    } else if (ref.hits / baseline >= MULTIPLE) {
      out.push({
        kind: 'channel',
        label: ref.label,
        today: ref.hits,
        multiple: round1(ref.hits / baseline),
      });
    }
  }

  // Loudest first; cap to 3 so the email/message stays punchy.
  return out.sort((a, b) => b.multiple - a.multiple).slice(0, 3);
}
