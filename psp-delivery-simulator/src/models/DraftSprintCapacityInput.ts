import type { TeamMember } from './TeamMember';

/** Editable per-sprint staffing assumptions; NOT historical effective-day totals. */
export interface DraftSprintMemberForm {
  id: string;
  name: string;
  role: 'SE' | 'QA';
  availableDaysText: string;
  /** User-facing percentage (e.g. "80"), NOT the TeamMember decimal (0.8). */
  productivityPercentText: string;
}

export interface DraftSprintCapacityErrors {
  form?: string;
  members: Record<string, Partial<Record<'id' | 'name' | 'role' | 'availableDaysText' | 'productivityPercentText', string>>>;
}

/** For 4.3.1, default team is the same per-sprint example as in 3.4–4.2. */
export const DEFAULT_SPRINT_CAPACITY_MEMBERS: readonly TeamMember[] = [
  { id: 'baseline-se', name: 'SE capacity', role: 'SE', availableDays: 10, productivity: 1 },
  { id: 'baseline-qa', name: 'QA capacity', role: 'QA', availableDays: 5, productivity: 1 },
];

export function createDraftSprintCapacityForm(members: readonly TeamMember[]): DraftSprintMemberForm[] {
  return members.map((member) => ({
    id: member.id,
    name: member.name,
    role: member.role,
    availableDaysText: String(member.availableDays),
    productivityPercentText: String(member.productivity * 100),
  }));
}

/** Pure conversion: invalid/incomplete form entries never reach forecasting. */
export function parseDraftSprintCapacityForm(members: readonly DraftSprintMemberForm[]): {
  members: TeamMember[] | null;
  errors: DraftSprintCapacityErrors;
} {
  const errors: DraftSprintCapacityErrors = { members: {} };
  if (members.length === 0) errors.form = 'At least one team member is required.';
  const seenIds = new Set<string>();
  const parsed: TeamMember[] = [];
  for (const [index, member] of members.entries()) {
    const key = String(index);
    const itemErrors: DraftSprintCapacityErrors['members'][string] = {};
    const id = typeof member.id === 'string' ? member.id.trim() : '';
    const name = typeof member.name === 'string' ? member.name.trim() : '';
    if (!id) itemErrors.id = 'Member ID is required.';
    else if (seenIds.has(id)) itemErrors.id = 'Member IDs must be unique.';
    if (id) seenIds.add(id);
    if (!name) itemErrors.name = 'Member name is required.';
    if (member.role !== 'SE' && member.role !== 'QA') itemErrors.role = 'Role must be SE or QA.';

    const parseNumber = (value: string): number | null => {
      if (typeof value !== 'string' || value.trim() === '') return null;
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    };
    const days = parseNumber(member.availableDaysText);
    const percentage = parseNumber(member.productivityPercentText);
    if (days === null || days < 0) itemErrors.availableDaysText = 'Available days must be zero or greater.';
    if (percentage === null || percentage < 0 || percentage > 100) {
      itemErrors.productivityPercentText = 'Productivity must be between 0% and 100%.';
    }
    if (Object.keys(itemErrors).length > 0) errors.members[key] = itemErrors;
    else {
      parsed.push({ id, name, role: member.role, availableDays: days!, productivity: percentage! / 100 });
    }
  }
  return { members: errors.form || Object.keys(errors.members).length ? null : parsed, errors };
}
