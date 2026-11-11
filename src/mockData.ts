/**
 * MOCK DATA: Change the numbers here to update the entire starter dashboard.
 * These rates are illustrative, NOT calculated from the PSP Excel model.
 */
export type Bucket = {
  label: string;
  percent: number;
  color: string;
  description: string;
};

export const mockRelease = {
  name: 'Release Alpha',
  scopeStoryPoints: 195,
  sprintLengthWorkingDays: 5,
  sprintCompletedPoints: [29, 25, 34, 28],
  // Future sprints plotted to show full original forecast curves.
  forecastSprintCount: 11,
  originalForecast: {
    optimisticStoryPointsPerSprint: 32,
    realisticStoryPointsPerSprint: 27,
    pessimisticStoryPointsPerSprint: 24,
  },
  historical: {
    completedStoryPoints: 130,
    softwareEngineerDays: 65,
    qaEngineerDays: 25,
  },
  capacity: {
    softwareEngineers: 3,
    qaEngineers: 1,
    softwareEngineerDaysPerSprint: 13,
    qaEngineerDaysPerSprint: 5,
  },
};

export const capacityBuckets: Bucket[] = [
  { label: 'Planned delivery', percent: 55, color: '#3676e8', description: 'Release backlog and committed delivery' },
  { label: 'Planned support', percent: 20, color: '#24a59b', description: 'Known support commitments' },
  { label: 'Technical debt', percent: 10, color: '#e3a14c', description: 'Engineering health and improvement' },
  { label: 'Unplanned work', percent: 15, color: '#c66b78', description: 'Interruptions across project and support' },
];

export function getMockData() {
  const scope = mockRelease.scopeStoryPoints;
  const points = mockRelease.sprintCompletedPoints;
  const completed = points.reduce((sum, value) => sum + value, 0);
  const totalSprints = Math.max(mockRelease.forecastSprintCount, Math.ceil(scope / mockRelease.originalForecast.pessimisticStoryPointsPerSprint));
  const chartData = Array.from({ length: totalSprints + 1 }, (_, sprint) => ({
    sprint: `S${sprint}`,
    sprintNumber: sprint,
    scope,
    optimistic: Math.min(scope, sprint * mockRelease.originalForecast.optimisticStoryPointsPerSprint),
    realistic: Math.min(scope, sprint * mockRelease.originalForecast.realisticStoryPointsPerSprint),
    pessimistic: Math.min(scope, sprint * mockRelease.originalForecast.pessimisticStoryPointsPerSprint),
    actual: sprint <= points.length ? points.slice(0, sprint).reduce((sum, n) => sum + n, 0) : null,
  }));
  const originalAtCurrentSprint = {
    optimistic: Math.min(scope, points.length * mockRelease.originalForecast.optimisticStoryPointsPerSprint),
    realistic: Math.min(scope, points.length * mockRelease.originalForecast.realisticStoryPointsPerSprint),
    pessimistic: Math.min(scope, points.length * mockRelease.originalForecast.pessimisticStoryPointsPerSprint),
  };
  const forecastFinishes = {
    optimistic: Math.ceil(scope / mockRelease.originalForecast.optimisticStoryPointsPerSprint),
    realistic: Math.ceil(scope / mockRelease.originalForecast.realisticStoryPointsPerSprint),
    pessimistic: Math.ceil(scope / mockRelease.originalForecast.pessimisticStoryPointsPerSprint),
  };
  return { chartData, completed, remaining: Math.max(0, scope - completed), originalAtCurrentSprint, forecastFinishes };
}
