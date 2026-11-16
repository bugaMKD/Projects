import type { HistoricalData } from '../models/HistoricalData';
import type { TeamMember } from '../models/TeamMember';
import { calculateSprintForecastScenarios } from './forecastScenarios';
import { generateCumulativeForecast } from './cumulativeForecast';

/** Recharts-compatible structure used by the existing burn-up component. */
export interface ReleaseChartPoint {
  sprint: string;
  sprintNumber: number;
  scope: number;
  optimistic: number | null;
  realistic: number | null;
  pessimistic: number | null;
  actual: number | null;
}

export interface ReleaseChartDataInput {
  /** Original scope and capacities must be kept fixed during the release. */
  originalScopeStoryPoints: number;
  historical: HistoricalData;
  originalSprintMembers: TeamMember[];
  /** Planning assumption, not a confidence interval; default ±15%. */
  variationPercent?: number;
  /** Each entry is NEW story points completed in one finished sprint. */
  completedSprintPoints: readonly number[];
}

export interface ReleaseChartDataset {
  chartData: ReleaseChartPoint[];
  completed: number;
  remaining: number;
  originalAtCurrentSprint: {
    optimistic: number | null;
    realistic: number | null;
    pessimistic: number | null;
  };
  forecastFinishes: {
    optimistic: number | null;
    realistic: number | null;
    pessimistic: number | null;
  };
  forecastStatus: 'forecastable' | 'not-forecastable';
  /** Realistically expected throughput and both variants (SP/sprint). */
  scenarioThroughputs: {
    optimistic: number;
    realistic: number;
    pessimistic: number;
  };
}

/**
 * Step 3.4.1: compose the EXISTING verified forecasting services and actuals.
 * This module does not modify the original baseline, UI, or actuals.
 *
 * Forecast horizon = max(last predicted completion sprint, last actual sprint).
 * When actuals extend beyond the original forecast, the original lines remain
 * flat at scope. Actuals stop at the final finished sprint, with null afterward.
 */
export function buildReleaseChartDataset(input: ReleaseChartDataInput): ReleaseChartDataset {
  for (const points of input.completedSprintPoints) {
    if (!Number.isFinite(points) || points < 0) {
      throw new Error('Completed sprint story points must be finite and non-negative.');
    }
  }

  const scenarios = calculateSprintForecastScenarios(
    input.historical,
    input.originalSprintMembers,
    input.variationPercent ?? 15,
  );
  const forecast = generateCumulativeForecast(input.originalScopeStoryPoints, scenarios);
  const actualLastSprint = input.completedSprintPoints.length;
  const lastForecastSprint = forecast.points[forecast.points.length - 1].sprintNumber;
  const horizon = Math.max(lastForecastSprint, actualLastSprint);

  const actualCumulative: number[] = [0];
  for (const points of input.completedSprintPoints) {
    actualCumulative.push(actualCumulative[actualCumulative.length - 1] + points);
  }
  const completed = actualCumulative[actualLastSprint];
  const chartData: ReleaseChartPoint[] = Array.from({ length: horizon + 1 }, (_, sprintNumber) => {
    const originalPoint = forecast.points[sprintNumber];
    // A normal forecast ends when all lines hit scope. Past that point,
    // original forecasts remain flat, even when more actuals are recorded.
    const fullyForecastable = forecast.status === 'forecastable';
    const fallback = fullyForecastable ? input.originalScopeStoryPoints : null;
    return {
      sprintNumber,
      sprint: sprintNumber === 0 ? 'Start' : `S${sprintNumber}`,
      scope: input.originalScopeStoryPoints,
      optimistic: originalPoint?.optimistic ?? fallback,
      realistic: originalPoint?.realistic ?? fallback,
      pessimistic: originalPoint?.pessimistic ?? fallback,
      actual: sprintNumber <= actualLastSprint ? actualCumulative[sprintNumber] : null,
    };
  });

  const current = chartData[actualLastSprint];
  return {
    chartData,
    completed,
    remaining: Math.max(0, input.originalScopeStoryPoints - completed),
    originalAtCurrentSprint: {
      optimistic: current.optimistic,
      realistic: current.realistic,
      pessimistic: current.pessimistic,
    },
    forecastFinishes: forecast.completionSprints,
    forecastStatus: forecast.status,
    scenarioThroughputs: {
      optimistic: scenarios.optimisticStoryPointsPerSprint,
      realistic: scenarios.realisticStoryPointsPerSprint,
      pessimistic: scenarios.pessimisticStoryPointsPerSprint,
    },
  };
}
