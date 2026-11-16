export type TeamRole = 'SE' | 'QA';
export interface TeamMember {
  id: string;
  name: string;
  role: TeamRole;
  availableDays: number;
  /** A decimal fraction from 0 to 1 (e.g. 0.8 means 80%). */
  productivity: number;
}
export interface MemberCapacity extends TeamMember {
  effectiveDays: number;
}
export interface TeamCapacity {
  members: MemberCapacity[];
  seAvailableDays: number;
  qaAvailableDays: number;
  seEffectiveDays: number;
  qaEffectiveDays: number;
  seToQaEffectiveDayRatio: number;
}
