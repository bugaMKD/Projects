import type { TeamMember } from './TeamMember';
import {
  parseDraftSprintCapacityForm,
  type DraftSprintMemberForm,
  type DraftSprintCapacityErrors,
} from './DraftSprintCapacityInput';

/** Applies a whole valid draft; otherwise leaves the last committed team intact. */
export function commitDraftSprintCapacityForm(
  form: readonly DraftSprintMemberForm[],
  previous: readonly TeamMember[],
): { applied: boolean; members: TeamMember[]; errors: DraftSprintCapacityErrors } {
  const parsed = parseDraftSprintCapacityForm(form);
  return {
    applied: parsed.members !== null,
    members: parsed.members ?? previous.map(member => ({ ...member })),
    errors: parsed.errors,
  };
}

/** Stable unique ID without needing a counter or depending on array position. */
export function addDraftSprintMember(
  form: readonly DraftSprintMemberForm[],
  role: 'SE' | 'QA',
): DraftSprintMemberForm[] {
  const existing = new Set(form.map(member => member.id));
  let index = 1;
  while (existing.has(`draft-${role.toLowerCase()}-${index}`)) index++;
  return [...form, {
    id: `draft-${role.toLowerCase()}-${index}`,
    name: `${role} ${index}`,
    role,
    availableDaysText: '0',
    productivityPercentText: '100',
  }];
}

/** Preserves all other fields; the caller commits on blur / Enter. */
export function removeDraftSprintMember(
  form: readonly DraftSprintMemberForm[],
  id: string,
): DraftSprintMemberForm[] {
  return form.filter(member => member.id !== id).map(member => ({ ...member }));
}
