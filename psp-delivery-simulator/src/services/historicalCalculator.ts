import type { HistoricalData, HistoricalProductivity } from '../models/HistoricalData';

/** Calibrate both roles against the same historically *delivered* story points. */
export function calculateHistoricalProductivity(historical: HistoricalData): HistoricalProductivity {
  if (!Number.isFinite(historical.deliveredStoryPoints) || historical.deliveredStoryPoints <= 0) {
    throw new Error('Historical delivered story points must be positive.');
  }
  if (!Number.isFinite(historical.seEffectiveDays) || historical.seEffectiveDays <= 0 ||
      !Number.isFinite(historical.qaEffectiveDays) || historical.qaEffectiveDays <= 0) {
    throw new Error('Historical SE and QA effective days must both be positive.');
  }
  return {
    seStoryPointsPerEffectiveDay: historical.deliveredStoryPoints / historical.seEffectiveDays,
    qaStoryPointsPerEffectiveDay: historical.deliveredStoryPoints / historical.qaEffectiveDays,
    historicalSeToQaEffectiveDayRatio: historical.seEffectiveDays / historical.qaEffectiveDays,
  };
}
