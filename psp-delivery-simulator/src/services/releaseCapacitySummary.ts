import type { HistoricalData } from '../models/HistoricalData';
import type { TeamMember } from '../models/TeamMember';

/** Read-only dashboard projection. Forecasting logic remains owned by existing services. */
export interface RoleCapacitySummary {
  role: 'SE' | 'QA';
  historicalEffectiveDays: number;
  historicalStoryPointsPerEffectiveDay: number | null;
  futureAvailableDaysPerSprint: number;
  futureEffectiveDaysPerSprint: number;
  potentialStoryPointsPerSprint: number | null;
  memberCount: number;
}
export interface ReleaseCapacitySummary {
  historicalDeliveredStoryPoints: number;
  se: RoleCapacitySummary;
  qa: RoleCapacitySummary;
  limitingRole: 'SE' | 'QA' | 'Balanced' | 'No delivery capacity' | 'Unavailable';
  realisticStoryPointsPerSprint: number | null;
}

export function summarizeReleaseCapacity(historical: HistoricalData, members: readonly TeamMember[]): ReleaseCapacitySummary {
  const role = (kind: 'SE' | 'QA', days: number): RoleCapacitySummary => {
    const selected = members.filter(m => m.role === kind);
    const futureAvailableDaysPerSprint = selected.reduce((sum, m) => sum + m.availableDays, 0);
    const futureEffectiveDaysPerSprint = selected.reduce((sum, m) => sum + m.availableDays * m.productivity, 0);
    const historicalStoryPointsPerEffectiveDay = days > 0 ? historical.deliveredStoryPoints / days : null;
    return {
      role: kind,
      historicalEffectiveDays: days,
      historicalStoryPointsPerEffectiveDay,
      futureAvailableDaysPerSprint,
      futureEffectiveDaysPerSprint,
      potentialStoryPointsPerSprint: historicalStoryPointsPerEffectiveDay === null ? null : historicalStoryPointsPerEffectiveDay * futureEffectiveDaysPerSprint,
      memberCount: selected.length,
    };
  };
  const se = role('SE', historical.seEffectiveDays);
  const qa = role('QA', historical.qaEffectiveDays);
  const sePotential = se.potentialStoryPointsPerSprint;
  const qaPotential = qa.potentialStoryPointsPerSprint;
  const unavailable = sePotential === null || qaPotential === null;
  const limitingRole = unavailable ? 'Unavailable'
    : sePotential === 0 && qaPotential === 0 ? 'No delivery capacity'
    : Math.abs(sePotential - qaPotential) <= 1e-9 ? 'Balanced'
    : sePotential < qaPotential ? 'SE' : 'QA';
  return {
    historicalDeliveredStoryPoints: historical.deliveredStoryPoints,
    se, qa,
    limitingRole,
    realisticStoryPointsPerSprint: unavailable ? null : Math.min(sePotential, qaPotential),
  };
}
