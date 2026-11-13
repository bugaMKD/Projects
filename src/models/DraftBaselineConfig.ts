/** Editable draft BL inputs; no established baseline is created in Iteration 4.1. */
export interface DraftBaselineConfig {
  releaseName: string;
  scopeStoryPoints: number;
  /** Percentage, e.g. 15 means optimistic +15% and pessimistic -15%. */
  variationPercent: number;
}

/** Matches the 4.1 UI slider while keeping every scenario throughput non-negative. */
export const DRAFT_VARIATION_MIN = 0;
export const DRAFT_VARIATION_MAX = 30;
export const DEFAULT_VARIATION_PERCENT = 15;

export type DraftBaselineField = keyof DraftBaselineConfig;
export type DraftBaselineErrors = Partial<Record<DraftBaselineField, string>>;

/**
 * Start a NEW draft from the existing release mock, without changing mock data.
 * Actual sprint history is intentionally NOT part of draft configuration.
 */
export function createDraftBaselineConfig(
  release: { name: string; scopeStoryPoints: number },
  variationPercent = DEFAULT_VARIATION_PERCENT,
): DraftBaselineConfig {
  return {
    releaseName: release.name,
    scopeStoryPoints: release.scopeStoryPoints,
    variationPercent,
  };
}

/** No coercion, rounding or mutation. Invalid UI edits are rejected before forecasting. */
export function validateDraftBaselineConfig(config: DraftBaselineConfig): DraftBaselineErrors {
  const errors: DraftBaselineErrors = {};
  if (typeof config.releaseName !== 'string' || config.releaseName.trim().length === 0) {
    errors.releaseName = 'Release name is required.';
  }
  if (!Number.isFinite(config.scopeStoryPoints) || config.scopeStoryPoints <= 0) {
    errors.scopeStoryPoints = 'Release scope must be greater than zero.';
  }
  if (!Number.isFinite(config.variationPercent) ||
    config.variationPercent < DRAFT_VARIATION_MIN || config.variationPercent > DRAFT_VARIATION_MAX) {
    errors.variationPercent = `Variation must be between ${DRAFT_VARIATION_MIN}% and ${DRAFT_VARIATION_MAX}%.`;
  }
  return errors;
}

export function isValidDraftBaselineConfig(config: DraftBaselineConfig): boolean {
  return Object.keys(validateDraftBaselineConfig(config)).length === 0;
}
