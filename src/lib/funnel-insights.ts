// Shared funnel insight helpers — the SINGLE source of truth used by both the UI
// (FunnelChart / AutoFunnelInline) and the server (daily-digest cron), so the
// "biggest leak" and "revenue lost" numbers always agree.

export interface FunnelStepRow {
  type?: string;
  value: string;
  visitors: number;
  previous?: number;
  dropped?: number;
  dropoff: number; // 0..1
  remaining?: number; // 0..1 (vs first step)
  revenue?: number; // minor units
  revenuePerVisitor?: number; // minor units
  medianMs?: number | null;
}

/** The single biggest drop-off — the step users most fail to reach. index<1 → none. */
export function biggestLeak(rows: FunnelStepRow[]): { index: number; dropoff: number } {
  let index = -1;
  let worst = -1;
  for (let i = 1; i < rows.length; i++) {
    const d = rows[i]?.dropoff || 0;
    if (d > worst) {
      worst = d;
      index = i;
    }
  }
  return { index, dropoff: worst < 0 ? 0 : worst };
}

/**
 * Estimated revenue left on the table at a leak: the visitors who dropped there,
 * valued at what a fully-converted visitor is worth (the deepest revenue-per-visitor
 * in the funnel). Returns minor units; 0 when the funnel carries no revenue.
 */
export function funnelRevenueLost(rows: FunnelStepRow[], leakIndex: number): number {
  if (leakIndex < 1 || !rows[leakIndex]) return 0;
  const dropped = rows[leakIndex].dropped || 0;
  let valuePerVisitor = 0;
  for (const r of rows) {
    const rpv = r.revenuePerVisitor || 0;
    if (rpv > 0) valuePerVisitor = rpv; // deepest step that produced revenue
  }
  return Math.round(dropped * valuePerVisitor);
}
