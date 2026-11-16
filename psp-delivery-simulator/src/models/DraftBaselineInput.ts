import type { DraftBaselineConfig } from './DraftBaselineConfig';
import { DRAFT_VARIATION_MAX, DRAFT_VARIATION_MIN } from './DraftBaselineConfig';

/** Keep editable form text separate from validated numeric forecasting inputs. */
export interface DraftBaselineFormInput {
  releaseName: string;
  scopeText: string;
  variationPercent: number;
}

export type DraftBaselineFormErrors = Partial<Record<keyof DraftBaselineFormInput, string>>;

export function createDraftBaselineFormInput(config: DraftBaselineConfig): DraftBaselineFormInput {
  return {
    releaseName: config.releaseName,
    scopeText: String(config.scopeStoryPoints),
    variationPercent: config.variationPercent,
  };
}

/** Empty, whitespace-only, Infinity and other invalid numbers cannot reach the engine. */
export function parseDraftBaselineFormInput(input: DraftBaselineFormInput): {
  config: DraftBaselineConfig | null;
  errors: DraftBaselineFormErrors;
} {
  const errors: DraftBaselineFormErrors = {};
  if (!input.releaseName.trim()) errors.releaseName = 'Release name is required.';

  const numericScope = input.scopeText.trim() === '' ? NaN : Number(input.scopeText);
  if (!Number.isFinite(numericScope) || numericScope <= 0) {
    errors.scopeText = 'Release scope must be greater than zero.';
  }
  if (!Number.isFinite(input.variationPercent) || input.variationPercent < DRAFT_VARIATION_MIN || input.variationPercent > DRAFT_VARIATION_MAX) {
    errors.variationPercent = `Variation must be between ${DRAFT_VARIATION_MIN}% and ${DRAFT_VARIATION_MAX}%.`;
  }

  return {
    config: Object.keys(errors).length ? null : {
      releaseName: input.releaseName,
      scopeStoryPoints: numericScope,
      variationPercent: input.variationPercent,
    },
    errors,
  };
}
