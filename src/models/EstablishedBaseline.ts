import type { DraftBaselineConfig } from './DraftBaselineConfig';
import type { HistoricalData } from './HistoricalData';
import type { TeamMember } from './TeamMember';
import type { ReleaseChartDataset } from '../services/releaseChartData';

/** A baseline is a frozen planning snapshot, never a live reference to draft state. */
export interface EstablishedBaseline {
  readonly release: Readonly<DraftBaselineConfig>;
  readonly historical: Readonly<HistoricalData>;
  readonly sprintMembers: readonly Readonly<TeamMember>[];
  readonly forecast: Readonly<Pick<ReleaseChartDataset, 'forecastStatus' | 'forecastFinishes' | 'scenarioThroughputs'>> & {
    readonly points: readonly Readonly<Pick<ReleaseChartDataset['chartData'][number], 'sprint' | 'sprintNumber' | 'scope' | 'optimistic' | 'realistic' | 'pessimistic'>>[];
  };
}

/** Snapshot only forecast results: actual delivery is NOT part of a fixed baseline. */
export function establishBaseline(
  release: DraftBaselineConfig,
  historical: HistoricalData,
  sprintMembers: readonly TeamMember[],
  dataset: ReleaseChartDataset,
): EstablishedBaseline {
  if (dataset.chartData[0]?.sprintNumber !== 0) throw new Error('Cannot establish an empty baseline.');
  if (dataset.chartData[0].scope !== release.scopeStoryPoints) throw new Error('Baseline scope does not match forecast.');
  const forecastPoints = dataset.chartData.map(point => Object.freeze({
    sprint: point.sprint,
    sprintNumber: point.sprintNumber,
    scope: point.scope,
    optimistic: point.optimistic,
    realistic: point.realistic,
    pessimistic: point.pessimistic,
  }));
  return Object.freeze({
    release: Object.freeze({ ...release }),
    historical: Object.freeze({ ...historical }),
    sprintMembers: Object.freeze(sprintMembers.map(member => Object.freeze({ ...member }))),
    forecast: Object.freeze({
      forecastStatus: dataset.forecastStatus,
      forecastFinishes: Object.freeze({ ...dataset.forecastFinishes }),
      scenarioThroughputs: Object.freeze({ ...dataset.scenarioThroughputs }),
      points: Object.freeze(forecastPoints),
    }),
  });
}
