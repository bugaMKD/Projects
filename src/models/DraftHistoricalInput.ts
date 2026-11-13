import type { HistoricalData } from './HistoricalData';

/**
 * Historical totals for a draft baseline. These values represent the entire
 * historical sample and are NEVER divided by its number of sprints.
 */
export interface DraftHistoricalFormInput {
  deliveredStoryPointsText: string;
  seEffectiveDaysText: string;
  qaEffectiveDaysText: string;
}

export type DraftHistoricalFormErrors = Partial<Record<keyof DraftHistoricalFormInput, string>>;

/** Start editable text fields from the fixed historical mock (4.2.1 only). */
export function createDraftHistoricalFormInput(historical: HistoricalData): DraftHistoricalFormInput {
  return {
    deliveredStoryPointsText: String(historical.deliveredStoryPoints),
    seEffectiveDaysText: String(historical.seEffectiveDays),
    qaEffectiveDaysText: String(historical.qaEffectiveDays),
  };
}

/**
 * No rounding and no mutation. Invalid intermediate typing cannot be committed
 * to the forecast calculation. All three historical totals must be positive.
 */
export function parseDraftHistoricalFormInput(input: DraftHistoricalFormInput): {
  historical: HistoricalData | null;
  errors: DraftHistoricalFormErrors;
} {
  const errors: DraftHistoricalFormErrors = {};
  const parsePositiveFinite = (value: string): number | null => {
    if (value.trim() === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  };

  const deliveredStoryPoints = parsePositiveFinite(input.deliveredStoryPointsText);
  const seEffectiveDays = parsePositiveFinite(input.seEffectiveDaysText);
  const qaEffectiveDays = parsePositiveFinite(input.qaEffectiveDaysText);

  if (deliveredStoryPoints === null) errors.deliveredStoryPointsText = 'Historical delivered SP must be greater than zero.';
  if (seEffectiveDays === null) errors.seEffectiveDaysText = 'Historical SE effective days must be greater than zero.';
  if (qaEffectiveDays === null) errors.qaEffectiveDaysText = 'Historical QA effective days must be greater than zero.';

  return {
    historical: Object.keys(errors).length === 0
      ? { deliveredStoryPoints: deliveredStoryPoints!, seEffectiveDays: seEffectiveDays!, qaEffectiveDays: qaEffectiveDays! }
      : null,
    errors,
  };
}
