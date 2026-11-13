import { historicalMock, mockRelease } from '../mockData';
import type { TeamMember } from '../models/TeamMember';
import { createDraftBaselineConfig } from '../models/DraftBaselineConfig';
import type { DraftBaselineConfig } from '../models/DraftBaselineConfig';
import { buildDraftBaselineDataset } from '../services/draftBaselineDataset';

/**
 * The default draft comes from the existing release. Actuals remain separate.
 * React state will supply edited draft values in 4.1.3; no UI changes here.
 */
export function getInitialDraftBaselineConfig(): DraftBaselineConfig {
  return createDraftBaselineConfig(mockRelease);
}

/**
 * Static capacity per sprint. The Iteration 2 currentTeamMock represents
 * release-level capacity and must not replace this sprint-level example.
 */
const originalSprintMembers: TeamMember[] = [
  { id: 'baseline-se', name: 'SE capacity', role: 'SE', availableDays: 10, productivity: 1 },
  { id: 'baseline-qa', name: 'QA capacity', role: 'QA', availableDays: 5, productivity: 1 },
];

/**
 * Backwards compatible: existing App.tsx can still call without arguments.
 * Supplying a valid draft changes only forecast inputs, not mock actuals.
 */
export function getIntegratedMockData(draft: DraftBaselineConfig = getInitialDraftBaselineConfig()) {
  return buildDraftBaselineDataset(
    draft,
    historicalMock,
    originalSprintMembers,
    mockRelease.sprintCompletedPoints,
  );
}
