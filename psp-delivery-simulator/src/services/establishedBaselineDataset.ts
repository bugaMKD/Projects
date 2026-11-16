import type { EstablishedBaseline } from '../models/EstablishedBaseline';
import type { ReleaseChartDataset, ReleaseChartPoint } from './releaseChartData';

/**
 * Merge *new* actuals onto an established baseline without ever recalculating
 * the BL scenario lines. Supports actual sprints beyond pessimistic completion.
 */
export function buildEstablishedBaselineDataset(
  baseline: EstablishedBaseline,
  completedSprintPoints: readonly number[],
): ReleaseChartDataset {
  if (completedSprintPoints.some(n => !Number.isFinite(n) || n < 0)) {
    throw new Error('Completed sprint story points must be finite and non-negative.');
  }
  const scope = baseline.release.scopeStoryPoints;
  const actual: number[] = [0];
  for (const points of completedSprintPoints) actual.push(actual[actual.length - 1] + points);
  const horizon = Math.max(completedSprintPoints.length, baseline.forecast.points.length - 1);
  const chartData: ReleaseChartPoint[] = Array.from({ length: horizon + 1 }, (_, sprintNumber) => {
    const saved = baseline.forecast.points[sprintNumber];
    // Only forecastable baseline lines can safely be extended at scope.
    const flat = baseline.forecast.forecastStatus === 'forecastable' ? scope : null;
    return {
      sprintNumber,
      sprint: sprintNumber === 0 ? 'Start' : `S${sprintNumber}`,
      scope,
      optimistic: saved?.optimistic ?? flat,
      realistic: saved?.realistic ?? flat,
      pessimistic: saved?.pessimistic ?? flat,
      actual: sprintNumber < actual.length ? actual[sprintNumber] : null,
    };
  });
  const current = chartData[completedSprintPoints.length];
  const completed = actual[actual.length - 1];
  return {
    chartData,
    completed,
    remaining: Math.max(0, scope - completed),
    originalAtCurrentSprint: {
      optimistic: current.optimistic,
      realistic: current.realistic,
      pessimistic: current.pessimistic,
    },
    forecastFinishes: { ...baseline.forecast.forecastFinishes },
    scenarioThroughputs: { ...baseline.forecast.scenarioThroughputs },
    forecastStatus: baseline.forecast.forecastStatus,
  };
}
