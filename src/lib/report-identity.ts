// Canonical identity keys for deduplicating saved reports. Goals and funnels are
// "the same" when their parameters mean the same thing — case/whitespace variants
// included — regardless of who created them (builder, smart setup, save-as-funnel).

// Value kept CASE-SENSITIVE (trim only) so app-level identity matches the
// case-sensitive jsonb unique index AND the case-sensitive url_path/event_name
// matching in getGoal/getFunnel — "/Pricing" and "/pricing" are genuinely
// different goals. operator/property are folded in to future-proof sum/avg goals.
export function goalKey(p: any): string {
  return `${String(p?.type ?? '').toLowerCase()}|${String(p?.value ?? '').trim()}|${
    p?.operator ?? ''
  }|${p?.property ?? ''}`;
}

export function funnelKey(p: any): string {
  const steps = (Array.isArray(p?.steps) ? p.steps : [])
    .map((s: any) => `${String(s?.type ?? '')}:${String(s?.value ?? '').trim()}`)
    .join('>');
  return `${Number(p?.window) || 0}|${steps}`;
}

/** Identity key for a report's parameters, or null for types we never dedupe. */
export function reportKey(type: string, parameters: any): string | null {
  if (type === 'goal') return goalKey(parameters);
  if (type === 'funnel') return funnelKey(parameters);
  return null;
}
