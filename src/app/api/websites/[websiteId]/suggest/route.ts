import { parseRequest } from '@/lib/request';
import { json, unauthorized } from '@/lib/response';
import { canViewWebsite } from '@/permissions';
import { getWebsite } from '@/queries/prisma';
import { getValues } from '@/queries/sql';
import { cleanValues } from '@/lib/event-noise';
import { analyzeSite } from '@/lib/site-analyzer';
import { scoreConversionEvent, buildAutoSteps } from '@/lib/auto-funnel';

// Normalize a label for fuzzy matching between SCRAPED proposals (cheerio text) and
// CAPTURED names (tracker innerText): lowercase, NFKC, strip all non-alphanumerics of
// any script. Kills the glyph/whitespace/truncation drift that made exact matching
// silently filter out real CTAs like "Clicked: Get Started▶".
const norm = (s: any) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}]+/gu, '');

const CONV_PATH_RX =
  /(signup|sign-up|register|checkout|thank|success|order|subscribe|get-started|trial|demo|contact|quote)/i;
const ASSET_RX = /\.(png|jpe?g|gif|svg|webp|css|js|ico|woff2?|map|json|txt|xml|pdf)$/i;

type VC = { value: string; count: number };

// Reads the website's homepage and proposes goals + funnels from its real CTAs/links/
// forms — then validates and CANONICALIZES them against what the site actually fires
// (normalized match), AND, because a scrape can miss client-rendered CTAs entirely,
// proposes goals/funnels directly from the captured traffic. Never a dead end when
// real conversion activity exists.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const { auth, error } = await parseRequest(request);
  if (error) return error();

  const { websiteId } = await params;
  if (!(await canViewWebsite(auth, websiteId))) return unauthorized();

  const website = await getWebsite(websiteId);
  if (!website?.domain) {
    return json({
      goals: [],
      funnels: [],
      meta: {
        url: '',
        links: 0,
        buttons: 0,
        forms: 0,
        note: 'Set a domain for this website first.',
      },
    });
  }

  const result = await analyzeSite(website.domain);

  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    const filters = { startDate, endDate, limit: 500 } as any;
    const [eventVals, pathVals] = await Promise.all([
      getValues(websiteId, 'event_name', filters).catch(() => []),
      getValues(websiteId, 'url_path', filters).catch(() => []),
    ]);
    // Same hygiene as the pickers: internal events out, hash/slash path
    // variants merged — suggestions must draw from the same clean universe.
    const events: VC[] = cleanValues(
      'event',
      (eventVals as any[])
        .filter(v => v && v.value)
        .map(v => ({ value: String(v.value), count: Number(v.count) || 0 })),
    );
    const paths: VC[] = cleanValues(
      'path',
      (pathVals as any[])
        .filter(v => v && v.value)
        .map(v => ({ value: String(v.value), count: Number(v.count) || 0 })),
    );

    if (events.length || paths.length) {
      const evMap = new Map<string, VC>();
      for (const e of events) {
        const k = norm(e.value);
        if (!k) continue;
        const prev = evMap.get(k);
        if (!prev || e.count > prev.count) evMap.set(k, e);
      }
      const pathMap = new Map<string, VC>();
      for (const p of paths) {
        const k = p.value === '/' ? '/' : norm(p.value.replace(/\/+$/, ''));
        if (!k) continue;
        const prev = pathMap.get(k);
        if (!prev || p.count > prev.count) pathMap.set(k, p);
      }

      const matchEvent = (val: string): VC | undefined => {
        const k = norm(val);
        if (!k) return undefined;
        if (evMap.has(k)) return evMap.get(k);
        const min = norm('clicked').length + 4; // guard: don't let "clicked" swallow all
        let best: VC | undefined;
        for (const [ek, ev] of evMap) {
          if (ek.length < min || k.length < min) continue;
          if ((ek.startsWith(k) || k.startsWith(ek)) && (!best || ev.count > best.count)) best = ev;
        }
        return best;
      };
      const matchPath = (val: string): VC | undefined => {
        if (val === '/') return pathMap.get('/');
        const k = norm(val.replace(/\/+$/, ''));
        return k ? pathMap.get(k) : undefined;
      };
      const matchStep = (s: any): VC | undefined =>
        s.type === 'event' ? matchEvent(s.value) : matchPath(s.value);

      // 1) Validate + canonicalize scrape proposals to the real captured value.
      const scrapeGoals = (result.goals || [])
        .map((g: any) => {
          const m = g.type === 'event' ? matchEvent(g.value) : matchPath(g.value);
          return m ? { ...g, value: m.value, count: m.count, source: 'site' } : null;
        })
        .filter(Boolean) as any[];

      const scrapeFunnels = (result.funnels || [])
        .map((f: any) => {
          const matched = f.steps.map(matchStep);
          if (matched.some((m: any) => !m)) return null;
          return {
            ...f,
            steps: f.steps.map((s: any, i: number) => ({ ...s, value: matched[i].value })),
            count: Math.min(...matched.map((m: any) => m.count)),
            source: 'site',
          };
        })
        .filter(Boolean) as any[];

      // 2) Propose directly from captured traffic (covers client-rendered sites the
      //    scraper can't read, and post-conversion pages not linked from home).
      const used = new Set(scrapeGoals.map(g => g.type + ':' + norm(g.value)));
      const maxEv = Math.max(1, ...events.map(e => e.count));

      const derivedEvents = events
        .filter(e => /^(Clicked|Submitted):\s/.test(e.value))
        .map(e => ({ ...e, score: scoreConversionEvent(e.value, e.count, maxEv) }))
        .filter(e => e.score > 0 && !used.has('event:' + norm(e.value)))
        .sort((a, b) => b.score - a.score || b.count - a.count)
        .slice(0, 5)
        .map(e => ({
          name: e.value,
          type: 'event',
          value: e.value,
          count: e.count,
          source: 'data',
        }));

      const derivedPaths = paths
        .filter(
          p =>
            p.value !== '/' &&
            !ASSET_RX.test(p.value) &&
            CONV_PATH_RX.test(p.value) &&
            !used.has('path:' + norm(p.value)),
        )
        .slice(0, 3)
        .map(p => ({
          name: `Reached ${p.value}`,
          type: 'path',
          value: p.value,
          count: p.count,
          source: 'data',
        }));

      const goals = [...scrapeGoals, ...derivedEvents, ...derivedPaths]
        .filter(
          (g, i, arr) =>
            arr.findIndex(x => x.type === g.type && norm(x.value) === norm(g.value)) === i,
        )
        .slice(0, 8);

      // Funnels: scrape survivors, else a data-derived one from the captured journey.
      let funnels = scrapeFunnels;
      if (!funnels.length) {
        const { steps } = buildAutoSteps(paths, events);
        if (steps.length >= 2) {
          funnels = [
            {
              name: steps
                .map(s => s.value)
                .join(' → ')
                .slice(0, 60),
              window: 60,
              steps,
              count: Math.min(...steps.map(s => matchStep(s)?.count ?? 0)),
              source: 'data',
            },
          ];
        }
      }

      const note = goals.length || funnels.length ? undefined : result.meta?.note;
      return json({ ...result, goals, funnels, validated: true, meta: { ...result.meta, note } });
    }
  } catch {
    // Cross-check is best-effort — fall through to the raw proposals.
  }

  return json(result);
}
