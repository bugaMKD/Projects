import type { HistoricalData } from '../models/HistoricalData';
import type { TeamMember } from '../models/TeamMember';
import { calculateHistoricalProductivity } from './historicalCalculator.ts';
import { calculateTeamCapacity } from './capacityCalculator.ts';

/**
 * Iteration 3.1 output: SUSTAINABLE POTENTIAL throughput for ONE sprint.
 * This is a rate, not a commitment to specific stories or a release completion prediction.
 */
export interface RealisticSprintForecast {
  seEffectiveDays: number;
  qaEffectiveDays: number;
  historicalSeStoryPointsPerEffectiveDay: number;
  historicalQaStoryPointsPerEffectiveDay: number;
  seCodingCapacityStoryPoints: number;
  qaTestingCapacityStoryPoints: number;
  realisticStoryPointsPerSprint: number;
  constrainedBy: 'SE' | 'QA' | 'SE and QA';
}

/**
 * Converts validated historical productivity + the effective days available
 * for ONE future sprint into a realistic delivery-throughput estimate.
 *
 * IMPORTANT:
 * - HistoricalData is aggregated across the entire historical release. No
 *   historical sprint count or historical sprint length is needed.
 * - Members must describe capacity for ONE upcoming sprint, not the whole
 *   future release. Its person-days are already expressed in that unit.
 * - Role throughput = effective days * historical SP / effective role-day.
 * - Realistic throughput = MIN(SE potential, QA potential).
 * - No scope cap here: scope is handled when we build cumulative lines in 3.3.
 * - No optimistic/pessimistic factors, burn-up changes or capacity buckets yet.
 */
export function calculateRealisticSprintForecast(
  historical: HistoricalData,
  sprintMembers: TeamMember[],
): RealisticSprintForecast {
  const productivity = calculateHistoricalProductivity(historical);
  const team = calculateTeamCapacity(sprintMembers);

  const seCodingCapacityStoryPoints =
    team.seEffectiveDays * productivity.seStoryPointsPerEffectiveDay;
  const qaTestingCapacityStoryPoints =
    team.qaEffectiveDays * productivity.qaStoryPointsPerEffectiveDay;

  const realisticStoryPointsPerSprint = Math.min(
    seCodingCapacityStoryPoints,
    qaTestingCapacityStoryPoints,
  );

  const constrainedBy: RealisticSprintForecast['constrainedBy'] =
    Math.abs(seCodingCapacityStoryPoints - qaTestingCapacityStoryPoints) < 1e-9
      ? 'SE and QA'
      : seCodingCapacityStoryPoints < qaTestingCapacityStoryPoints
        ? 'SE'
        : 'QA';

  return {
    seEffectiveDays: team.seEffectiveDays,
    qaEffectiveDays: team.qaEffectiveDays,
    historicalSeStoryPointsPerEffectiveDay: productivity.seStoryPointsPerEffectiveDay,
    historicalQaStoryPointsPerEffectiveDay: productivity.qaStoryPointsPerEffectiveDay,
    seCodingCapacityStoryPoints,
    qaTestingCapacityStoryPoints,
    realisticStoryPointsPerSprint,
    constrainedBy,
  };
}
