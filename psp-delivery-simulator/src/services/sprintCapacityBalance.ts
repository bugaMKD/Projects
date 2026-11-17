import type { HistoricalData } from '../models/HistoricalData';
import type { SprintResult } from '../models/SprintResult';

export type SprintCapacityBalanceLabel =
  | 'SE limiting'
  | 'QA limiting'
  | 'Balanced'
  | 'No delivery capacity'
  | 'Not available';

export interface SprintCapacityBalance {
  label: SprintCapacityBalanceLabel;
  sePotentialStoryPoints: number | null;
  qaPotentialStoryPoints: number | null;
  description: string;
}

/**
 * Compare the capacity supported by ACTUAL effective SE/QA days using the
 * selected release's historical productivity. This is a capacity indicator,
 * not proof of what constrained actual delivered SP.
 *
 * No persistence changes and no recalculation of the established baseline.
 */
export function calculateSprintCapacityBalance(
  actual: Pick<SprintResult, 'seEffectiveDays' | 'qaEffectiveDays'>,
  historical: Pick<HistoricalData, 'deliveredStoryPoints' | 'seEffectiveDays' | 'qaEffectiveDays'>,
): SprintCapacityBalance {
  const unavailable: SprintCapacityBalance = {
    label: 'Not available',
    sePotentialStoryPoints: null,
    qaPotentialStoryPoints: null,
    description: 'Actual effective days or usable historical productivity are not recorded.',
  };
  const valid = (v: number | null) => v !== null && Number.isFinite(v) && v >= 0;
  if (!valid(actual.seEffectiveDays) || !valid(actual.qaEffectiveDays) ||
      !Number.isFinite(historical.deliveredStoryPoints) || historical.deliveredStoryPoints <= 0 ||
      !Number.isFinite(historical.seEffectiveDays) || historical.seEffectiveDays <= 0 ||
      !Number.isFinite(historical.qaEffectiveDays) || historical.qaEffectiveDays <= 0) return unavailable;

  // The checks above establish that both values are numbers (not null).
  const sePotential = (actual.seEffectiveDays as number) *
    historical.deliveredStoryPoints / historical.seEffectiveDays;
  const qaPotential = (actual.qaEffectiveDays as number) *
    historical.deliveredStoryPoints / historical.qaEffectiveDays;
  if (!Number.isFinite(sePotential) || !Number.isFinite(qaPotential)) return unavailable;

  const description = (which: string) =>
    `${which}. SE potential: ${Number(sePotential.toFixed(2))} SP; QA potential: ${Number(qaPotential.toFixed(2))} SP, based on this release's historical productivity. This is an estimated capacity constraint, not an explanation of delivered SP.`;
  if (sePotential === 0 && qaPotential === 0) return {
    label: 'No delivery capacity', sePotentialStoryPoints: 0, qaPotentialStoryPoints: 0,
    description: description('Both roles recorded zero effective days'),
  };
  // Avoid labeling a constraint based on tiny floating-point differences.
  const tolerance = 1e-9 * Math.max(1, sePotential, qaPotential);
  const label: SprintCapacityBalanceLabel = Math.abs(sePotential - qaPotential) <= tolerance
    ? 'Balanced' : sePotential < qaPotential ? 'SE limiting' : 'QA limiting';
  return { label, sePotentialStoryPoints: sePotential, qaPotentialStoryPoints: qaPotential,
    description: description(label === 'Balanced' ? 'SE and QA capacities are balanced' : label),
  };
}
