import type { HistoricalData } from '../models/HistoricalData';
import type { TeamMember } from '../models/TeamMember';
import { calculateRealisticSprintForecast } from './realisticSprintForecast.ts';

/** Original three-scenario throughput forecast for one sprint (not a release curve). */
export interface SprintForecastScenarios {
  /** Percentage change in throughput, e.g. 15 means +/-15%. */
  variationPercent: number;
  optimisticStoryPointsPerSprint: number;
  realisticStoryPointsPerSprint: number;
  pessimisticStoryPointsPerSprint: number;
  /** Preserved from step 3.1 to make bottlenecks explainable. */
  seCodingCapacityStoryPoints: number;
  qaTestingCapacityStoryPoints: number;
  constrainedBy: 'SE' | 'QA' | 'SE and QA';
}

/**
 * Step 3.2: use the validated realistic throughput from 3.1, then create
 * optimistic and pessimistic planning scenarios with a configurable margin.
 *
 * - Historical data covers the entire historical release; no sprint count.
 * - Team members describe effective capacity available for ONE future sprint.
 * - Variation is applied to throughput, not delivery duration.
 * - Calculation uses full floating-point precision; no intermediate rounding.
 * - Does not cap to scope or generate sprint series (deferred to step 3.3).
 * - Does not update the original burn-up, actuals, or capacity buckets.
 * - The margin is a planning assumption, NOT a statistical confidence interval.
 */
export function calculateSprintForecastScenarios(
  historical: HistoricalData,
  sprintMembers: TeamMember[],
  variationPercent = 15,
): SprintForecastScenarios {
  if (!Number.isFinite(variationPercent) || variationPercent < 0 || variationPercent >= 100) {
    throw new Error('Forecast variation must be a finite percentage from 0 (inclusive) to 100 (exclusive).');
  }

  const realistic = calculateRealisticSprintForecast(historical, sprintMembers);
  const margin = variationPercent / 100;
  const throughput = realistic.realisticStoryPointsPerSprint;
  return {
    variationPercent,
    optimisticStoryPointsPerSprint: throughput * (1 + margin),
    realisticStoryPointsPerSprint: throughput,
    pessimisticStoryPointsPerSprint: throughput * (1 - margin),
    seCodingCapacityStoryPoints: realistic.seCodingCapacityStoryPoints,
    qaTestingCapacityStoryPoints: realistic.qaTestingCapacityStoryPoints,
    constrainedBy: realistic.constrainedBy,
  };
}
