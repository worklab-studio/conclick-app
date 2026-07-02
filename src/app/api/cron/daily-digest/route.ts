import { timingSafeEqual } from 'node:crypto';
import { json, unauthorized } from '@/lib/response';
import prisma from '@/lib/prisma';
import { buildSnapshot, DigestSnapshot, MilestoneHit } from '@/lib/digest/snapshot';
import { detectSpikes } from '@/lib/digest/spikes';
import { recordMilestones, markMilestonesNotified } from '@/lib/digest/milestones';
import { generateNarrative, Narrative } from '@/lib/digest/narrative';
import { makeFixture } from '@/lib/digest/fixtures';
import { unsubUrl } from '@/lib/digest/unsub';
import { renderHypeDigest, sendHypeDailyDigest } from '@/lib/email';
import { hypeDigestMessage, sendHypeDigestToChannels } from '@/lib/notify';

// CRON_SECRET-gated; trigger daily from an external scheduler:
//   GET /api/cron/daily-digest?key=$CRON_SECRET
//
// Dry-run / preview (same key, writes nothing, sends nothing unless &send=1):
//   ?preview=1                       → first eligible user, real numbers
//   ?preview=1&userId=<id>           → a specific user, real numbers
//   ?preview=1&fixture=spike|milestone|slowday → synthetic snapshot
//   ?preview=1&send=1&to=<email>     → render + a single real email (no DB writes)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isAuthorized(provided: string | null): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// Yesterday in UTC, [start, end).
function yesterdayUtc() {
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  return { start, end };
}

const USER_SELECT = {
  id: true,
  email: true,
  websites: {
    where: { deletedAt: null },
    select: { id: true, name: true, domain: true, createdAt: true },
  },
} as const;

// Build the full snapshot + narrative for one user. dryRun avoids writing the
// milestone ledger (preview). Returns null when the user has no live sites.
async function buildForUser(
  user: { id: string; email: string | null; websites: { id: string; name: string; domain: string | null; createdAt: Date | null }[] },
  window: { start: Date; end: Date },
  dryRun: boolean,
): Promise<{ snapshot: DigestSnapshot; narrative: Narrative } | null> {
  if (!user.email) return null;
  const snapshot = await buildSnapshot({ id: user.id, email: user.email }, user.websites, window);
  if (!snapshot.sites.length) return null;

  for (const site of snapshot.sites) {
    site.spikes = detectSpikes(site);
    site.milestones = await recordMilestones(site, { dryRun });
  }
  const narrative = await generateNarrative(snapshot);
  return { snapshot, narrative };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams;
  if (!isAuthorized(params.get('key'))) return unauthorized();

  const window = yesterdayUtc();

  if (params.get('preview') === '1' || params.get('fixture')) {
    return preview(params, window);
  }

  return runDigest(window);
}

async function runDigest(window: { start: Date; end: Date }) {
  const users = await prisma.client.user.findMany({
    where: {
      deletedAt: null,
      dailyDigestEnabled: true,
      email: { not: null },
      websites: { some: { deletedAt: null } },
    },
    select: USER_SELECT,
  });

  let emailsSent = 0;
  let channelsSent = 0;
  let milestonesFired = 0;
  let spikesDetected = 0;

  for (const user of users) {
    let built: Awaited<ReturnType<typeof buildForUser>> = null;
    try {
      built = await buildForUser(user, window, false);
    } catch {
      continue; // never let one user block the batch
    }
    if (!built) continue;

    const { snapshot, narrative } = built;
    const announced: { websiteId: string; hits: MilestoneHit[] }[] = snapshot.sites
      .filter(s => s.milestones.length)
      .map(s => ({ websiteId: s.websiteId, hits: s.milestones }));
    milestonesFired += announced.reduce((a, g) => a + g.hits.length, 0);
    spikesDetected += snapshot.sites.reduce((a, s) => a + s.spikes.length, 0);

    let delivered = false;
    try {
      // Only a truthy result means an email actually went out — a missing
      // RESEND_API_KEY makes sendHypeDailyDigest a silent no-op (returns
      // undefined). Treating that as "delivered" would stamp milestones
      // notified and lose the announcement forever.
      const res = await sendHypeDailyDigest(user.email!, snapshot, narrative, unsubUrl(user.id));
      if (res) {
        emailsSent++;
        delivered = true;
      }
    } catch {
      // skip a failed email; channels may still go out
    }
    try {
      if (await sendHypeDigestToChannels(user.id, snapshot, narrative)) {
        channelsSent++;
        delivered = true;
      }
    } catch {
      // best-effort
    }

    // Stamp milestones notified only after a successful delivery → a total
    // failure leaves notifiedAt=null and they re-announce next run. If a stamp
    // itself fails (DB blip) after the send already went out, retry once so we
    // don't re-announce an already-sent milestone on the next run.
    if (delivered && announced.length) {
      const settled = await Promise.allSettled(
        announced.map(g => markMilestonesNotified(g.websiteId, g.hits)),
      );
      const retries = settled.flatMap((r, i) =>
        r.status === 'rejected' ? [announced[i]] : [],
      );
      if (retries.length) {
        // eslint-disable-next-line no-console
        console.error('digest: milestone stamping failed, retrying', retries.length);
        await Promise.allSettled(retries.map(g => markMilestonesNotified(g.websiteId, g.hits)));
      }
    }
  }

  return json({ ok: true, users: users.length, emailsSent, channelsSent, milestonesFired, spikesDetected });
}

async function preview(params: URLSearchParams, window: { start: Date; end: Date }) {
  const fixture = params.get('fixture');
  let snapshot: DigestSnapshot;
  let narrative: Narrative;

  if (fixture) {
    snapshot = makeFixture(fixture, window.start);
    narrative = await generateNarrative(snapshot);
  } else {
    const userId = params.get('userId');
    const user = await prisma.client.user.findFirst({
      where: {
        deletedAt: null,
        email: { not: null },
        ...(userId ? { id: userId } : { dailyDigestEnabled: true }),
        websites: { some: { deletedAt: null } },
      },
      select: USER_SELECT,
    });
    if (!user) return json({ ok: false, reason: 'no eligible user found' });
    const built = await buildForUser(user, window, true);
    if (!built) return json({ ok: false, reason: 'user has no traffic in the window' });
    snapshot = built.snapshot;
    narrative = built.narrative;
  }

  const unsub = unsubUrl(snapshot.userId || 'preview');
  const rendered = renderHypeDigest(snapshot, narrative, unsub);
  const channelMessage = hypeDigestMessage(snapshot, narrative);

  let sendResult: any;
  if (params.get('send') === '1') {
    const to = params.get('to');
    if (!to) return json({ ok: false, reason: 'send=1 requires &to=<email>' });
    try {
      const r = await sendHypeDailyDigest(to, snapshot, narrative, unsub);
      sendResult = { sent: true, to, id: (r as any)?.data?.id ?? null };
    } catch (e: any) {
      sendResult = { sent: false, error: String(e?.message ?? e) };
    }
  }

  return json({
    ok: true,
    mode: fixture ? `fixture:${fixture}` : 'real',
    narrativeSource: narrative.source,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    channelMessage,
    spikes: snapshot.sites.flatMap(s => s.spikes),
    milestones: snapshot.sites.flatMap(s => s.milestones),
    snapshot,
    ...(sendResult ? { send: sendResult } : {}),
  });
}
