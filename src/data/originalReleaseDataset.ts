import { historicalMock, mockRelease } from '../mockData';
import type { TeamMember } from '../models/TeamMember';
import { buildReleaseChartDataset } from '../services/releaseChartData';

/**
 * Fixed original baseline used to preview the integrated forecast in Step 3.4.1.
 * DO NOT reuse `currentTeamMock` from Iteration 2: its days represent a
 * whole example release, not the effective days available PER SPRINT.
 * These mock input days are PER SPRINT; no per-member sprint forms yet.
 */
const originalSprintMembers: TeamMember[] = [
  { id: 'baseline-se', name: 'SE capacity', role: 'SE', availableDays: 10, productivity: 1 },
  { id: 'baseline-qa', name: 'QA capacity', role: 'QA', availableDays: 5, productivity: 1 },
];

/** Ready for Step 3.4.2 to import without changing any Recharts line keys. */
export function getIntegratedMockData() {
  return buildReleaseChartDataset({
    originalScopeStoryPoints: mockRelease.scopeStoryPoints,
    historical: historicalMock,
    originalSprintMembers,
    variationPercent: 15,
    completedSprintPoints: mockRelease.sprintCompletedPoints,
  });
}
