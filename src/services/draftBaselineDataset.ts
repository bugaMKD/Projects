import type { DraftBaselineConfig } from '../models/DraftBaselineConfig';
import { validateDraftBaselineConfig } from '../models/DraftBaselineConfig';
import type { HistoricalData } from '../models/HistoricalData';
import type { TeamMember } from '../models/TeamMember';
import { buildReleaseChartDataset } from './releaseChartData';

/**
 * 4.1.2: Pure integration boundary for a DRAFT baseline.
 * Historical results, per-sprint capacity and completed actuals are supplied
 * independently. No baseline is established, saved or mutated here.
 */
export function buildDraftBaselineDataset(
  draft: DraftBaselineConfig,
  historical: HistoricalData,
  sprintMembers: TeamMember[],
  completedSprintPoints: readonly number[],
) {
  const errors = validateDraftBaselineConfig(draft);
  if (Object.keys(errors).length > 0) {
    throw new Error(`Invalid draft baseline configuration: ${Object.values(errors).join(' ')}`);
  }

  return buildReleaseChartDataset({
    originalScopeStoryPoints: draft.scopeStoryPoints,
    variationPercent: draft.variationPercent,
    historical,
    originalSprintMembers: sprintMembers,
    completedSprintPoints,
  });
}
