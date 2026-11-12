import type { TeamMember, TeamCapacity } from '../models/TeamMember';
import type { HistoricalProductivity } from '../models/HistoricalData';
import type { DeliveryCapacity } from '../models/DeliveryCapacity';

export function calculateTeamCapacity(members: TeamMember[]): TeamCapacity {
  const ids = new Set<string>();
  const calculated = members.map((member) => {
    if (ids.has(member.id)) throw new Error(`Duplicate team member ID: ${member.id}`);
    ids.add(member.id);
    if (member.role !== 'SE' && member.role !== 'QA') throw new Error('Unknown role.');
    if (!Number.isFinite(member.availableDays) || member.availableDays < 0) throw new Error('Available days cannot be negative.');
    if (!Number.isFinite(member.productivity) || member.productivity < 0 || member.productivity > 1) {
      throw new Error('Productivity must be between 0 and 1.');
    }
    return { ...member, effectiveDays: member.availableDays * member.productivity };
  });
  const sum = (role: 'SE' | 'QA', key: 'availableDays' | 'effectiveDays') =>
    calculated.filter((member) => member.role === role).reduce((total, member) => total + member[key], 0);
  const seEffectiveDays = sum('SE', 'effectiveDays');
  const qaEffectiveDays = sum('QA', 'effectiveDays');
  return {
    members: calculated,
    seAvailableDays: sum('SE', 'availableDays'),
    qaAvailableDays: sum('QA', 'availableDays'),
    seEffectiveDays,
    qaEffectiveDays,
    seToQaEffectiveDayRatio: qaEffectiveDays > 0 ? seEffectiveDays / qaEffectiveDays : Infinity,
  };
}

/**
 * Release-level capacity model. No sprint sequencing or handoff assumptions.
 * Each role can process its historical SP/effective-day rate; shipped scope is
 * limited by whichever capacity is smallest. This is a planning *capacity*
 * estimate, not a probabilistic delivery guarantee.
 */
export function calculateDeliveryCapacity(
  scopeStoryPoints: number,
  productivity: HistoricalProductivity,
  team: TeamCapacity,
): DeliveryCapacity {
  if (!Number.isFinite(scopeStoryPoints) || scopeStoryPoints < 0) throw new Error('Scope cannot be negative.');
  const se = team.seEffectiveDays * productivity.seStoryPointsPerEffectiveDay;
  const qa = team.qaEffectiveDays * productivity.qaStoryPointsPerEffectiveDay;
  const min = Math.min(scopeStoryPoints, se, qa);
  const constrainedBy: DeliveryCapacity['constrainedBy'] =
    scopeStoryPoints <= se && scopeStoryPoints <= qa ? 'Scope' :
    Math.abs(se - qa) < 1e-9 ? 'SE and QA' :
    se < qa ? 'SE' : 'QA';
  return {
    seCodingCapacityStoryPoints: se,
    qaTestingCapacityStoryPoints: qa,
    deliverableStoryPoints: min,
    scopeStoryPoints,
    constrainedBy,
  };
}
