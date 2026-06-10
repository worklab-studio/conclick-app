// Canonical identity keys for deduplicating saved reports. Goals and funnels are
// "the same" when their parameters mean the same thing — case/whitespace variants
// included — regardless of who created them (builder, smart setup, save-as-funnel).

export function goalKey(p: any): string {
  return `${String(p?.type ?? '').toLowerCase()}|${String(p?.value ?? '')
    .trim()
    .toLowerCase()}`;
}

export function funnelKey(p: any): string {
  const steps = (Array.isArray(p?.steps) ? p.steps : [])
    .map(
      (s: any) =>
        `${String(s?.type ?? '')}:${String(s?.value ?? '')
          .trim()
          .toLowerCase()}`,
    )
    .join('>');
  return `${Number(p?.window) || 0}|${steps}`;
}

/** Identity key for a report's parameters, or null for types we never dedupe. */
export function reportKey(type: string, parameters: any): string | null {
  if (type === 'goal') return goalKey(parameters);
  if (type === 'funnel') return funnelKey(parameters);
  return null;
}
