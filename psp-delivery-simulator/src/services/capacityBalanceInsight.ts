/** Display-only capacity diagnostic. Never feeds the forecast engine. */
export type CapacityBalanceSeverity = 'balanced' | 'moderate' | 'high' | 'unavailable';
export type CapacityBalanceRole = 'SE' | 'QA' | null;

export interface CapacityBalanceInsightInput {
  sePotentialStoryPointsPerSprint: number | null;
  qaPotentialStoryPointsPerSprint: number | null;
  historicalDeliveredStoryPoints: number;
  historicalSeEffectiveDays: number;
  historicalQaEffectiveDays: number;
}

export interface CapacityBalanceInsight {
  label: string;
  limitingRole: CapacityBalanceRole;
  gapPercent: number | null;
  additionalEffectiveDays: number | null;
  severity: CapacityBalanceSeverity;
}

/**
 * Difference is measured against the HIGHER SP throughput (not raw role days).
 * <=5% is presented as balanced, >5%-15% is moderate, >15% is high.
 * In all cases the forecast engine must continue to use the lower throughput.
 */
export function calculateCapacityBalanceInsight(input: CapacityBalanceInsightInput): CapacityBalanceInsight {
  const se = input.sePotentialStoryPointsPerSprint;
  const qa = input.qaPotentialStoryPointsPerSprint;
  const missing = (): CapacityBalanceInsight => ({label:'Not available', limitingRole:null, gapPercent:null, additionalEffectiveDays:null, severity:'unavailable'});
  if (se === null || qa === null || !Number.isFinite(se) || !Number.isFinite(qa) || se < 0 || qa < 0) return missing();
  if (se === 0 && qa === 0) return {label:'No delivery capacity', limitingRole:null, gapPercent:null, additionalEffectiveDays:null, severity:'unavailable'};

  const higher = Math.max(se, qa);
  const lower = Math.min(se, qa);
  const gapPercent = (higher - lower) / higher * 100;
  const limitingRole: CapacityBalanceRole = se < qa ? 'SE' : qa < se ? 'QA' : null;
  const severity: CapacityBalanceSeverity = gapPercent <= 5 + 1e-9 ? 'balanced' : gapPercent <= 15 + 1e-9 ? 'moderate' : 'high';
  const historicalDays = limitingRole === 'SE' ? input.historicalSeEffectiveDays : input.historicalQaEffectiveDays;
  const delivered = input.historicalDeliveredStoryPoints;
  const productivity = historicalDays > 0 && delivered > 0 && Number.isFinite(historicalDays) && Number.isFinite(delivered)
    ? delivered / historicalDays : null;
  const additionalEffectiveDays = limitingRole && productivity !== null && Number.isFinite(productivity) && productivity > 0
    ? (higher - lower) / productivity : limitingRole === null ? 0 : null;
  return {
    label: severity === 'balanced' ? 'Balanced' : `${limitingRole} limiting`,
    limitingRole,
    gapPercent,
    additionalEffectiveDays,
    severity,
  };
}

export function formatCapacityGapPercent(value: number | null): string {
  if (value === null) return 'Gap unavailable';
  return `${Number(value.toFixed(1))}% gap`;
}

export function formatCapacityShortfall(insight: CapacityBalanceInsight): string {
  if (insight.gapPercent === null) return 'Cannot calculate capacity shortfall';
  if (!insight.limitingRole) return 'No effective-day shortfall';
  if (insight.additionalEffectiveDays === null) return 'Effective-day shortfall unavailable';
  return `${Number(insight.additionalEffectiveDays.toFixed(1))} additional effective ${insight.limitingRole} days/sprint`;
}
