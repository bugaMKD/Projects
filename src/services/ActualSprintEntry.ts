/** A completed sprint is an incremental SP amount, not a cumulative total. */
export function parseCompletedSprintPoints(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Appends only the next sprint; existing history is never modified. */
export function appendCompletedSprint(
  existing: readonly number[],
  text: string,
): number[] {
  const next = parseCompletedSprintPoints(text);
  if (next === null) throw new Error('Enter a valid non-negative completed SP value.');
  if (existing.some(value => !Number.isFinite(value) || value < 0)) {
    throw new Error('Saved actual history is invalid.');
  }
  return [...existing, next];
}
