import { historicalMock, mockRelease } from '../mockData';
import type { HistoricalData } from '../models/HistoricalData';
import type { TeamMember } from '../models/TeamMember';
import { createDraftBaselineConfig } from '../models/DraftBaselineConfig';
import type { DraftBaselineConfig } from '../models/DraftBaselineConfig';
import { DEFAULT_SPRINT_CAPACITY_MEMBERS } from '../models/DraftSprintCapacityInput';
import { buildDraftBaselineDataset } from '../services/draftBaselineDataset';

/** The default release draft remains independent from sprint actuals. */
export function getInitialDraftBaselineConfig(): DraftBaselineConfig {
  return createDraftBaselineConfig(mockRelease);
}

/**
 * Iteration 4.3.2: per-sprint capacity is now a third, optional input.
 * Defaults preserve the existing 4.1 and 4.2 call signatures and results.
 *
 * In 4.3.3 the UI will parse the member form with
 * parseDraftSprintCapacityForm(), then supply the last valid TeamMember[].
 * Historical effective days are totals from previous work; availableDays
 * below are the planned days available to each role PER FUTURE SPRINT.
 *
 * This only calculates the DRAFT BL. No baseline is frozen until 4.3.4.
 */
export function getIntegratedMockData(
  draft: DraftBaselineConfig = getInitialDraftBaselineConfig(),
  historical: HistoricalData = historicalMock,
  sprintMembers: readonly TeamMember[] = DEFAULT_SPRINT_CAPACITY_MEMBERS,
) {
  return buildDraftBaselineDataset(
    draft,
    historical,
    [...sprintMembers],
    mockRelease.sprintCompletedPoints,
  );
}
