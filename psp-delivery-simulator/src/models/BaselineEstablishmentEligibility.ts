import type { DraftBaselineConfig } from './DraftBaselineConfig';
import type { DraftBaselineFormInput } from './DraftBaselineInput';
import { parseDraftBaselineFormInput } from './DraftBaselineInput';
import type { HistoricalData } from './HistoricalData';
import type { DraftHistoricalFormInput } from './DraftHistoricalInput';
import { parseDraftHistoricalFormInput } from './DraftHistoricalInput';
import type { TeamMember } from './TeamMember';
import type { DraftSprintMemberForm } from './DraftSprintCapacityInput';
import { parseDraftSprintCapacityForm } from './DraftSprintCapacityInput';

/** Do not silently snapshot old committed values while the user has unapplied edits. */
export function getBaselineEstablishmentEligibility(
  releaseForm: DraftBaselineFormInput,
  release: DraftBaselineConfig,
  historicalForm: DraftHistoricalFormInput,
  historical: HistoricalData,
  memberForm: readonly DraftSprintMemberForm[],
  members: readonly TeamMember[],
): { allowed: boolean; reason: string | null } {
  const enteredRelease = parseDraftBaselineFormInput(releaseForm).config;
  if (!enteredRelease) return { allowed: false, reason: 'Correct invalid release inputs before establishing BL.' };
  if (enteredRelease.releaseName !== release.releaseName || enteredRelease.scopeStoryPoints !== release.scopeStoryPoints || enteredRelease.variationPercent !== release.variationPercent) {
    return { allowed: false, reason: 'Apply pending release changes (leave the field or press Enter) first.' };
  }
  const enteredHistory = parseDraftHistoricalFormInput(historicalForm).historical;
  if (!enteredHistory) return { allowed: false, reason: 'Correct invalid historical inputs before establishing BL.' };
  if (enteredHistory.deliveredStoryPoints !== historical.deliveredStoryPoints || enteredHistory.seEffectiveDays !== historical.seEffectiveDays || enteredHistory.qaEffectiveDays !== historical.qaEffectiveDays) {
    return { allowed: false, reason: 'Apply pending historical changes first.' };
  }
  const enteredMembers = parseDraftSprintCapacityForm(memberForm).members;
  if (!enteredMembers) return { allowed: false, reason: 'Correct invalid future capacity inputs before establishing BL.' };
  if (enteredMembers.length !== members.length || enteredMembers.some((m, i) =>
    m.id !== members[i].id || m.name !== members[i].name || m.role !== members[i].role ||
    m.availableDays !== members[i].availableDays || m.productivity !== members[i].productivity)) {
    return { allowed: false, reason: 'Apply pending future capacity changes first.' };
  }
  return { allowed: true, reason: null };
}
