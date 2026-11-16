import { parseCompletedSprintPoints } from './ActualSprintEntry';

/** Replace exactly one saved sprint (0-based index); never change its order/count. */
export function previewSprintEdit(
  recorded: readonly number[],
  index: number,
  completedPointsText: string,
): number[] {
  if (!Number.isInteger(index) || index < 0 || index >= recorded.length) {
    throw new Error('Choose an existing completed sprint.');
  }
  if (recorded.some(value => !Number.isFinite(value) || value < 0)) {
    throw new Error('Saved actual history is invalid.');
  }
  const value = parseCompletedSprintPoints(completedPointsText);
  if (value === null) throw new Error('Enter a valid non-negative completed SP value.');
  const result = [...recorded];
  result[index] = value;
  return result;
}

/** Preview must represent only corrections to existing sprints, not added/removed sprints. */
export function validateSprintEditPreview(
  recorded: readonly number[],
  preview: readonly number[],
): number[] {
  if (preview.length !== recorded.length) {
    throw new Error('Corrections cannot add or remove completed sprints.');
  }
  if (recorded.some(v => !Number.isFinite(v) || v < 0) ||
      preview.some(v => !Number.isFinite(v) || v < 0)) {
    throw new Error('Completed SP values must be finite and non-negative.');
  }
  return [...preview];
}

export function hasSprintEditChanges(
  recorded: readonly number[], preview: readonly number[] | null,
): boolean {
  return preview !== null && (preview.length !== recorded.length ||
    preview.some((value, index) => value !== recorded[index]));
}
