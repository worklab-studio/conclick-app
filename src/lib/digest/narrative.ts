import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { formatMinorCurrency } from '@/lib/format';
import { DigestSnapshot, MilestoneHit, PeakMoment } from './snapshot';
import { milestoneLabel } from './milestones';

// The hype copy. Written by Claude Haiku when ANTHROPIC_API_KEY is present, and
// by a templated fallback otherwise (or on any API error / timeout / bad JSON)
// so the digest is ALWAYS sent. Lazy client mirrors the Resend pattern: the
// constructor reads the key at call time, never at module load (build-safe).

export interface Narrative {
  subject: string; // email subject, <50 chars
  emailNarrative: string; // 2-4 sentence hero paragraph
  channelHeadline: string; // <90 char one-liner for Slack/Discord/Telegram
  source: 'llm' | 'fallback';
}

const MODEL = process.env.DIGEST_MODEL || 'claude-haiku-4-5';

let _anthropic: Anthropic | null = null;
function anthropic(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  if (!_anthropic) _anthropic = new Anthropic({ apiKey });
  return _anthropic;
}

// Rotating "angle" so two good days never read the same. Seeded by the date
// label (deterministic per calendar day, no Date dependency).
const ANGLES = [
  'celebrate the momentum like a coach at halftime',
  'frame today as a story with a clear hero metric',
  'open with a surprising number, then explain it',
  'write like a hype friend texting good news',
  'lead with what changed since yesterday',
  'spotlight the channel that overperformed',
  'keep it punchy and confident, fewer words',
  'connect today to the bigger trajectory',
];
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const NarrativeSchema = z.object({
  subject: z.string().min(3).max(90),
  narrative: z.string().min(15).max(900),
  headline: z.string().min(3).max(160),
});

// ---- fact extraction (pre-formatted so the model never does math) ----

function pctStr(p: number | null): string {
  if (p == null) return 'no prior baseline';
  if (p === 0) return 'flat';
  return p > 0 ? `up ${p}%` : `down ${Math.abs(p)}%`;
}

function spikeStr(s: PeakMoment, site: string): string {
  if (s.kind === 'traffic') return `${site}: overall traffic ${s.multiple}× its usual (${s.today} visitors)`;
  if (s.isNew) return `${site}: brand-new traffic from ${s.label} (${s.today} visits today)`;
  return `${site}: ${s.label} sent ${s.multiple}× its usual (${s.today} visits)`;
}

export function collectMilestones(snapshot: DigestSnapshot): { hit: MilestoneHit; ccy: string }[] {
  return snapshot.sites.flatMap(s => s.milestones.map(hit => ({ hit, ccy: s.currency })));
}
export function collectSpikes(snapshot: DigestSnapshot): { s: PeakMoment; site: string }[] {
  return snapshot.sites.flatMap(site => site.spikes.map(s => ({ s, site: site.name })));
}

function buildFacts(snapshot: DigestSnapshot) {
  const t = snapshot.totals;
  const milestones = collectMilestones(snapshot).map(m => milestoneLabel(m.hit, m.ccy) + ` on ${m.hit.siteName}`);
  const spikes = collectSpikes(snapshot).map(x => spikeStr(x.s, x.site));
  const isSlowDay = t.visitors < 5 && milestones.length === 0 && spikes.length === 0;

  return {
    date: snapshot.dateLabel,
    portfolio: {
      visitorsToday: t.visitors,
      pageviewsToday: t.pageviews,
      vsYesterday: pctStr(snapshot.deltas.vsYesterdayPct),
      vsLastWeek: pctStr(snapshot.deltas.vsLastWeekPct),
      vsLastMonth: pctStr(snapshot.deltas.vsLastMonthPct),
      revenueToday: t.revenueMinor > 0 ? formatMinorCurrency(t.revenueMinor, t.currency) : null,
      siteCount: snapshot.sites.length,
    },
    topSites: snapshot.sites
      .slice()
      .sort((a, b) => b.visitors - a.visitors)
      .slice(0, 3)
      .map(s => ({
        name: s.name,
        visitors: s.visitors,
        topSource: s.topReferrers[0]?.label || 'Direct',
      })),
    milestones,
    spikes,
    isSlowDay,
  };
}

const SYSTEM = `You are the voice of Conclick, a web-analytics product. Every day you write a short, energetic note that makes a founder EXCITED to check their numbers — like a hype friend who just read their dashboard.

HARD RULES:
- Use ONLY the numbers and facts in the provided JSON. Never invent, estimate, or do arithmetic. Currency and percentage strings are already formatted — quote them as-is.
- If "isSlowDay" is true, be warm and honest, never fake-celebrate. Acknowledge it's quiet and point to one real signal or a "tomorrow" framing.
- If milestones or spikes exist, LEAD with the biggest one — that's the headline moment.
- Voice: confident, genuine, founder-to-founder. No corporate filler.
- "subject": under 50 characters. No ALL-CAPS words, no "FREE", no "$$$", no exclamation spam. At most ONE emoji.
- "narrative": 2 to 4 sentences. Plain text only (NO markdown, NO bullet points). At most TWO emoji total.
- "headline": one line under 90 characters for a chat message.
- Vary your wording — today's stylistic angle: "{ANGLE}".

Respond with ONLY a JSON object: {"subject": "...", "narrative": "...", "headline": "..."}`;

export async function generateNarrative(snapshot: DigestSnapshot): Promise<Narrative> {
  const facts = buildFacts(snapshot);
  const client = anthropic();
  if (!client) return fallbackNarrative(snapshot);

  const angle = ANGLES[hashStr(snapshot.dateLabel) % ANGLES.length];
  try {
    const resp = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 500,
        temperature: 0.9,
        system: SYSTEM.replace('{ANGLE}', angle),
        messages: [
          { role: 'user', content: JSON.stringify(facts) },
          { role: 'assistant', content: '{' }, // prefill → forces a JSON object
        ],
      },
      { maxRetries: 1, timeout: 12000 },
    );

    const block = resp.content.find(b => b.type === 'text') as { text: string } | undefined;
    const raw = '{' + (block?.text ?? '');
    const parsed = NarrativeSchema.parse(JSON.parse(stripFences(raw)));

    return {
      subject: clampSubject(parsed.subject),
      emailNarrative: parsed.narrative.trim(),
      channelHeadline: parsed.headline.trim().slice(0, 120),
      source: 'llm',
    };
  } catch {
    return fallbackNarrative(snapshot);
  }
}

function stripFences(s: string): string {
  // Defensive: model occasionally wraps in ```json … ``` despite the prefill.
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  return (fenced ? fenced[1] : s).trim();
}

function clampSubject(s: string): string {
  let out = s.trim().replace(/\s+/g, ' ');
  if (out.length > 64) out = out.slice(0, 61).trimEnd() + '…';
  return out;
}

// ---- templated fallback: pure strings, no network, never throws ----

export function fallbackNarrative(snapshot: DigestSnapshot): Narrative {
  const t = snapshot.totals;
  const milestones = collectMilestones(snapshot);
  const spikes = collectSpikes(snapshot);
  const visitors = t.visitors.toLocaleString('en-US');
  const dyd = snapshot.deltas.vsYesterdayPct;

  // Lead line.
  let lead: string;
  if (milestones.length) {
    const top = milestones[0];
    lead = `Milestone unlocked — ${top.hit.siteName} just crossed ${milestoneLabel(top.hit, top.ccy)}. 🎉`;
  } else if (spikes.length) {
    const top = spikes[0];
    const what = top.s.kind === 'traffic' ? 'Traffic' : top.s.label;
    lead = `${what} is having a moment on ${top.site} — ${top.s.multiple}× the usual.`;
  } else if (t.visitors < 5) {
    lead = `A quiet ${snapshot.dateLabel}. Calm days are when you build the next spike.`;
  } else if (dyd != null && dyd > 0) {
    lead = `Nice momentum — ${visitors} visitors today, up ${dyd}% from yesterday.`;
  } else {
    lead = `${visitors} visitors stopped by today. Steady hands win.`;
  }

  // Supporting line.
  const bits: string[] = [];
  if (t.visitors >= 5) bits.push(`${visitors} visitors, ${t.pageviews.toLocaleString('en-US')} pageviews`);
  if (snapshot.deltas.vsLastWeekPct != null) {
    const w = snapshot.deltas.vsLastWeekPct;
    bits.push(w >= 0 ? `${w}% above your weekly average` : `${Math.abs(w)}% below your weekly average`);
  }
  if (t.revenueMinor > 0) bits.push(`${formatMinorCurrency(t.revenueMinor, t.currency)} in revenue`);
  const support = bits.length ? bits.join(' · ') + '.' : 'Your dashboard has the full story.';

  const subject = milestones.length
    ? `🎉 ${milestoneLabel(milestones[0].hit, milestones[0].ccy)} on ${milestones[0].hit.siteName}`
    : spikes.length
      ? `${spikes[0].s.kind === 'traffic' ? 'Traffic' : spikes[0].s.label} is spiking`
      : t.visitors >= 5
        ? `${visitors} visitors yesterday`
        : `Your ${snapshot.dateLabel} recap`;

  const headline = milestones.length
    ? `🏆 ${milestoneLabel(milestones[0].hit, milestones[0].ccy)} reached on ${milestones[0].hit.siteName}`
    : spikes.length
      ? `📈 ${spikes[0].site}: ${spikes[0].s.label} ${spikes[0].s.multiple}× usual`
      : `${visitors} visitors${dyd != null ? `, ${pctStr(dyd)} vs yesterday` : ''}`;

  return {
    subject: clampSubject(subject),
    emailNarrative: `${lead} ${support}`.trim(),
    channelHeadline: headline.slice(0, 120),
    source: 'fallback',
  };
}
