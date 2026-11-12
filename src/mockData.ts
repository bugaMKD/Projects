import type { HistoricalData } from './models/HistoricalData';
import type { TeamMember } from './models/TeamMember';

/** Preserved Iteration 1 release visualizations: not connected to Iteration 2 math. */
export const mockRelease = {
  name: 'Release Alpha', scopeStoryPoints: 240, sprintLengthWorkingDays: 10,
  sprintCompletedPoints: [29, 25, 34, 28], forecastSprintCount: 11,
  originalForecast: {
    optimisticStoryPointsPerSprint: 40,
    realisticStoryPointsPerSprint: 32,
    pessimisticStoryPointsPerSprint: 24,
  },
};
export const capacityBuckets = [
  { label: 'Planned delivery', percent: 55, color: '#3676e8', description: 'Release backlog and committed delivery' },
  { label: 'Planned support', percent: 20, color: '#24a59b', description: 'Known support commitments' },
  { label: 'Technical debt', percent: 10, color: '#e3a14c', description: 'Engineering health and improvement' },
  { label: 'Unplanned work', percent: 15, color: '#c66b78', description: 'Project and support interruptions combined' },
];

/** Static mock inputs. Values are deliberately illustrative, NOT extracted from Excel. */
export const historicalMock: HistoricalData = {
  deliveredStoryPoints: 100,
  seEffectiveDays: 100,
  qaEffectiveDays: 50,
};
/** The user's validation scenario: 100 SE effective days / 25 QA effective days. */
export const currentTeamMock: TeamMember[] = [
  { id: 'se-1', name: 'SE 1', role: 'SE', availableDays: 25, productivity: 1 },
  { id: 'se-2', name: 'SE 2', role: 'SE', availableDays: 25, productivity: 1 },
  { id: 'se-3', name: 'SE 3', role: 'SE', availableDays: 25, productivity: 1 },
  { id: 'se-4', name: 'SE 4', role: 'SE', availableDays: 25, productivity: 1 },
  { id: 'qa-1', name: 'QA 1', role: 'QA', availableDays: 25, productivity: 0.6 },
  { id: 'qa-2', name: 'QA 2', role: 'QA', availableDays: 20, productivity: 0.5 },
];
export const capacityExampleScopeStoryPoints = 100;

export function getMockData() {
  const scope = mockRelease.scopeStoryPoints;
  const points = mockRelease.sprintCompletedPoints;
  const completed = points.reduce((sum, v) => sum + v, 0);
  const totalSprints = Math.max(mockRelease.forecastSprintCount, Math.ceil(scope / mockRelease.originalForecast.pessimisticStoryPointsPerSprint));
  const chartData = Array.from({ length: totalSprints + 1 }, (_, sprint) => ({
    sprint: `S${sprint}`, scope,
    optimistic: Math.min(scope, sprint * mockRelease.originalForecast.optimisticStoryPointsPerSprint),
    realistic: Math.min(scope, sprint * mockRelease.originalForecast.realisticStoryPointsPerSprint),
    pessimistic: Math.min(scope, sprint * mockRelease.originalForecast.pessimisticStoryPointsPerSprint),
    actual: sprint <= points.length ? points.slice(0, sprint).reduce((sum, n) => sum + n, 0) : null,
  }));
  return {
    chartData, completed, remaining: Math.max(0, scope - completed),
    originalAtCurrentSprint: {
      optimistic: Math.min(scope, points.length * mockRelease.originalForecast.optimisticStoryPointsPerSprint),
      realistic: Math.min(scope, points.length * mockRelease.originalForecast.realisticStoryPointsPerSprint),
      pessimistic: Math.min(scope, points.length * mockRelease.originalForecast.pessimisticStoryPointsPerSprint),
    },
    forecastFinishes: {
      optimistic: Math.ceil(scope / mockRelease.originalForecast.optimisticStoryPointsPerSprint),
      realistic: Math.ceil(scope / mockRelease.originalForecast.realisticStoryPointsPerSprint),
      pessimistic: Math.ceil(scope / mockRelease.originalForecast.pessimisticStoryPointsPerSprint),
    },
  };
}
